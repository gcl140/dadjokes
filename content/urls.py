# content/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path("api/jokes/", views.jokes_api, name="jokes_api"),
    path("api/jokes/<int:joke_id>/", views.joke_detail, name="joke_detail"),
    path('delete-joke/<int:joke_id>/', views.delete_joke, name='delete_joke'),
    path('create-joke/', views.create_joke, name='create_joke'),
    path('toggle-like/<int:joke_id>/', views.toggle_like, name='like_joke'),
    path('fetch-comments/<int:joke_id>/', views.fetch_comments, name='fetch_comments'),
    path('post-comment/<int:joke_id>/', views.post_comment, name='post_comment'),
    path('delete-comment/<int:comment_id>/', views.delete_comment, name='delete_comment'),
    path('mark-notification-read/<int:notification_id>/', views.mark_notification_read, name='mark_notification_read'),
    path('inbox/', views.inbox, name='inbox'),
    path('joke/<int:joke_id>/', views.inbox, name='ajoke'),
    path('api/joke/<int:joke_id>/', views.joke_detail_api, name='joke_detail_api'),
    path('add-song/', views.add_song, name='add_song'),
    ]