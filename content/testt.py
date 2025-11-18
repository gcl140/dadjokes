from ytmusicapi import YTMusic
import shutil
import requests, os, random
from dadjokes import settings
from ytmusicapi import YTMusic
import subprocess
from pydub import AudioSegment
from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.http import require_POST
from django.contrib import messages
from .forms import JokeForm
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .models import Joke, JokeLike, JokeComment, Notification, JokeMusic
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
import glob
import time


def fetch_song_segment(songname):
    ytmusic = YTMusic()
    query = songname.strip().lower()
    results = ytmusic.search(query)
    if not results:
        raise RuntimeError("No results found.")

    top = results[0]
    video_id = top.get("videoId") or top.get("id")
    if not video_id:
        raise RuntimeError(f"Top result has no video ID: {top}")

    url = f"https://www.youtube.com/watch?v={video_id}"
    print(url)

    completed = subprocess.run([
        "yt-dlp",
        "--cookies", "/home/tansafapply/cookies/youtube.txt",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--no-warnings",
        "--print", "after_move:filename",
        "-o", "%(title)s [%(id)s].%(ext)s",
        url
    ], capture_output=True, text=True)

    if completed.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {completed.stderr}")

    song_filename = completed.stdout.strip()[:-3] + "" + "mp3"
    print(song_filename, "downloaded")
    if not os.path.exists(song_filename):
        raise RuntimeError(f"Downloaded file not found: {song_filename}")

    # Load MP3
    song = AudioSegment.from_mp3(song_filename)
    print("Loaded successfully:", song)

    # Trim: 45s → 75s
    trimmed = song[45*1000 : 75*1000]
    trimmed.export(song_filename, format="mp3")

    # Move to MEDIA
    media_subdir = "music"
    target_dir = os.path.join(settings.MEDIA_ROOT, media_subdir)
    os.makedirs(target_dir, exist_ok=True)

    final_path = os.path.join(target_dir, os.path.basename(song_filename))
    shutil.move(song_filename, final_path)
    print("Moved to MEDIA:", final_path)

    # Create DB entry
    songcreated = JokeMusic.objects.create(
        file_url=f"{media_subdir}/{os.path.basename(final_path)}",
        name=os.path.basename(final_path),
    )
    return songcreated

