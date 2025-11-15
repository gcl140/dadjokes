import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dadjokess.settings")
django.setup()

from content.models import Joke, JokeLike, JokeComment

from django.test import TestCase

# Create your tests here.



# print(generate_username(1))

from random_username.generate import generate_username
from content.models import Joke, JokeLike, JokeComment
from django.contrib.auth import get_user_model
from django.http import JsonResponse, HttpResponseForbidden
import requests
import random

User = get_user_model()

def random_hex_color():
    return "#{:06x}".format(random.randint(0, 0xFFFFFF))

for i in range(0, 99):
    response = requests.get("https://icanhazdadjoke.com/", headers={"Accept": "text/plain"})
    # user = User.objects.create(username=generate_username(1)[0]
    #                            , email=f"user{i+1}@example.com"
    #                            , password=generate_username(1)[0]
    #                            , is_active=True
    #                            )
    # user
    user = User.objects.get(username="gftinity")
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
    
    joke = Joke.objects.create(
        joke_by = user,
        content=response.text,
        bg_color=random_hex_color(),
        text_color=random_hex_color(),
        font_type=random.choice(font_types)[0],
        description=f"Description for joke {i+1}",

    )
    print(f"Created joke with ID: {joke.id}")


# exec(open("yuzzaz/tests.py").read())
