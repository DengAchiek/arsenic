import mimetypes
from urllib.parse import urlparse

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, Http404, JsonResponse
from django.shortcuts import redirect
from django.urls import include, path, re_path


def healthz(_request):
    return JsonResponse({"status": "ok"})


def backend_root(request):
    if settings.SERVE_FRONTEND:
        return frontend_file(request)

    frontend = settings.FRONTEND_BASE_URL.rstrip("/")
    frontend_host = urlparse(frontend).hostname or ""
    request_host = request.get_host().split(":")[0]
    if frontend_host and frontend_host not in {"localhost", "127.0.0.1"} and frontend_host != request_host:
        return redirect(frontend)
    return redirect("/api/")


def frontend_file(_request, path="index.html"):
    if not settings.SERVE_FRONTEND:
        raise Http404("File not found")

    base_dir = settings.FRONTEND_BUILD_DIR.resolve()
    candidate = (base_dir / path).resolve()
    if base_dir not in candidate.parents and candidate != base_dir:
        raise Http404("File not found")
    if not candidate.is_file():
        raise Http404("File not found")
    content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
    return FileResponse(candidate.open("rb"), content_type=content_type)


urlpatterns = [
    path("", backend_root, name="backend-root"),
    path("healthz/", healthz, name="healthz"),
    path("api/", include("commerce.urls")),
    re_path(r"^(?P<path>admin/index\.html)$", frontend_file, name="frontend-admin-shell"),
    re_path(r"^(?P<path>admin/(?:css|js)/.+)$", frontend_file, name="frontend-admin-assets"),
    path("admin/", admin.site.urls),
    re_path(r"^(?P<path>(?:[^/]+\.html|assets/.+|css/.+|js/.+))$", frontend_file, name="frontend-file"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
