import shutil
import sys
import requests, os, random, threading
from dadjokes import settings
from ytmusicapi import YTMusic
import subprocess
from pydub import AudioSegment
from django.http import JsonResponse, HttpResponseForbidden, HttpResponse

from django.views.decorators.http import require_POST
from django.contrib import messages
from .forms import JokeForm, JokeEditForm
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from .models import Joke, JokeLike, JokeComment, Notification, JokeMusic
from .notifications import broadcast_notification
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Count
from django.utils.formats import date_format
from django.shortcuts import get_object_or_404

# Create your views here.
def index(request):
    context = {}
    context.update(general_context(request))
    return render(request, 'content/index.html', context)

def ajoke(request, joke_id):
    # Shared links and search results land on a single static page here, which
    # dead-ends the feed. Send people into the real scrollable feed instead,
    # with this joke pinned first (see ?priority= handling in index.js).
    get_object_or_404(Joke, id=joke_id)
    return redirect(f"/?priority={joke_id}")




def joke_detail_api(request, joke_id):
    joke = get_object_or_404(Joke, id=joke_id)
    data = {
        "id": joke.id,
        "text": joke.content,
        "bg_color": joke.bg_color,
        "text_color": joke.text_color,
        "font_type": joke.font_type,
        "description": joke.description,
        "bg_musicName": joke.bg_music.name if joke.bg_music else "Original Sound",
        "bg_musicURL": joke.bg_music.file_url.url if joke.bg_music else "/static/audio/silent.mp3",  # <--- serialize the URL
        "username": joke.joke_by.username if joke.joke_by else "anonymous",
        "user_id": joke.joke_by.id if joke.joke_by else None,
        "user_profile": joke.joke_by.profile_picture.url if joke.joke_by and joke.joke_by.profile_picture else "/static/images/default-profile.jpg",
        "likes_count": joke.likers.count(),
        "comments_count": joke.comments_count,
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

    # select_related the FKs and annotate both counts in one query instead
    # of the previous per-joke .count() calls (which, combined with the
    # client firing a separate /fetch-comments/ request per card just to
    # read a count, meant a feed batch of 20 jokes could cost 20+ extra
    # queries and 20 extra HTTP round-trips before this).
    jokes = Joke.objects.filter(id__in=random_ids) \
              .select_related("joke_by", "bg_music") \
              .annotate(
                  likes_total=Count("jokelike", distinct=True),
                  comments_total=Count("jokecomment", distinct=True),
              )

    liked_ids = set()
    if request.user.is_authenticated:
        liked_ids = set(
            JokeLike.objects.filter(user=request.user, joke_id__in=random_ids)
            .values_list("joke_id", flat=True)
        )

    data = [
        {
            "id": j.id,
            "text": j.content,
            "bg_color": j.bg_color,
            "text_color": j.text_color,
            "font_type": j.font_type,
            "bg_musicName": j.bg_music.name if j.bg_music else "Original Sound",
            "bg_musicURL": j.bg_music.file_url.url if j.bg_music else "/static/audio/silent.mp3",  # <--- serialize the URL
            "description": j.description,
            "username": j.joke_by.username if j.joke_by else "anonymous",
            "user_id": j.joke_by.id if j.joke_by else None,
            "user_profile": j.joke_by.profile_picture.url if j.joke_by and j.joke_by.profile_picture else "/static/images/default-profile.jpg",
            "likes_count": j.likes_total,
            "comments_count": j.comments_total,
            "is_liked_by_user": j.id in liked_ids,
        }
        for j in jokes
    ]

    return JsonResponse({"jokes": data})


def search_jokes_api(request):
    query = request.GET.get("q", "").strip()
    if not query:
        return JsonResponse({"jokes": []})

    qs = Joke.objects.filter(content__icontains=query).select_related("joke_by")[:8]
    data = [
        {
            "id": j.id,
            "text": j.content,
            "bg_color": j.bg_color,
            "text_color": j.text_color,
            "username": j.joke_by.username if j.joke_by else "anonymous",
        }
        for j in qs
    ]
    return JsonResponse({"jokes": data})


MUSIC_SEARCH_PAGE_SIZE = 8


@login_required
def music_search_api(request):
    """Backs the async background-music combobox on the create-joke form.
    With no query, returns a small random sample so the dropdown isn't
    empty (or the whole song library) on first focus. Once the user
    types, results are a proper offset-paginated search so the dropdown's
    "Load more" can page through matches instead of dumping everything."""
    query = request.GET.get("q", "").strip()

    if not query:
        qs = JokeMusic.objects.order_by("?")[:5]
        return JsonResponse({
            "results": [{"id": m.id, "name": m.name} for m in qs],
            "has_more": False,
        })

    offset = int(request.GET.get("offset", 0) or 0)
    qs = JokeMusic.objects.filter(name__icontains=query).order_by("name")
    page = list(qs[offset:offset + MUSIC_SEARCH_PAGE_SIZE + 1])

    return JsonResponse({
        "results": [{"id": m.id, "name": m.name} for m in page[:MUSIC_SEARCH_PAGE_SIZE]],
        "has_more": len(page) > MUSIC_SEARCH_PAGE_SIZE,
    })


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


@login_required
@csrf_exempt  # because JS sends the token manually
def delete_joke(request, joke_id):
    if request.method == 'DELETE':
        try:
            joke = Joke.objects.get(id=joke_id)
            if joke.joke_by != request.user:
                return HttpResponseForbidden("You cannot delete this joke.")
            joke.delete()
            messages.success(request, "Joke deleted successfully!")
            return JsonResponse({"message": "Joke deleted successfully"})

        except Joke.DoesNotExist:
            return JsonResponse({"error": "Joke not found"}, status=404)
    return JsonResponse({"error": "Invalid request method"}, status=400)


@login_required
@csrf_exempt  # because JS sends the token manually
def edit_joke(request, joke_id):
    joke = get_object_or_404(Joke, id=joke_id)
    if joke.joke_by != request.user:
        return HttpResponseForbidden("You cannot edit this joke.")

    if request.method == "GET":
        return JsonResponse(_serialize_own_joke(joke))

    if request.method == "POST":
        form = JokeEditForm(request.POST, instance=joke)
        if form.is_valid():
            form.save()
            return JsonResponse(_serialize_own_joke(joke))
        return JsonResponse({"error": form.errors.as_text()}, status=400)

    return JsonResponse({"error": "Invalid request method"}, status=405)


def _serialize_own_joke(joke):
    return {
        "id": joke.id,
        "content": joke.content,
        "description": joke.description or "",
        "bg_color": joke.bg_color,
        "text_color": joke.text_color,
        "font_type": joke.font_type,
        "bg_music_id": joke.bg_music_id,
        "bg_music_name": joke.bg_music.name if joke.bg_music else "",
        "likes_count": joke.likes_count,
        "comments_count": joke.comments_count,
    }


def user_jokes_api(request, user_id):
    # Public - anyone can view a user's posts, same as the profile page itself.
    # Editing/deleting is separately gated by ownership in edit_joke/delete_joke.
    author = get_object_or_404(get_user_model(), id=user_id)
    qs = Joke.objects.filter(joke_by=author).order_by('-created_at')
    paginator = Paginator(qs, 5)
    page = paginator.get_page(request.GET.get('page'))

    return JsonResponse({
        "jokes": [_serialize_own_joke(j) for j in page],
        "page": page.number,
        "num_pages": paginator.num_pages,
        "has_next": page.has_next(),
        "can_edit": request.user.is_authenticated and request.user == author,
    })


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
        # A friendlier starting point than the model's white-on-black
        # default, so the live preview shows something worth looking at
        # before the user has touched a single control.
        form = JokeForm(initial={"bg_color": "#F2B134", "text_color": "#000000"})
    context = {
        "form": form,
    }
    context.update(general_context(request))
    return render(request, "content/joke.html", context)

@login_required
def inbox(request):
    notifications_qs = Notification.objects.filter(user=request.user).order_by('is_read', '-created_at')
    paginator = Paginator(notifications_qs, 12)
    notifications = paginator.get_page(request.GET.get('page'))
    context = {
        'notifications': notifications,
        }
    context.update(general_context(request))
    return render(request, 'content/bobo.html', context)


def _serialize_notification(n):
    return {
        "id": n.id,
        "message": n.message,
        "message_type": n.message_type,
        "is_read": n.is_read,
        "created_at": date_format(n.created_at, format="DATETIME_FORMAT"),
    }


@login_required
def notifications_api(request):
    qs = Notification.objects.filter(user=request.user).order_by('is_read', '-created_at')
    paginator = Paginator(qs, 12)
    page = paginator.get_page(request.GET.get('page'))

    return JsonResponse({
        "notifications": [_serialize_notification(n) for n in page],
        "page": page.number,
        "num_pages": paginator.num_pages,
        "has_next": page.has_next(),
    })



@login_required
def toggle_like(request, joke_id):
    joke = get_object_or_404(Joke, id=joke_id)
    user = request.user
    like, created = JokeLike.objects.get_or_create(user=user, joke=joke)

    if created:
        notification = Notification.objects.create(
            user=joke.joke_by,
            message=f"{user.username} liked your joke ({joke.content[:10]}...).",
            message_type='like'
        )
        if joke.joke_by:
            broadcast_notification(notification)
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
    comments_qs = joke.jokecomment_set.all().order_by('-created_at')

    paginator = Paginator(comments_qs, 10)
    page = paginator.get_page(request.GET.get('page'))

    data = [
        {
            "id": c.id,
            "user": c.user.username,
            "text": c.comment_text,       # FIXED
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for c in page
    ]

    return JsonResponse({
        "comments": data,
        "total_count": paginator.count,
        "page": page.number,
        "num_pages": paginator.num_pages,
        "has_next": page.has_next(),
        "has_previous": page.has_previous(),
    })



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
    notification = Notification.objects.create(
        user=joke.joke_by,
        message=f"{request.user.username} commented on your joke ({joke.content[:10]}...): {text[:30]}",
        message_type='comment'
    )
    if joke.joke_by:
        broadcast_notification(notification)

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
@login_required
def mark_notification_read(request, notification_id):
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.is_read = True
    notification.save()
    return JsonResponse({"message": "Notification marked as read"})


@login_required
def mark_all_notifications_read(request):
    updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return JsonResponse({"updated": updated})


def general_context(request):
    if request.user.is_authenticated:
        user = request.user
        return {
            'notificates': Notification.objects.filter(user=user, is_read=False).count(),
        }
    return {}


def _yt_dlp_path():
    """Resolve the yt-dlp binary without depending on PATH. It's installed
    into venv/bin alongside this interpreter (see req.txt), but the
    production systemd unit execs Daphne's venv path directly rather than
    running through an activated shell, so venv/bin never makes it onto
    PATH and a bare "yt-dlp" lookup fails with FileNotFoundError."""
    venv_candidate = os.path.join(os.path.dirname(sys.executable), "yt-dlp")
    if os.path.exists(venv_candidate):
        return venv_candidate
    return shutil.which("yt-dlp") or "yt-dlp"


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

    # The output template below always embeds "[video_id]" in the saved
    # filename, so this is how we tell whether the top search result was
    # already downloaded by an earlier search - avoids piling up duplicate
    # JokeMusic rows (and duplicate downloads) every time someone searches
    # the same song again.
    existing = JokeMusic.objects.filter(name__icontains=f"[{video_id}]").first()
    if existing:
        return existing

    url = f"https://www.youtube.com/watch?v={video_id}"
    print(url)

    cookies_path = os.path.join(settings.BASE_DIR, "cookies", "youtube_cookies.txt")

    completed = subprocess.run([
        _yt_dlp_path(),
        "--cookies", cookies_path,
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

    # yt-dlp prints the pre-extraction filename here (e.g. ending in
    # .webm/.m4a) on some versions and the post-extraction .mp3 name on
    # others. -x --audio-format mp3 always leaves the final file on disk
    # with the same base name and a .mp3 extension, so swap the extension
    # properly instead of slicing off a fixed number of characters.
    song_filename = os.path.splitext(completed.stdout.strip())[0] + ".mp3"
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


def _run_song_search(user, query):
    """Runs off-request in a background thread: the YT search + yt-dlp
    download + trim is slow enough to blow past a browser/proxy timeout if
    done inline. Reports back over the same Notification + websocket pipe
    used for likes/comments, instead of Django `messages` (which needs a
    full page reload to show)."""
    try:
        songcreated = fetch_song_segment(query)
        notification = Notification.objects.create(
            user=user,
            message=f"Song added: {songcreated.name}",
            message_type='success',
        )
    except Exception as e:
        notification = Notification.objects.create(
            user=user,
            message=f"Couldn't find \"{query}\": {e}",
            message_type='error',
        )
    broadcast_notification(notification)


@login_required
@require_POST
def add_song(request):
    query = request.POST.get("query", "").strip()
    if not query:
        return JsonResponse({"error": "You must enter a song name."}, status=400)

    threading.Thread(
        target=_run_song_search,
        args=(request.user, query),
        daemon=True,
    ).start()

    return JsonResponse({"status": "started", "query": query}, status=202)