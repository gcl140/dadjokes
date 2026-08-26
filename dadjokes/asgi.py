"""
ASGI config for dadjokes project.

Routes plain HTTP to Django as usual, and WebSocket connections to the
channels routing defined in content/routing.py.
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dadjokes.settings')

# get_asgi_application() must be called before importing anything that touches
# models/routing, so app registry is populated first.
django_asgi_app = get_asgi_application()

import content.routing  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(content.routing.websocket_urlpatterns)
        )
    ),
})
