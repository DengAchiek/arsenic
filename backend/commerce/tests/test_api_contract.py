from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from commerce.models import AuditLog, Category, Customer, Product
from commerce.services import create_pending_order


@override_settings(SECURE_SSL_REDIRECT=False)
class CommerceAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(
            public_id="cat_1",
            name="Batteries",
            slug="batteries",
            description="Storage for backup power.",
        )
        self.product = Product.objects.create(
            sku="bat-10k",
            name="Lithium Battery 10kWh",
            category=self.category,
            description="LiFePO4 storage for daily cycling.",
            price=Decimal("2450.00"),
            compare_at_price=Decimal("2750.00"),
            rating=Decimal("4.9"),
            review_count=88,
            image_url="assets/images/products/lifepo4-lithium-battery.png",
            inventory_quantity=10,
        )

    def test_backend_root_redirects_to_api_root_for_local_frontend(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/api/")

    @override_settings(
        FRONTEND_BASE_URL="https://arsenic-energies-web.onrender.com",
        ALLOWED_HOSTS=["arsenic-energies-api.onrender.com"],
    )
    def test_backend_root_redirects_to_configured_frontend_when_host_differs(self):
        response = self.client.get("/", HTTP_HOST="arsenic-energies-api.onrender.com")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "https://arsenic-energies-web.onrender.com")

    @override_settings(
        FRONTEND_BASE_URL="https://arsenic-web.onrender.com",
        ALLOWED_HOSTS=["arsenic-web.onrender.com"],
    )
    def test_backend_root_avoids_redirect_loop_when_frontend_matches_host(self):
        response = self.client.get("/", HTTP_HOST="arsenic-web.onrender.com")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/api/")

    def test_packaged_frontend_mode_serves_static_storefront(self):
        with TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "index.html").write_text("<h1>Storefront</h1>", encoding="utf-8")
            (root / "shop.html").write_text("<h1>Shop</h1>", encoding="utf-8")

            with self.settings(SERVE_FRONTEND=True, FRONTEND_BUILD_DIR=root):
                home = self.client.get("/")
                shop = self.client.get("/shop.html")
                api = self.client.get("/api/")

                self.assertEqual(home.status_code, 200)
                self.assertIn(b"Storefront", b"".join(home.streaming_content))
                self.assertEqual(shop.status_code, 200)
                self.assertIn(b"Shop", b"".join(shop.streaming_content))
                self.assertEqual(api.status_code, 200)
                self.assertIn("products", api.json())

    def test_health_endpoint_returns_ok(self):
        response = self.client.get("/healthz/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_catalog_matches_frontend_contract(self):
        response = self.client.get("/api/catalog/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["products"][0]["id"], "bat-10k")
        self.assertEqual(payload["products"][0]["oldPrice"], 2750.0)
        self.assertEqual(payload["products"][0]["img"], "assets/images/products/lifepo4-lithium-battery.png")
        self.assertEqual(payload["categories"][0]["slug"], "batteries")
        self.assertEqual(payload["categories"][0]["count"], 1)

    def test_register_creates_account_customer_and_token(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "full_name": "Amina Solar",
                "email": "amina@example.com",
                "phone": "+254700000000",
                "password": "S0lar-pass-2026",
                "marketing_consent": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertIn("token", payload)
        self.assertEqual(payload["user"]["email"], "amina@example.com")
        customer = Customer.objects.get(email="amina@example.com")
        self.assertEqual(customer.full_name, "Amina Solar")
        self.assertEqual(customer.user.email, "amina@example.com")

    def test_login_and_me_return_authenticated_user(self):
        user = get_user_model().objects.create_user(
            username="grace@example.com",
            email="grace@example.com",
            password="S0lar-pass-2026",
            first_name="Grace",
            last_name="W",
        )
        Customer.objects.create(user=user, email="grace@example.com", full_name="Grace W")

        login = self.client.post(
            "/api/auth/login/",
            {"email": "grace@example.com", "password": "S0lar-pass-2026"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)

        token = login.json()["token"]
        self.client.credentials(HTTP_AUTHORIZATION="Token %s" % token)
        me = self.client.get("/api/auth/me/")

        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["email"], "grace@example.com")
        self.assertEqual(me.json()["name"], "Grace W")

    def test_staff_login_exposes_admin_flag(self):
        get_user_model().objects.create_user(
            username="admin@example.com",
            email="admin@example.com",
            password="Admin-pass-2026",
            is_staff=True,
        )

        response = self.client.post(
            "/api/auth/login/",
            {"email": "admin@example.com", "password": "Admin-pass-2026"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["user"]["is_staff"])

    def test_checkout_requires_authenticated_account(self):
        response = self.client.post(
            "/api/checkout/session/",
            {"items": [{"id": "bat-10k", "qty": 1}]},
            format="json",
        )

        self.assertIn(response.status_code, (401, 403))

    @override_settings(ALLOW_MOCK_CHECKOUT=True, STRIPE_SECRET_KEY="")
    def test_authenticated_checkout_can_use_local_mock_without_stripe_key(self):
        user = get_user_model().objects.create_user(
            username="mock@example.com",
            email="mock@example.com",
            password="S0lar-pass-2026",
        )
        self.client.force_authenticate(user=user)

        response = self.client.post(
            "/api/checkout/session/",
            {
                "items": [{"id": "bat-10k", "qty": 1}],
                "success_url": "http://127.0.0.1:8000/checkout-success.html",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("mock_checkout=1", response.json()["checkout_url"])

    def test_inquiry_creates_customer_and_notifies_sales(self):
        with override_settings(
            EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
            SALES_TEAM_EMAILS=["sales@example.com"],
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    "/api/inquiries/",
                    {
                        "source": "contact",
                        "name": "Amina Solar",
                        "email": "Amina@example.com",
                        "subject": "Home backup system",
                        "message": "I need help sizing a battery system.",
                        "product_id": "bat-10k",
                    },
                    format="json",
                )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Customer.objects.filter(email="amina@example.com").exists())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Home backup system", mail.outbox[0].subject)

    def test_create_pending_order_uses_database_prices(self):
        order = create_pending_order(
            {
                "items": [{"id": "bat-10k", "qty": 2}],
                "customer": {"name": "Grace W", "email": "grace@example.com"},
            }
        )

        self.assertEqual(order.subtotal, Decimal("4900.00"))
        self.assertEqual(order.total, Decimal("4900.00"))
        self.assertEqual(order.items.first().unit_price, Decimal("2450.00"))

    def test_customer_order_list_only_returns_their_orders(self):
        user_one = get_user_model().objects.create_user(
            username="one@example.com",
            email="one@example.com",
            password="S0lar-pass-2026",
        )
        user_two = get_user_model().objects.create_user(
            username="two@example.com",
            email="two@example.com",
            password="S0lar-pass-2026",
        )
        order_one = create_pending_order({"items": [{"id": "bat-10k", "qty": 1}]}, user=user_one)
        create_pending_order({"items": [{"id": "bat-10k", "qty": 1}]}, user=user_two)
        token = Token.objects.create(user=user_one)

        self.client.credentials(HTTP_AUTHORIZATION="Token %s" % token.key)
        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], str(order_one.public_id))

    def test_customer_can_retrieve_order_tracking_and_details(self):
        owner = get_user_model().objects.create_user(
            username="track@example.com",
            email="track@example.com",
            password="S0lar-pass-2026",
        )
        other = get_user_model().objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="S0lar-pass-2026",
        )
        order = create_pending_order(
            {
                "items": [{"id": "bat-10k", "qty": 1}],
                "shipping_address": {"city": "Nairobi", "line1": "Solar House"},
                "notes": "Call before delivery.",
            },
            user=owner,
        )
        order.mark_paid(payment_intent_id="pi_test")
        owner_token = Token.objects.create(user=owner)
        other_token = Token.objects.create(user=other)

        self.client.credentials(HTTP_AUTHORIZATION="Token %s" % owner_token.key)
        response = self.client.get("/api/orders/%s/" % order.public_id)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], str(order.public_id))
        self.assertEqual(payload["status"], "processing")
        self.assertEqual(payload["status_label"], "Processing")
        self.assertEqual(payload["payment_status"], "paid")
        self.assertEqual(payload["payment_status_label"], "Paid")
        self.assertEqual(payload["items"][0]["name"], "Lithium Battery 10kWh")
        self.assertEqual(payload["items"][0]["product_snapshot"]["img"], "assets/images/products/lifepo4-lithium-battery.png")
        self.assertEqual(payload["shipping_address"]["city"], "Nairobi")
        self.assertEqual(payload["notes"], "Call before delivery.")
        self.assertEqual([step["key"] for step in payload["tracking_steps"]], ["received", "payment", "processing", "fulfilled"])
        self.assertTrue(payload["tracking_steps"][1]["complete"])

        self.client.credentials(HTTP_AUTHORIZATION="Token %s" % other_token.key)
        forbidden = self.client.get("/api/orders/%s/" % order.public_id)
        self.assertEqual(forbidden.status_code, 404)

    def test_out_of_stock_product_cannot_be_ordered(self):
        self.product.stock_status = Product.STOCK_OUT
        self.product.save(update_fields=["stock_status"])

        with self.assertRaises(Exception):
            create_pending_order(
                {
                    "items": [{"id": "bat-10k", "qty": 1}],
                    "customer": {"name": "Peter N", "email": "peter@example.com"},
                }
            )

    def test_staff_product_update_writes_json_safe_audit_log(self):
        staff = get_user_model().objects.create_user("admin", "admin@example.com", "password", is_staff=True)
        self.client.force_authenticate(user=staff)

        response = self.client.patch("/api/products/bat-10k/", {"price": "2499.00"}, format="json")

        self.assertEqual(response.status_code, 200)
        log = AuditLog.objects.get(entity="Product", entity_id="bat-10k")
        self.assertEqual(log.action, "update")
        self.assertEqual(log.after["price"], "2499.00")
