import uuid
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(TimestampedModel):
    public_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=600, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Product(TimestampedModel):
    STOCK_IN = "in_stock"
    STOCK_OUT = "out_of_stock"
    STOCK_PREORDER = "preorder"
    STOCK_CHOICES = [
        (STOCK_IN, "In stock"),
        (STOCK_OUT, "Out of stock"),
        (STOCK_PREORDER, "Pre-order"),
    ]

    sku = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=180)
    product_slug = models.SlugField(max_length=220, unique=True, blank=True)
    category = models.ForeignKey(Category, related_name="products", on_delete=models.PROTECT)
    description = models.TextField()
    specs = models.JSONField(default=dict, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    compare_at_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0"))],
    )
    currency = models.CharField(max_length=3, default="USD")
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=Decimal("0.0"))
    review_count = models.PositiveIntegerField(default=0)
    badge = models.CharField(max_length=40, blank=True)
    badge_type = models.CharField(max_length=30, blank=True)
    image_url = models.CharField(max_length=700, blank=True)
    alt_image_url = models.CharField(max_length=700, blank=True)
    stock_status = models.CharField(max_length=20, choices=STOCK_CHOICES, default=STOCK_IN)
    inventory_quantity = models.PositiveIntegerField(default=0)
    stripe_price_id = models.CharField(max_length=120, blank=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["category__display_order", "name"]

    def save(self, *args, **kwargs):
        if not self.product_slug:
            base = slugify(self.name) or self.sku
            slug = base
            counter = 2
            while Product.objects.exclude(pk=self.pk).filter(product_slug=slug).exists():
                slug = "%s-%s" % (base, counter)
                counter += 1
            self.product_slug = slug
        super().save(*args, **kwargs)

    @property
    def is_in_stock(self):
        return self.stock_status in {self.STOCK_IN, self.STOCK_PREORDER} and self.is_published

    def __str__(self):
        return self.name


class Customer(TimestampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name="customer_profile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=40, blank=True)
    company = models.CharField(max_length=160, blank=True)
    marketing_consent = models.BooleanField(default=False)

    class Meta:
        ordering = ["email"]

    def save(self, *args, **kwargs):
        self.email = self.email.lower().strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return "%s <%s>" % (self.full_name, self.email)


class Order(TimestampedModel):
    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_FULFILLED = "fulfilled"
    STATUS_CANCELLED = "cancelled"
    STATUS_REFUNDED = "refunded"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_FULFILLED, "Fulfilled"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_REFUNDED, "Refunded"),
    ]

    PAYMENT_PENDING = "pending"
    PAYMENT_PAID = "paid"
    PAYMENT_FAILED = "failed"
    PAYMENT_REFUNDED = "refunded"
    PAYMENT_CHOICES = [
        (PAYMENT_PENDING, "Pending"),
        (PAYMENT_PAID, "Paid"),
        (PAYMENT_FAILED, "Failed"),
        (PAYMENT_REFUNDED, "Refunded"),
    ]

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    customer = models.ForeignKey(Customer, related_name="orders", on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default=PAYMENT_PENDING)
    currency = models.CharField(max_length=3, default="USD")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    shipping_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    stripe_checkout_session_id = models.CharField(max_length=200, blank=True, db_index=True)
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True)
    shipping_address = models.JSONField(default=dict, blank=True)
    billing_address = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def recalculate_totals(self):
        subtotal = sum((item.line_total for item in self.items.all()), Decimal("0.00"))
        self.subtotal = subtotal
        self.total = self.subtotal + self.tax_total + self.shipping_total
        return self.total

    def mark_paid(self, payment_intent_id=""):
        self.status = self.STATUS_PROCESSING
        self.payment_status = self.PAYMENT_PAID
        if payment_intent_id:
            self.stripe_payment_intent_id = payment_intent_id
        self.save(update_fields=["status", "payment_status", "stripe_payment_intent_id", "updated_at"])

    def __str__(self):
        return "Order %s" % self.public_id


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name="order_items", null=True, blank=True, on_delete=models.SET_NULL)
    product_sku = models.CharField(max_length=64)
    product_name = models.CharField(max_length=180)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    line_total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    product_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        self.line_total = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return "%s x %s" % (self.quantity, self.product_name)


class SalesInquiry(TimestampedModel):
    SOURCE_CONTACT = "contact"
    SOURCE_QUOTE = "quote"
    SOURCE_PRODUCT = "product"
    SOURCE_SUPPORT = "support"
    SOURCE_CHOICES = [
        (SOURCE_CONTACT, "Contact"),
        (SOURCE_QUOTE, "Quote"),
        (SOURCE_PRODUCT, "Product"),
        (SOURCE_SUPPORT, "Support"),
    ]

    STATUS_OPEN = "open"
    STATUS_ASSIGNED = "assigned"
    STATUS_CLOSED = "closed"
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_ASSIGNED, "Assigned"),
        (STATUS_CLOSED, "Closed"),
    ]

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_CONTACT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    customer = models.ForeignKey(Customer, related_name="inquiries", null=True, blank=True, on_delete=models.SET_NULL)
    product = models.ForeignKey(Product, related_name="inquiries", null=True, blank=True, on_delete=models.SET_NULL)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="assigned_inquiries",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    name = models.CharField(max_length=160)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    company = models.CharField(max_length=160, blank=True)
    subject = models.CharField(max_length=180)
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return "%s - %s" % (self.subject, self.email)


class PaymentEvent(TimestampedModel):
    stripe_event_id = models.CharField(max_length=200, unique=True)
    event_type = models.CharField(max_length=120)
    processed = models.BooleanField(default=False)
    payload = models.JSONField(default=dict)
    order = models.ForeignKey(Order, related_name="payment_events", null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.stripe_event_id


class AuditLog(models.Model):
    actor = models.ForeignKey(get_user_model(), null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=80)
    entity = models.CharField(max_length=120)
    entity_id = models.CharField(max_length=120, blank=True)
    before = models.JSONField(default=dict, blank=True)
    after = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return "%s %s" % (self.action, self.entity)
