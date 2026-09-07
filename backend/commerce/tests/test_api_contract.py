from decimal import Decimal

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

    def test_checkout_requires_authenticated_account(self):
        response = self.client.post(
            "/api/checkout/session/",
            {"items": [{"id": "bat-10k", "qty": 1}]},
            format="json",
        )

        self.assertIn(response.status_code, (401, 403))

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
