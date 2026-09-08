from urllib.parse import urlparse

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import include, path


def healthz(_request):
    return JsonResponse({"status": "ok"})


def backend_root(request):
    frontend = settings.FRONTEND_BASE_URL.rstrip("/")
    frontend_host = urlparse(frontend).hostname or ""
    request_host = request.get_host().split(":")[0]
    if frontend_host and frontend_host not in {"localhost", "127.0.0.1"} and frontend_host != request_host:
        return redirect(frontend)
    return redirect("/api/")


urlpatterns = [
    path("", backend_root, name="backend-root"),
    path("healthz/", healthz, name="healthz"),
    path("admin/", admin.site.urls),
    path("api/", include("commerce.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
