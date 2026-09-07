import decimal
import uuid

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("public_id", models.CharField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=120)),
                ("slug", models.SlugField(max_length=140, unique=True)),
                ("description", models.TextField(blank=True)),
                ("image_url", models.URLField(blank=True, max_length=600)),
                ("is_active", models.BooleanField(default=True)),
                ("display_order", models.PositiveIntegerField(default=0)),
            ],
            options={
                "verbose_name_plural": "categories",
                "ordering": ["display_order", "name"],
            },
        ),
        migrations.CreateModel(
            name="Customer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("full_name", models.CharField(max_length=160)),
                ("phone", models.CharField(blank=True, max_length=40)),
                ("company", models.CharField(blank=True, max_length=160)),
                ("marketing_consent", models.BooleanField(default=False)),
            ],
            options={
                "ordering": ["email"],
            },
        ),
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(max_length=80)),
                ("entity", models.CharField(max_length=120)),
                ("entity_id", models.CharField(blank=True, max_length=120)),
                ("before", models.JSONField(blank=True, default=dict)),
                ("after", models.JSONField(blank=True, default=dict)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "actor",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Order",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("processing", "Processing"),
                            ("fulfilled", "Fulfilled"),
                            ("cancelled", "Cancelled"),
                            ("refunded", "Refunded"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                (
                    "payment_status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("paid", "Paid"),
                            ("failed", "Failed"),
                            ("refunded", "Refunded"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("currency", models.CharField(default="USD", max_length=3)),
                ("subtotal", models.DecimalField(decimal_places=2, default=decimal.Decimal("0.00"), max_digits=12)),
                ("tax_total", models.DecimalField(decimal_places=2, default=decimal.Decimal("0.00"), max_digits=12)),
                ("shipping_total", models.DecimalField(decimal_places=2, default=decimal.Decimal("0.00"), max_digits=12)),
                ("total", models.DecimalField(decimal_places=2, default=decimal.Decimal("0.00"), max_digits=12)),
                ("stripe_checkout_session_id", models.CharField(blank=True, db_index=True, max_length=200)),
                ("stripe_payment_intent_id", models.CharField(blank=True, max_length=200)),
                ("shipping_address", models.JSONField(blank=True, default=dict)),
                ("billing_address", models.JSONField(blank=True, default=dict)),
                ("notes", models.TextField(blank=True)),
                ("customer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="orders", to="commerce.customer")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("sku", models.CharField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=180)),
                ("product_slug", models.SlugField(blank=True, max_length=220, unique=True)),
                ("description", models.TextField()),
                ("specs", models.JSONField(blank=True, default=dict)),
                (
                    "price",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(decimal.Decimal("0"))],
                    ),
                ),
                (
                    "compare_at_price",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                        validators=[django.core.validators.MinValueValidator(decimal.Decimal("0"))],
                    ),
                ),
                ("currency", models.CharField(default="USD", max_length=3)),
                ("rating", models.DecimalField(decimal_places=1, default=decimal.Decimal("0.0"), max_digits=3)),
                ("review_count", models.PositiveIntegerField(default=0)),
                ("badge", models.CharField(blank=True, max_length=40)),
                ("badge_type", models.CharField(blank=True, max_length=30)),
                ("image_url", models.CharField(blank=True, max_length=700)),
                ("alt_image_url", models.CharField(blank=True, max_length=700)),
                (
                    "stock_status",
                    models.CharField(
                        choices=[("in_stock", "In stock"), ("out_of_stock", "Out of stock"), ("preorder", "Pre-order")],
                        default="in_stock",
                        max_length=20,
                    ),
                ),
                ("inventory_quantity", models.PositiveIntegerField(default=0)),
                ("stripe_price_id", models.CharField(blank=True, max_length=120)),
                ("is_published", models.BooleanField(default=True)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="products", to="commerce.category")),
            ],
            options={
                "ordering": ["category__display_order", "name"],
            },
        ),
        migrations.CreateModel(
            name="PaymentEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("stripe_event_id", models.CharField(max_length=200, unique=True)),
                ("event_type", models.CharField(max_length=120)),
                ("processed", models.BooleanField(default=False)),
                ("payload", models.JSONField(default=dict)),
                (
                    "order",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="payment_events", to="commerce.order"),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="OrderItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("product_sku", models.CharField(max_length=64)),
                ("product_name", models.CharField(max_length=180)),
                ("quantity", models.PositiveIntegerField(default=1, validators=[django.core.validators.MinValueValidator(1)])),
                (
                    "unit_price",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(decimal.Decimal("0"))],
                    ),
                ),
                (
                    "line_total",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=12,
                        validators=[django.core.validators.MinValueValidator(decimal.Decimal("0"))],
                    ),
                ),
                ("product_snapshot", models.JSONField(blank=True, default=dict)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="commerce.order")),
                (
                    "product",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="order_items", to="commerce.product"),
                ),
            ],
            options={
                "ordering": ["id"],
            },
        ),
        migrations.CreateModel(
            name="SalesInquiry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                (
                    "source",
                    models.CharField(
                        choices=[("contact", "Contact"), ("quote", "Quote"), ("product", "Product"), ("support", "Support")],
                        default="contact",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(choices=[("open", "Open"), ("assigned", "Assigned"), ("closed", "Closed")], default="open", max_length=20),
                ),
                ("name", models.CharField(max_length=160)),
                ("email", models.EmailField(max_length=254)),
                ("phone", models.CharField(blank=True, max_length=40)),
                ("company", models.CharField(blank=True, max_length=160)),
                ("subject", models.CharField(max_length=180)),
                ("message", models.TextField()),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "assigned_to",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assigned_inquiries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="inquiries", to="commerce.customer"),
                ),
                (
                    "product",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="inquiries", to="commerce.product"),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
