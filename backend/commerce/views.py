import json
import mimetypes
from pathlib import Path

from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.core.files.base import ContentFile
from django.core.serializers.json import DjangoJSONEncoder
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Count, Q
from django.utils.text import slugify
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView

from .models import AuditLog, Category, Order, Product, SalesInquiry
from .serializers import (
    AccountSerializer,
    AccountUpdateSerializer,
    CatalogSerializer,
    CategorySerializer,
    CheckoutSessionRequestSerializer,
    LoginSerializer,
    OrderSerializer,
    ProductSerializer,
    RegisterSerializer,
    SalesInquirySerializer,
)
from .services import create_stripe_checkout_session, handle_stripe_webhook, notify_sales_inquiry


def client_ip(request):
    forwarded = request.META.get("HTTP_CF_CONNECTING_IP") or request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def audit(request, action, instance, before=None, after=None):
    def clean(value):
        return json.loads(json.dumps(value or {}, cls=DjangoJSONEncoder))

    AuditLog.objects.create(
        actor=request.user if request.user.is_authenticated else None,
        action=action,
        entity=instance.__class__.__name__,
        entity_id=str(getattr(instance, "sku", getattr(instance, "public_id", instance.pk))),
        before=clean(before),
        after=clean(after),
        ip_address=client_ip(request) or None,
    )


class StaffWriteMixin:
    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [AllowAny()]
        return [IsAdminUser()]


class CatalogAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(CatalogSerializer.snapshot())


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        django_login(request, user)
        return Response({"token": token.key, "user": AccountSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        django_login(request, user)
        return Response({"token": token.key, "user": AccountSerializer(user).data})


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        django_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AccountSerializer(request.user).data)

    def patch(self, request):
        serializer = AccountUpdateSerializer(instance=request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AccountSerializer(user).data)


class CategoryViewSet(StaffWriteMixin, viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    lookup_field = "public_id"

    def get_queryset(self):
        queryset = Category.objects.annotate(product_count=Count("products"))
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save()
        audit(self.request, "create", instance, after=CategorySerializer(instance).data)

    def perform_update(self, serializer):
        before = CategorySerializer(serializer.instance).data
        instance = serializer.save()
        audit(self.request, "update", instance, before=before, after=CategorySerializer(instance).data)

    def perform_destroy(self, instance):
        before = CategorySerializer(instance).data
        audit(self.request, "delete", instance, before=before)
        instance.delete()


class ProductViewSet(StaffWriteMixin, viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    lookup_field = "sku"

    def get_throttles(self):
        if getattr(self, "action", "") == "upload_image":
            self.throttle_scope = "upload"
        return super().get_throttles()

    def get_queryset(self):
        queryset = Product.objects.select_related("category")
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_published=True, category__is_active=True)

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__slug=category)

        in_stock = self.request.query_params.get("in_stock")
        if in_stock in {"1", "true", "yes"}:
            queryset = queryset.exclude(stock_status=Product.STOCK_OUT)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(category__name__icontains=search)
                | Q(sku__icontains=search)
            )

        sort = self.request.query_params.get("sort")
        if sort == "price-asc":
            queryset = queryset.order_by("price", "name")
        elif sort == "price-desc":
            queryset = queryset.order_by("-price", "name")
        elif sort == "rating":
            queryset = queryset.order_by("-rating", "-review_count")

        return queryset

    def perform_create(self, serializer):
        instance = serializer.save()
        audit(self.request, "create", instance, after=ProductSerializer(instance).data)

    def perform_update(self, serializer):
        before = ProductSerializer(serializer.instance).data
        instance = serializer.save()
        audit(self.request, "update", instance, before=before, after=ProductSerializer(instance).data)

    def perform_destroy(self, instance):
        before = ProductSerializer(instance).data
        audit(self.request, "delete", instance, before=before)
        instance.delete()

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAdminUser],
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_image(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > 8 * 1024 * 1024:
            return Response({"detail": "Image must be 8MB or smaller."}, status=status.HTTP_400_BAD_REQUEST)

        content_type = upload.content_type or mimetypes.guess_type(upload.name)[0] or ""
        if not content_type.startswith("image/"):
            return Response({"detail": "Only image uploads are allowed."}, status=status.HTTP_400_BAD_REQUEST)

        suffix = Path(upload.name).suffix.lower()[:12]
        stem = slugify(Path(upload.name).stem) or "product"
        filename = "products/%s-%s%s" % (stem, now().strftime("%Y%m%d%H%M%S"), suffix)
        path = default_storage.save(filename, ContentFile(upload.read()))
        url = default_storage.url(path)
        if url.startswith("/"):
            url = request.build_absolute_uri(url)
        return Response({"url": url, "filename": Path(path).name, "size": upload.size, "type": content_type}, status=201)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    lookup_field = "public_id"

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get_queryset(self):
        queryset = Order.objects.select_related("customer").prefetch_related("items")
        if not self.request.user.is_staff:
            queryset = queryset.filter(customer__user=self.request.user)
        status_value = self.request.query_params.get("status")
        payment_status = self.request.query_params.get("payment_status")
        if status_value:
            queryset = queryset.filter(status=status_value)
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        return queryset

    def perform_update(self, serializer):
        before = OrderSerializer(serializer.instance).data
        instance = serializer.save()
        audit(self.request, "update", instance, before=before, after=OrderSerializer(instance).data)


class SalesInquiryViewSet(viewsets.ModelViewSet):
    serializer_class = SalesInquirySerializer
    lookup_field = "public_id"
    throttle_scope = "inquiry"

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAdminUser()]

    def get_queryset(self):
        return SalesInquiry.objects.select_related("customer", "product", "assigned_to")

    def perform_create(self, serializer):
        inquiry = serializer.save()
        transaction.on_commit(lambda: notify_sales_inquiry(inquiry))


class CheckoutSessionAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "checkout"

    def post(self, request):
        serializer = CheckoutSessionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order, session = create_stripe_checkout_session(serializer.validated_data, user=request.user)
        return Response(
            {
                "order_id": str(order.public_id),
                "session_id": session.id,
                "checkout_url": session.url,
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        signature = request.headers.get("Stripe-Signature", "")
        payment_event = handle_stripe_webhook(request.body, signature)
        return Response({"received": True, "event_id": payment_event.stripe_event_id})
