from django.db import models
from django.contrib.auth.models import User, AbstractUser
from django.contrib.auth import get_user_model

User = get_user_model()

# Create your models here.
class Joke(models.Model):
    joke_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    content = models.TextField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    bg_color = models.CharField(max_length=7, default='#FFFFFF')  # Hex color code 
    text_color = models.CharField(max_length=7, default='#000000')  # Hex color code
    font_types = [ ('Arial', 'Arial'),
                   ('Times New Roman', 'Times New Roman'), 
                   ('Courier New', 'Courier New'), 
                   ('Georgia', 'Georgia'), 
                   ('Verdana', 'Verdana'),
                   ('Comic Sans MS', 'Comic Sans MS'),
                    ('Trebuchet MS', 'Trebuchet MS'),
                    ('Impact', 'Impact'),
                    ('Lucida Console', 'Lucida Console'),
                    ('Palatino Linotype', 'Palatino Linotype')
                    
                   ]
    font_type = models.CharField(max_length=20, choices=font_types, default='Arial')  # Font type (e.g., 'Arial', 'Times New Roman')
    bg_music = models.CharField(max_length=100, blank=True, null=True)  # URL or identifier for background music
    created_at = models.DateTimeField(auto_now_add=True)
    likers = models.ManyToManyField(User, related_name='liked_jokes', blank=True)

    def __str__(self):
        return self.content[:50]  # Return first 50 characters of the joke
    
    @property
    def likes_count(self):
        return self.jokelike_set.count()
    
    @property
    def comments_count(self):
        return self.jokecomment_set.count()
    
    @property
    def likerss(self):
        return User.objects.filter(jokelike__joke=self)

class JokeLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joke = models.ForeignKey(Joke, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'joke')

    def __str__(self):
        return f'Like by {self.user.username} on Joke {self.joke.id}'


class JokeComment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joke = models.ForeignKey(Joke, on_delete=models.CASCADE)
    comment_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Comment by {self.user.username} on Joke {self.joke.id}'
