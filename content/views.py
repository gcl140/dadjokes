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

# Create your views here.
def index(request):
    context = {}
    context.update(general_context(request))
    return render(request, 'content/index.html', context)

def ajoke(request, joke_id):
    joke = get_object_or_404(Joke, id=joke_id)
    context = {
        "joke": joke,
    }
    context.update(general_context(request))
    # return render(request, 'content/ajoke.html', context)

    return redirect(f"/?priority={joke_id}")
    # return redirect(f"https://www.gcloo.live/?priority={joke_id}")

# def ajoke(request, joke_id):
#     # return HttpResponse("VIEW RAN")
#     return render(request, 'content/index.html')




def joke_detail_api(request, joke_id):
    joke = get_object_or_404(Joke, id=joke_id)
    data = {
        "id": joke.id,
        "text": joke.content,
        "bg_color": joke.bg_color,
        "text_color": joke.text_color,
        "font_type": joke.font_type,
        "description": joke.description,
        # "bg_music": joke.bg_music,
        # "bg_music": (
        #         {
        #             "id": joke.bg_music.id,
        #             "name": joke.bg_music.name,
        #             "url": joke.bg_music.file_url.url,
        #         }
        #         if joke.bg_music else None
        #     ),
        "bg_musicName": joke.bg_music.name if joke.bg_music else "Original Sound",
        "bg_musicURL": joke.bg_music.file_url.url if joke.bg_music else "/static/audio/silent.mp3",  # <--- serialize the URL

        "username": joke.joke_by.username if joke.joke_by else "anonymous",
        "user_id": joke.joke_by.id if joke.joke_by else None,
        "user_profile": joke.joke_by.profile_picture.url if joke.joke_by and joke.joke_by.profile_picture else "/static/images/default-profile.jpg",
        "likes_count": joke.likers.count(),
        "is_liked_by_user": request.user in joke.likers.all(),
    }
    return JsonResponse(data)

def jokes_api(request):
    chunk_size = int(request.GET.get("size", 30))
    exclude_raw = request.GET.get("exclude", "")
    exclude_ids = [int(x) for x in exclude_raw.split(",") if x.isdigit()]

    qs = Joke.objects.exclude(id__in=exclude_ids)

    all_ids = list(qs.values_list("id", flat=True))

    random_ids = random.sample(all_ids, min(chunk_size, len(all_ids)))
    jokes = qs.filter(id__in=random_ids) \
              .select_related("joke_by") \
              .prefetch_related("jokelike_set")
    data = [
        {
            "id": j.id,
            "text": j.content,
            "bg_color": j.bg_color,
            "text_color": j.text_color,
            "font_type": j.font_type,
            # "bg_music": j.bg_music.id if j.bg_music else None,
            # "bg_music": (
            #     {
            #         "id": j.bg_music.id,
            #         "name": j.bg_music.name,
            #         "url": j.bg_music.file_url,
            #     }
            #     if j.bg_music else None
            # ),
            "bg_musicName": j.bg_music.name if j.bg_music else "Original Sound",
            "bg_musicURL": j.bg_music.file_url.url if j.bg_music else "/static/audio/silent.mp3",  # <--- serialize the URL


            "description": j.description,
            "username": j.joke_by.username if j.joke_by else "anonymous",
            "user_id": j.joke_by.id if j.joke_by else None,
            "user_profile": j.joke_by.profile_picture.url if j.joke_by and j.joke_by.profile_picture else None,
            "likes_count": j.jokelike_set.count(),
            "is_liked_by_user": j.jokelike_set.filter(user=request.user).exists() if request.user.is_authenticated else False,
        }
        for j in jokes
    ]

    return JsonResponse({"jokes": data})



