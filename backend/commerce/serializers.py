from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Count
from django.utils.text import slugify
from rest_framework import serializers

from .models import Category, Customer, Order, OrderItem, Product, SalesInquiry

User = get_user_model()


def split_full_name(full_name):
    parts = full_name.strip().split()
    if not parts:
        return "", ""
    first_name = parts[0]
    last_name = " ".join(parts[1:])
    return first_name, last_name


class CategorySerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="public_id", required=False)
    desc = serializers.CharField(source="description", required=False, allow_blank=True)
    img = serializers.CharField(source="image_url", required=False, allow_blank=True)
    count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "count", "desc", "img", "is_active", "display_order"]

    def create(self, validated_data):
        if not validated_data.get("public_id"):
            validated_data["public_id"] = "cat-%s" % slugify(validated_data["name"])
        return super().create(validated_data)

    def get_count(self, obj):
        if hasattr(obj, "product_count"):
            return obj.product_count
        return obj.products.count()


class ProductSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="sku", required=False)
    category = serializers.CharField(source="category.name", read_only=True)
    slug = serializers.CharField(source="category.slug", read_only=True)
    category_slug = serializers.CharField(write_only=True, required=False)
    oldPrice = serializers.DecimalField(
        source="compare_at_price",
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    img = serializers.CharField(source="image_url", required=False, allow_blank=True)
    img2 = serializers.CharField(source="alt_image_url", required=False, allow_blank=True)
    desc = serializers.CharField(source="description", required=False, allow_blank=True)
    reviews = serializers.IntegerField(source="review_count", required=False)
    badgeType = serializers.CharField(source="badge_type", required=False, allow_blank=True)
    stock = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "category",
            "category_slug",
            "slug",
            "price",
            "oldPrice",
            "currency",
            "rating",
            "reviews",
            "badge",
            "badgeType",
            "img",
            "img2",
            "desc",
            "specs",
            "stock",
            "stock_status",
            "inventory_quantity",
            "stripe_price_id",
            "is_published",
            "createdAt",
            "updatedAt",
        ]

    def get_stock(self, obj):
        return obj.is_in_stock

    def _resolve_category(self):
        incoming = self.initial_data
        category_slug = incoming.get("category_slug") or incoming.get("slug")
        category_name = incoming.get("category")
        qs = Category.objects.all()
        if category_slug:
            try:
                return qs.get(slug=category_slug)
            except Category.DoesNotExist as exc:
                raise serializers.ValidationError({"category_slug": "Category does not exist."}) from exc
        if category_name:
            try:
                return qs.get(name__iexact=category_name)
            except Category.DoesNotExist as exc:
                raise serializers.ValidationError({"category": "Category does not exist."}) from exc
        if self.instance:
            return self.instance.category
        raise serializers.ValidationError({"category_slug": "A category is required."})

    def create(self, validated_data):
        validated_data["category"] = self._resolve_category()
        if not validated_data.get("sku"):
            validated_data["sku"] = slugify(validated_data["name"])
        product = super().create(validated_data)
        self._apply_stock(product)
        return product

    def update(self, instance, validated_data):
        if any(key in self.initial_data for key in ("category_slug", "slug", "category")):
            validated_data["category"] = self._resolve_category()
        product = super().update(instance, validated_data)
        self._apply_stock(product)
        return product

    def _apply_stock(self, product):
        if "stock" not in self.initial_data:
            return
        raw_stock = self.initial_data.get("stock")
        has_stock = raw_stock if isinstance(raw_stock, bool) else str(raw_stock).lower() in {"1", "true", "yes", "on"}
        product.stock_status = Product.STOCK_IN if has_stock else Product.STOCK_OUT
        if has_stock and product.inventory_quantity == 0:
            product.inventory_quantity = 1
        product.save(update_fields=["stock_status", "inventory_quantity", "updated_at"])


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["email", "full_name", "phone", "company", "marketing_consent"]


class AccountSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    company = serializers.SerializerMethodField()
    marketing_consent = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "name", "first_name", "last_name", "phone", "company", "marketing_consent", "is_staff"]
        read_only_fields = ["id", "email", "is_staff"]

    def _customer(self, obj):
        if hasattr(obj, "customer_profile"):
            return obj.customer_profile
        return Customer.objects.filter(email=obj.email).first()

    def get_name(self, obj):
        return obj.get_full_name() or obj.email

    def get_phone(self, obj):
        customer = self._customer(obj)
        return customer.phone if customer else ""

    def get_company(self, obj):
        customer = self._customer(obj)
        return customer.company if customer else ""

    def get_marketing_consent(self, obj):
        customer = self._customer(obj)
        return customer.marketing_consent if customer else False


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=160)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)
    company = serializers.CharField(max_length=160, required=False, allow_blank=True)
    marketing_consent = serializers.BooleanField(required=False, default=False)
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(username__iexact=email).exists() or User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        first_name, last_name = split_full_name(validated_data["full_name"])
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=first_name,
            last_name=last_name,
        )
        Customer.objects.update_or_create(
            email=validated_data["email"],
            defaults={
                "user": user,
                "full_name": validated_data["full_name"],
                "phone": validated_data.get("phone", ""),
                "company": validated_data.get("company", ""),
                "marketing_consent": validated_data.get("marketing_consent", False),
            },
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs["email"].lower().strip()
        user = authenticate(username=email, password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")
        attrs["user"] = user
        return attrs


class AccountUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=160, required=False)
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)
    company = serializers.CharField(max_length=160, required=False, allow_blank=True)
    marketing_consent = serializers.BooleanField(required=False)

    def update(self, instance, validated_data):
        customer, _ = Customer.objects.get_or_create(
            email=instance.email.lower().strip(),
            defaults={
                "user": instance,
                "full_name": instance.get_full_name() or instance.email,
            },
        )
        if customer.user_id is None:
            customer.user = instance

        if "full_name" in validated_data:
            first_name, last_name = split_full_name(validated_data["full_name"])
            instance.first_name = first_name
            instance.last_name = last_name
            customer.full_name = validated_data["full_name"]
        for field in ("phone", "company", "marketing_consent"):
            if field in validated_data:
                setattr(customer, field, validated_data[field])

        instance.save()
        customer.save()
        return instance


class OrderItemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="product_sku", read_only=True)
    name = serializers.CharField(source="product_name", read_only=True)
    total = serializers.DecimalField(source="line_total", max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "name", "quantity", "unit_price", "total", "product_snapshot"]


class OrderSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    customer = CustomerSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_label = serializers.CharField(source="get_payment_status_display", read_only=True)
    tracking_steps = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "customer",
            "items",
            "status",
            "status_label",
            "payment_status",
            "payment_status_label",
            "tracking_steps",
            "currency",
            "subtotal",
            "tax_total",
            "shipping_total",
            "total",
            "stripe_checkout_session_id",
            "stripe_payment_intent_id",
            "shipping_address",
            "billing_address",
            "notes",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = ["stripe_checkout_session_id", "stripe_payment_intent_id", "subtotal", "total"]

    def get_tracking_steps(self, obj):
        def stamp(value):
            return value.isoformat() if value else None

        current_index = {
            Order.STATUS_PENDING: 0,
            Order.STATUS_PROCESSING: 2,
            Order.STATUS_FULFILLED: 3,
            Order.STATUS_CANCELLED: 1,
            Order.STATUS_REFUNDED: 1,
        }.get(obj.status, 0)
        payment_complete = obj.payment_status == Order.PAYMENT_PAID
        steps = [
            {
                "key": "received",
                "label": "Order received",
                "complete": True,
                "active": obj.status == Order.STATUS_PENDING and not payment_complete,
                "timestamp": stamp(obj.created_at),
            },
            {
                "key": "payment",
                "label": "Payment confirmed" if payment_complete else "Payment pending",
                "complete": payment_complete,
                "active": obj.status == Order.STATUS_PENDING and payment_complete,
                "timestamp": stamp(obj.updated_at if payment_complete else None),
            },
            {
                "key": "processing",
                "label": "Preparing delivery",
                "complete": current_index >= 2 and obj.status != Order.STATUS_CANCELLED,
                "active": obj.status == Order.STATUS_PROCESSING,
                "timestamp": stamp(obj.updated_at if current_index >= 2 else None),
            },
            {
                "key": "fulfilled",
                "label": "Delivered / fulfilled",
                "complete": obj.status == Order.STATUS_FULFILLED,
                "active": obj.status == Order.STATUS_FULFILLED,
                "timestamp": stamp(obj.updated_at if obj.status == Order.STATUS_FULFILLED else None),
            },
        ]
        if obj.status in {Order.STATUS_CANCELLED, Order.STATUS_REFUNDED}:
            steps.append(
                {
                    "key": obj.status,
                    "label": obj.get_status_display(),
                    "complete": True,
                    "active": True,
                    "timestamp": stamp(obj.updated_at),
                }
            )
        return steps


class CheckoutItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    qty = serializers.IntegerField(min_value=1, max_value=99)


class CheckoutCustomerSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=160)
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)
    company = serializers.CharField(max_length=160, required=False, allow_blank=True)
    marketing_consent = serializers.BooleanField(required=False, default=False)


class CheckoutSessionRequestSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True)
    customer = CheckoutCustomerSerializer(required=False)
    success_url = serializers.URLField(required=False)
    cancel_url = serializers.URLField(required=False)
    shipping_address = serializers.DictField(required=False)
    billing_address = serializers.DictField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class SalesInquirySerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    product_id = serializers.CharField(write_only=True, required=False, allow_blank=True)
    product = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = SalesInquiry
        fields = [
            "id",
            "source",
            "status",
            "name",
            "email",
            "phone",
            "company",
            "subject",
            "message",
            "product_id",
            "product",
            "metadata",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = ["status"]

    def get_product(self, obj):
        if not obj.product:
            return None
        return {"id": obj.product.sku, "name": obj.product.name}

    def validate_product_id(self, value):
        if not value:
            return ""
        if not Product.objects.filter(sku=value).exists():
            raise serializers.ValidationError("Product does not exist.")
        return value

    def create(self, validated_data):
        product_id = validated_data.pop("product_id", "")
        if product_id:
            validated_data["product"] = Product.objects.get(sku=product_id)
        customer, _ = Customer.objects.get_or_create(
            email=validated_data["email"].lower().strip(),
            defaults={
                "full_name": validated_data["name"],
                "phone": validated_data.get("phone", ""),
                "company": validated_data.get("company", ""),
            },
        )
        validated_data["customer"] = customer
        return super().create(validated_data)


class CatalogSerializer(serializers.Serializer):
    products = ProductSerializer(many=True)
    categories = CategorySerializer(many=True)
    orders = serializers.ListField(default=list)
    profile = serializers.DictField(allow_null=True, default=None)

    @staticmethod
    def snapshot():
        categories = Category.objects.filter(is_active=True).annotate(product_count=Count("products"))
        products = Product.objects.select_related("category").filter(is_published=True, category__is_active=True)
        return {
            "products": ProductSerializer(products, many=True).data,
            "categories": CategorySerializer(categories, many=True).data,
            "orders": [],
            "profile": None,
        }
