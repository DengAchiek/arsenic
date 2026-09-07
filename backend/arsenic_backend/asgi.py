"""ASGI config for the Arsenic Energies backend."""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "arsenic_backend.settings")

application = get_asgi_application()
