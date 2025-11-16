from django.contrib import admin
from .models import Joke, JokeLike, JokeComment, Notification, JokeMusic
# Register your models here.

# admin.site.register(Joke)
class JokeAdmin(admin.ModelAdmin):
    list_display = ('joke_by', 'content', 'created_at',)
    list_filter = ('created_at', 'font_type')
    search_fields = ('content', 'joke_by__username', 'joke_by__email')
admin.site.register(Joke, JokeAdmin)

class JokeLikeAdmin(admin.ModelAdmin):
    list_display = ('user', 'joke', 'created_at',)
    list_filter = ('created_at',)
    search_fields = ('user__username', 'joke__content')
admin.site.register(JokeLike, JokeLikeAdmin)

class JokeCommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'joke', 'comment_text', 'created_at',)
    list_filter = ('created_at',)
    search_fields = ('user__username', 'joke__content', 'comment_text')
admin.site.register(JokeComment, JokeCommentAdmin)

class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'message_type', 'is_read', 'created_at',)
    list_filter = ('message_type', 'is_read', 'created_at',)
    search_fields = ('user__username', 'message')
admin.site.register(Notification, NotificationAdmin)

class JokeMusicAdmin(admin.ModelAdmin):
    list_display = ('name', 'file_url', 'created_at',)
    search_fields = ('name',)
admin.site.register(JokeMusic, JokeMusicAdmin)