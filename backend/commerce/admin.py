from django.contrib import admin

from .models import AuditLog, Category, Customer, Order, OrderItem, PaymentEvent, Product, SalesInquiry


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "display_order", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "category", "price", "currency", "stock_status", "is_published", "updated_at")
    list_filter = ("category", "stock_status", "is_published")
    search_fields = ("name", "sku", "description")
    prepopulated_fields = {"product_slug": ("name",)}
    readonly_fields = ("created_at", "updated_at")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_sku", "product_name", "unit_price", "quantity", "line_total", "product_snapshot")
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("public_id", "customer", "status", "payment_status", "total", "currency", "created_at")
    list_filter = ("status", "payment_status", "currency")
    search_fields = ("public_id", "customer__email", "stripe_checkout_session_id", "stripe_payment_intent_id")
    readonly_fields = ("public_id", "subtotal", "total", "stripe_checkout_session_id", "stripe_payment_intent_id", "created_at", "updated_at")
    inlines = [OrderItemInline]


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("email", "full_name", "phone", "company", "marketing_consent", "created_at")
    search_fields = ("email", "full_name", "phone", "company")
    list_filter = ("marketing_consent",)


@admin.register(SalesInquiry)
class SalesInquiryAdmin(admin.ModelAdmin):
    list_display = ("subject", "email", "source", "status", "assigned_to", "created_at")
    list_filter = ("source", "status")
    search_fields = ("name", "email", "subject", "message")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(PaymentEvent)
class PaymentEventAdmin(admin.ModelAdmin):
    list_display = ("stripe_event_id", "event_type", "processed", "order", "created_at")
    list_filter = ("event_type", "processed")
    search_fields = ("stripe_event_id", "order__public_id")
    readonly_fields = ("payload", "created_at", "updated_at")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "entity", "entity_id", "actor", "ip_address", "created_at")
    list_filter = ("action", "entity")
    search_fields = ("entity", "entity_id", "actor__username")
    readonly_fields = ("actor", "action", "entity", "entity_id", "before", "after", "ip_address", "created_at")
