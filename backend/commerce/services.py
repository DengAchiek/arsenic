from decimal import Decimal, ROUND_HALF_UP
from types import SimpleNamespace

import stripe
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.urls import reverse
from rest_framework import serializers

from .models import Customer, Order, OrderItem, PaymentEvent, Product


def cents(amount):
    return int((Decimal(amount) * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def absolute_frontend_url(path):
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if not path.startswith("/"):
        path = "/%s" % path
    return "%s%s" % (settings.FRONTEND_BASE_URL, path)


def public_image_url(image_url):
    if not image_url:
        return ""
    if image_url.startswith("http://") or image_url.startswith("https://"):
        return image_url
    if image_url.startswith("/"):
        return "%s%s" % (settings.FRONTEND_BASE_URL, image_url)
    return "%s/%s" % (settings.FRONTEND_BASE_URL, image_url)


def get_or_update_customer(customer_data=None, user=None):
    customer_data = customer_data or {}
    email = (customer_data.get("email") or getattr(user, "email", "") or getattr(user, "username", "")).lower().strip()
    if not email:
        raise serializers.ValidationError({"customer": "A customer email is required."})
    full_name = (
        customer_data.get("name")
        or customer_data.get("full_name")
        or (user.get_full_name() if user else "")
        or email
    ).strip()
    defaults = {
        "full_name": full_name,
        "phone": customer_data.get("phone", "").strip(),
        "company": customer_data.get("company", "").strip(),
        "marketing_consent": customer_data.get("marketing_consent", False),
    }
    if user and getattr(user, "is_authenticated", False):
        defaults["user"] = user
    customer, created = Customer.objects.get_or_create(email=email, defaults=defaults)
    if not created:
        for key, value in defaults.items():
            if key == "user" and customer.user_id and customer.user_id != user.id:
                continue
            if value not in ("", None):
                setattr(customer, key, value)
        customer.save()
    return customer


def product_snapshot(product):
    return {
        "id": product.sku,
        "name": product.name,
        "category": product.category.name,
        "price": str(product.price),
        "currency": product.currency,
        "img": product.image_url,
        "specs": product.specs,
    }


@transaction.atomic
def create_pending_order(validated_data, user=None):
    customer = get_or_update_customer(validated_data.get("customer"), user=user)
    items = validated_data["items"]
    products = {
        product.sku: product
        for product in Product.objects.select_related("category").filter(
            sku__in=[item["id"] for item in items],
            is_published=True,
            category__is_active=True,
        )
    }

    order = Order.objects.create(
        customer=customer,
        currency="USD",
        shipping_address=validated_data.get("shipping_address", {}),
        billing_address=validated_data.get("billing_address", {}),
        notes=validated_data.get("notes", ""),
    )

    for item in items:
        product = products.get(item["id"])
        if not product:
            raise serializers.ValidationError({"items": "Product %s is not available." % item["id"]})
        if not product.is_in_stock:
            raise serializers.ValidationError({"items": "%s is out of stock." % product.name})
        OrderItem.objects.create(
            order=order,
            product=product,
            product_sku=product.sku,
            product_name=product.name,
            quantity=item["qty"],
            unit_price=product.price,
            line_total=product.price * item["qty"],
            product_snapshot=product_snapshot(product),
        )

    order.recalculate_totals()
    order.save(update_fields=["subtotal", "total", "updated_at"])
    return order


def stripe_line_items(order):
    line_items = []
    for item in order.items.select_related("product", "product__category"):
        product = item.product
        image_url = public_image_url(product.image_url) if product else ""
        product_data = {
            "name": item.product_name,
            "metadata": {"sku": item.product_sku},
        }
        if image_url:
            product_data["images"] = [image_url]

        if product and product.stripe_price_id:
            line_items.append({"price": product.stripe_price_id, "quantity": item.quantity})
        else:
            line_items.append(
                {
                    "quantity": item.quantity,
                    "price_data": {
                        "currency": order.currency.lower(),
                        "unit_amount": cents(item.unit_price),
                        "product_data": product_data,
                    },
                }
            )
    return line_items


@transaction.atomic
def create_stripe_checkout_session(validated_data, user=None):
    if not settings.STRIPE_SECRET_KEY:
        if settings.ALLOW_MOCK_CHECKOUT:
            return create_mock_checkout_session(validated_data, user=user)
        raise serializers.ValidationError({"stripe": "STRIPE_SECRET_KEY is not configured."})

    stripe.api_key = settings.STRIPE_SECRET_KEY
    order = create_pending_order(validated_data, user=user)
    success_url = validated_data.get("success_url") or absolute_frontend_url(settings.ORDER_SUCCESS_PATH)
    cancel_url = validated_data.get("cancel_url") or absolute_frontend_url(settings.ORDER_CANCEL_PATH)

    session = stripe.checkout.Session.create(
        mode="payment",
        client_reference_id=str(order.public_id),
        customer_email=order.customer.email,
        line_items=stripe_line_items(order),
        success_url="%s?session_id={CHECKOUT_SESSION_ID}&order=%s" % (success_url, order.public_id),
        cancel_url=cancel_url,
        billing_address_collection="auto",
        shipping_address_collection={"allowed_countries": settings.STRIPE_ALLOWED_COUNTRIES},
        metadata={"order_id": str(order.public_id), "customer_email": order.customer.email},
    )
    order.stripe_checkout_session_id = session.id
    order.save(update_fields=["stripe_checkout_session_id", "updated_at"])
    return order, session


def create_mock_checkout_session(validated_data, user=None):
    order = create_pending_order(validated_data, user=user)
    session_id = "mock_%s" % order.public_id
    success_url = validated_data.get("success_url") or absolute_frontend_url(settings.ORDER_SUCCESS_PATH)
    separator = "&" if "?" in success_url else "?"
    order.stripe_checkout_session_id = session_id
    order.save(update_fields=["stripe_checkout_session_id", "updated_at"])
    order.mark_paid(payment_intent_id="mock_pi_%s" % order.public_id)
    decrement_inventory(order)
    return order, SimpleNamespace(
        id=session_id,
        url="%ssession_id=%s&order=%s&mock_checkout=1" % (success_url + separator, session_id, order.public_id),
    )


def send_order_confirmation(order):
    subject = "Arsenic Energies order %s" % order.public_id
    lines = [
        "Thank you for your order, %s." % order.customer.full_name,
        "",
        "Order: %s" % order.public_id,
        "Total: %s %s" % (order.currency, order.total),
        "",
        "Items:",
    ]
    for item in order.items.all():
        lines.append("- %s x %s: %s %s" % (item.quantity, item.product_name, order.currency, item.line_total))
    lines.extend(["", "A sales specialist will contact you with delivery and installation details."])
    send_mail(subject, "\n".join(lines), settings.DEFAULT_FROM_EMAIL, [order.customer.email], fail_silently=False)


def notify_sales_team(order):
    if not settings.SALES_TEAM_EMAILS:
        return
    subject = "New paid order: %s" % order.public_id
    admin_path = reverse("admin:commerce_order_change", args=[order.pk])
    body = "\n".join(
        [
            "A Stripe Checkout payment was completed.",
            "",
            "Order: %s" % order.public_id,
            "Customer: %s <%s>" % (order.customer.full_name, order.customer.email),
            "Phone: %s" % (order.customer.phone or "Not provided"),
            "Total: %s %s" % (order.currency, order.total),
            "Admin: %s%s" % (settings.BACKEND_BASE_URL, admin_path),
        ]
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, settings.SALES_TEAM_EMAILS, fail_silently=False)


def notify_sales_inquiry(inquiry):
    if not settings.SALES_TEAM_EMAILS:
        return
    subject = "Sales inquiry: %s" % inquiry.subject
    body = "\n".join(
        [
            "New inquiry from the website.",
            "",
            "Name: %s" % inquiry.name,
            "Email: %s" % inquiry.email,
            "Phone: %s" % (inquiry.phone or "Not provided"),
            "Company: %s" % (inquiry.company or "Not provided"),
            "Source: %s" % inquiry.source,
            "Product: %s" % (inquiry.product.name if inquiry.product else "Not provided"),
            "",
            inquiry.message,
        ]
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, settings.SALES_TEAM_EMAILS, fail_silently=False)


def decrement_inventory(order):
    for item in order.items.select_related("product"):
        product = item.product
        if not product or product.inventory_quantity == 0:
            continue
        product.inventory_quantity = max(0, product.inventory_quantity - item.quantity)
        if product.inventory_quantity == 0:
            product.stock_status = Product.STOCK_OUT
        product.save(update_fields=["inventory_quantity", "stock_status", "updated_at"])


@transaction.atomic
def handle_stripe_webhook(payload, signature):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise serializers.ValidationError({"stripe": "STRIPE_WEBHOOK_SECRET is not configured."})

    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        event = stripe.Webhook.construct_event(payload, signature, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as exc:
        raise serializers.ValidationError({"stripe": "Invalid Stripe webhook signature."}) from exc

    event_payload = event.to_dict_recursive() if hasattr(event, "to_dict_recursive") else dict(event)
    payment_event, created = PaymentEvent.objects.get_or_create(
        stripe_event_id=event["id"],
        defaults={"event_type": event["type"], "payload": event_payload},
    )
    if not created and payment_event.processed:
        return payment_event

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        order_id = session.get("metadata", {}).get("order_id")
        order = Order.objects.filter(public_id=order_id).first() if order_id else None
        if not order:
            order = Order.objects.filter(stripe_checkout_session_id=session.get("id")).first()
        if order:
            should_update_inventory = order.payment_status != Order.PAYMENT_PAID
            order.mark_paid(payment_intent_id=session.get("payment_intent") or "")
            if should_update_inventory:
                decrement_inventory(order)
            payment_event.order = order
            transaction.on_commit(lambda: send_order_confirmation(order))
            transaction.on_commit(lambda: notify_sales_team(order))

    if event["type"] == "checkout.session.expired":
        session = event["data"]["object"]
        order = Order.objects.filter(stripe_checkout_session_id=session.get("id")).first()
        if order and order.payment_status == Order.PAYMENT_PENDING:
            order.status = Order.STATUS_CANCELLED
            order.payment_status = Order.PAYMENT_FAILED
            order.save(update_fields=["status", "payment_status", "updated_at"])
            payment_event.order = order

    payment_event.processed = True
    payment_event.save(update_fields=["processed", "order", "updated_at"])
    return payment_event
