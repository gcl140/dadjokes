import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dadjokes.settings")
django.setup()

from content.testt import fetch_song_segment

song = input("Song? ").strip().lower()
fetch_song_segment(song)