def joke_detail(request, joke_id):
    try:
        joke = Joke.objects.get(id=joke_id)
        data = {
            "id": joke.id,
            "text": joke.content,
            "bg_color": joke.bg_color,
            "text_color": joke.text_color,
            "font_type": joke.font_type,
            "bg_music": joke.bg_music,
            "description": joke.description,
            "username": joke.joke_by.username if joke.joke_by else "anonymous"
        }
        return JsonResponse(data)
    except Joke.DoesNotExist:
        return JsonResponse({"error": "Joke not found"}, status=404)


@csrf_exempt  # because JS sends the token manually
def delete_joke(request, joke_id):
    if request.method == 'DELETE':
        try:
            joke = Joke.objects.get(id=joke_id)
            joke.delete()
            messages.success(request, "Joke deleted successfully!")
            return JsonResponse({"message": "Joke deleted successfully"})

        except Joke.DoesNotExist:
            return JsonResponse({"error": "Joke not found"}, status=404)
    return JsonResponse({"error": "Invalid request method"}, status=400)



@login_required
def create_joke(request):
    if request.method == "POST":
        form = JokeForm(request.POST)
        user = request.user
        if form.is_valid():
            form.instance.joke_by = user
            form.save()
            messages.success(request, "Joke created successfully!")
            return redirect('profile', user_id=user.id)  # or wherever you want to go
        else:
            messages.error(request, "Please fix the errors below.")
    else:
        form = JokeForm()
    context = {
        "form": form,
    }
    context.update(general_context(request))
    return render(request, "content/joke.html", context)

@login_required
def inbox(request):
    notifications = Notification.objects.filter(user=request.user).order_by('is_read', '-created_at')

    context = {
        'notifications': notifications,
        }
    context.update(general_context(request))
    return render(request, 'content/bobo.html', context)



@login_required
def toggle_like(request, joke_id):
    joke = get_object_or_404(Joke, id=joke_id)
    user = request.user
    like, created = JokeLike.objects.get_or_create(user=user, joke=joke)

    if created:
        Notification.objects.create(
            user=joke.joke_by,
            message=f"{user.username} liked your joke ({joke.content[:10]}...).",
            message_type='like'
        )
        liked = True

    else:
        like.delete()
        liked = False
        Notification.objects.filter(
            user=joke.joke_by,
            message__startswith=f"{user.username} liked your joke ({joke.content[:10]}...).",
            message_type="like"
        ).delete()

    return JsonResponse({
        "liked": liked,
        "likes_count": joke.likes_count
    })


