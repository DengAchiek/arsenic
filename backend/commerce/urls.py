from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CatalogAPIView,
    CategoryViewSet,
    CheckoutSessionAPIView,
    LoginAPIView,
    LogoutAPIView,
    MeAPIView,
    OrderViewSet,
    ProductViewSet,
    RegisterAPIView,
    SalesInquiryViewSet,
    StripeWebhookAPIView,
)

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("products", ProductViewSet, basename="product")
router.register("orders", OrderViewSet, basename="order")
router.register("inquiries", SalesInquiryViewSet, basename="inquiry")

urlpatterns = [
    path("auth/register/", RegisterAPIView.as_view(), name="auth-register"),
    path("auth/login/", LoginAPIView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth-logout"),
    path("auth/me/", MeAPIView.as_view(), name="auth-me"),
    path("catalog/", CatalogAPIView.as_view(), name="catalog"),
    path("checkout/session/", CheckoutSessionAPIView.as_view(), name="checkout-session"),
    path("payments/stripe/webhook/", StripeWebhookAPIView.as_view(), name="stripe-webhook"),
    path("", include(router.urls)),
]
