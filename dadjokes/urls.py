
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.views.static import serve
from django.conf.urls import handler404
from django.urls import path
from yuzzaz import views
from django.contrib.auth import logout
from django.shortcuts import redirect



handler404 = 'yuzzaz.views.custom_404_view'

def logout_then_google(request):
    logout(request)
    return redirect('/oauth/login/google-oauth2/?next=/profile/')



urlpatterns = [
    path('admyn/', admin.site.urls),
    path('', include('content.urls')),
    path('accounts/', include('yuzzaz.urls')),
    path('oauth/', include('social_django.urls', namespace='social')),
    path('oauth/login/google/', logout_then_google, name='logout-then-google'),
    path("__reload__/", include("django_browser_reload.urls")),
    path('accounts/login/', RedirectView.as_view(url='/login/', permanent=True)),
]




if settings.DEBUG:
    # Dev: Django serves static & media
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Fallback: serve both static & media (not recommended for heavy traffic!)
    urlpatterns += [
        path('static/<path:path>/', serve, {'document_root': settings.STATIC_ROOT}),
        path('media/<path:path>/', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