def fetch_comments(request, joke_id):
    joke = get_object_or_404(Joke, id=joke_id)
    comments = joke.jokecomment_set.all().order_by('-created_at')

    data = [
        {
            "id": c.id,
            "user": c.user.username,
            "text": c.comment_text,       # FIXED
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for c in comments
    ]

    return JsonResponse({"comments": data})



@login_required
@require_POST
def post_comment(request, joke_id):
    joke = get_object_or_404(Joke, id=joke_id)
    text = request.POST.get("comment_text", "").strip()

    if not text:
        return JsonResponse({"error": "Comment cannot be empty"}, status=400)

    comment = JokeComment.objects.create(
        user=request.user,
        joke=joke,
        comment_text=text
    )
    Notification.objects.create(
        user=joke.joke_by,
        message=f"{request.user.username} commented on your joke ({joke.content[:10]}...): {text[:30]}",
        message_type='comment'
    )

    return JsonResponse({
        "id": comment.id,
        "user": comment.user.username,
        "text": comment.comment_text,
        "created_at": comment.created_at.strftime("%Y-%m-%d %H:%M:%S")
    })

@login_required
def delete_comment(request, comment_id):
    comment = get_object_or_404(JokeComment, id=comment_id)

    if comment.user != request.user:
        return HttpResponseForbidden("You cannot delete this comment.")

    comment.delete()
    return JsonResponse({"message": "Comment deleted successfully"})

@login_required
def mark_notification_read(request, notification_id):
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.is_read = True
    notification.save()
    return JsonResponse({"message": "Notification marked as read"})


def general_context(request):
    if request.user.is_authenticated:
        user = request.user
        return {
            'notificates': Notification.objects.filter(user=user, is_read=False).count(),
        }
    return {}


# def fetch_song_segment(songname):
#     ytmusic = YTMusic()
#     query = songname.strip().lower()
#     results = ytmusic.search(query)

#     if not results:
#         print("No results found.")

#     top = results[0]

#     # GUARANTEED video_id extraction:
#     video_id = top.get("videoId") or top.get("id")
#     if not video_id:
#         print("Result has no videoId:", top)

#     url = f"https://www.youtube.com/watch?v={video_id}"
#     print(url)

#     completed = subprocess.run([
#         "yt-dlp",
#         "-x",
#         "--audio-format", "mp3",
#         "--audio-quality", "0",
#         "--no-warnings",
#         "--print", "after_move:filename",
#         "-o", "%(title)s [%(id)s].%(ext)s",
#         url
#     ], capture_output=True, text=True)

#     if completed.returncode != 0:
#         print("yt-dlp failed:", completed.stderr)

#     song_filename = completed.stdout.strip()

#     if song_filename.endswith(".webm"):
#         mp3_candidate = song_filename[:-5] + ".mp3"
#         if os.path.exists(mp3_candidate):
#             song_filename = mp3_candidate
#         else:
#             # yt-dlp never converted it, so your flags failed
#             raise RuntimeError("yt-dlp produced a .webm and no .mp3 was generated")

#     print("Downloaded file:", song_filename)

#     # Verify file actually exists
#     if not os.path.exists(song_filename):
#         print("yt-dlp lied. File not found.")

#     # Load MP3
#     song = AudioSegment.from_mp3(song_filename)
#     print("Loaded successfully:", song)


#     f5_seconds = 45 * 1000
#     end_seconds = 75 * 1000
#     first_f5_seconds = song[f5_seconds:end_seconds]

#     # first_f5_seconds.export(song_filename, format="mp3")

#     # overwrite trimmed file in temp folder
#     first_f5_seconds.export(song_filename, format="mp3")

#     # ---------------------------------------------------
#     # MOVE FILE TO MEDIA DIRECTORY (THIS IS THE FIX)
#     # ---------------------------------------------------
#     media_subdir = "music"
#     target_dir = os.path.join(settings.MEDIA_ROOT, media_subdir)
#     os.makedirs(target_dir, exist_ok=True)

#     base_name = os.path.basename(song_filename)
#     final_path = os.path.join(target_dir, base_name)

#     shutil.move(song_filename, final_path)
#     print("Moved to MEDIA:", final_path)
#     # ---------------------------------------------------

#     songcreated = JokeMusic.objects.create(
#         file_url=f"{media_subdir}/{base_name}",
#         name=base_name,
#     )
#     return songcreated


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


# def fetch_song_segment(songname):
#     print("\n--- fetch_song_segment START ---")
#     print("Song query:", songname)

#     ytmusic = YTMusic()
#     query = songname.strip().lower()
#     print("YTMusic search query:", query)

#     results = ytmusic.search(query)
#     print("Search results:", results[:1])

#     if not results:
#         print("ERROR: No results found.")
#         return None

#     top = results[0]
#     print("Top result:", top)

#     # GUARANTEED video_id extraction:
#     video_id = top.get("videoId") or top.get("id")
#     print("Extracted video ID:", video_id)

#     if not video_id:
#         print("ERROR: Result has no videoId:", top)
#         return None

#     url = f"https://www.youtube.com/watch?v={video_id}"
#     print("Using URL:", url)

#     # ---- DOWNLOAD WITH YT-DLP ----
#     completed = subprocess.run([
#         "yt-dlp",
#         "-x",
#         "--audio-format", "mp3",
#         "--audio-quality", "0",
#         "--no-warnings",
#         "--print", "after_move:filename",
#         "-o", "%(title)s [%(id)s].%(ext)s",
#         url
#     ], capture_output=True, text=True)

#     print("yt-dlp return code:", completed.returncode)
#     print("yt-dlp stdout:", completed.stdout)
#     print("yt-dlp stderr:", completed.stderr)

#     if completed.returncode != 0:
#         print("ERROR: yt-dlp failed:", completed.stderr)
#         return None

#     song_filename = completed.stdout.strip()
#     print("Raw downloaded filename:", song_filename)

#     # ---- Fix weird .webm output ----
#     if song_filename.endswith(".webm"):
#         mp3_candidate = song_filename[:-5] + ".mp3"
#         print("Checking mp3 candidate:", mp3_candidate)

#         if os.path.exists(mp3_candidate):
#             song_filename = mp3_candidate
#             print("Using mp3 candidate:", song_filename)
#         else:
#             raise RuntimeError("yt-dlp produced .webm but no .mp3")

#     print("Final downloaded filename:", song_filename)

#     # ---- VERIFY FILE EXISTS ----
#     if not os.path.exists(song_filename):
#         print("ERROR: File does NOT exist:", song_filename)
#         return None

#     print("Loading MP3 now...")

#     # ---- LOAD AUDIO ----
#     try:
#         song = AudioSegment.from_mp3(song_filename)
#         print("Audio loaded OK. Duration:", len(song), "ms")
#     except Exception as e:
#         print("ERROR loading MP3:", e)
#         return None

#     # ---- CUT SEGMENT ----
#     f5_seconds = 45 * 1000
#     end_seconds = 75 * 1000
#     print("Extracting segment:", f5_seconds, "to", end_seconds)

#     first_f5_seconds = song[f5_seconds:end_seconds]

#     print("Exporting trimmed file back to:", song_filename)
#     try:
#         first_f5_seconds.export(song_filename, format="mp3")
#         print("Trim export successful.")
#     except Exception as e:
#         print("ERROR exporting trimmed segment:", e)
#         return None

#     # =======================================================
#     # MOVE FILE TO MEDIA DIRECTORY
#     # =======================================================

#     media_subdir = "music"
#     target_dir = os.path.join(settings.MEDIA_ROOT, media_subdir)
#     print("Target MEDIA directory:", target_dir)

#     try:
#         os.makedirs(target_dir, exist_ok=True)
#         print("MEDIA directory exists or created.")
#     except Exception as e:
#         print("ERROR creating media dir:", e)
#         return None

#     base_name = os.path.basename(song_filename)
#     final_path = os.path.join(target_dir, base_name)

#     print("Moving file:")
#     print("FROM:", song_filename)
#     print("TO:", final_path)

#     try:
#         shutil.move(song_filename, final_path)
#         print("Move OK.")
#     except Exception as e:
#         print("MOVE FAILED:", e)
#         print("Current working directory:", os.getcwd())
#         print("MEDIA_ROOT:", settings.MEDIA_ROOT)
#         return None

#     print("File moved successfully:", final_path)

#     # ---- SAVE TO DB ----
#     try:
#         songcreated = JokeMusic.objects.create(
#             file_url=f"{media_subdir}/{base_name}",
#             name=base_name,
#         )
#         print("DB record created:", songcreated)
#     except Exception as e:
#         print("DB CREATE FAILED:", e)
#         return None

#     print("--- fetch_song_segment END ---\n")
#     return songcreated


def add_song(request):
    if request.method == "POST":
        query = request.POST.get("query", "").strip()
        if not query:
            messages.error(request, "You must enter a song name.")
            return redirect(request.META.get("HTTP_REFERER", "/"))

        try:
            # obj = fetch_song_segment(query)
                ytmusic = YTMusic()
                query = query.strip().lower()
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
                    "/home/tansafapply/venv/bin/yt-dlp",
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
                messages.success(request, f"Song added: {songcreated.name}")

        except Exception as e:
            messages.error(request, f"Failedd: {e}")

        return redirect(request.META.get("HTTP_REFERER", "/"))

    return redirect("/")