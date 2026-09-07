from django.conf import settings


class SecurityHeadersMiddleware:
    """Small security header layer for API responses behind Cloudflare."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        csp = getattr(settings, "DJANGO_CONTENT_SECURITY_POLICY", "")
        if csp:
            response.setdefault("Content-Security-Policy", csp)
        return response
