from django.conf import settings
from django.contrib import admin
from django.urls import path, re_path, include
from django.views.generic import RedirectView
from django.views.static import serve as serve_static
from django.contrib.auth import logout
from django.shortcuts import redirect

handler404 = 'accounts.views.custom_404_view'

def logout_then_google(request):
    logout(request)
    return redirect('/oauth/login/google-oauth2/?next=/profile/')

urlpatterns = [
    path('admyn/', admin.site.urls),
    path('', include('content.urls')),
    path('accounts/', include('accounts.urls')),
    path('oauth/', include('social_django.urls', namespace='social')),
    path('oauth/login/google/', logout_then_google, name='logout-then-google'),
    path("__reload__/", include("django_browser_reload.urls")),
    path('accounts/login/', RedirectView.as_view(url='/login/', permanent=True)),
]

# Serves /static/ and /media/ straight from disk unconditionally (not just
# in DEBUG). There's no reverse proxy in front of Daphne on the deployment
# server, so Django has to be the one handing these out - Django's docs
# call django.views.static.serve unsuitable for high-traffic production
# use, but for this app's scale it's the simplest thing that works, and
# Cloudflare's edge cache absorbs repeat static requests anyway.
urlpatterns += [
    re_path(r'^static/(?P<path>.*)$', serve_static, {'document_root': settings.STATIC_ROOT}),
    re_path(r'^media/(?P<path>.*)$', serve_static, {'document_root': settings.MEDIA_ROOT}),
]