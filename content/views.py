import random
from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.http import require_POST
from django.contrib import messages
from .forms import JokeForm
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .models import Joke, JokeLike, JokeComment
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404

# Create your views here.
def index(request):
    return render(request, 'content/index.html')



def jokes_api(request):
    jokes = list(Joke.objects.all().prefetch_related('jokelike_set'))  # convert to list for shuffling
    random.shuffle(jokes)  # shuffle in place

    data = []
    for j in jokes:
        data.append({
            "id": j.id,
            "text": j.content,
            "bg_color": j.bg_color,
            "text_color": j.text_color,
            "font_type": j.font_type,
            "bg_music": j.bg_music,
            "description": j.description,
            "username": j.joke_by.username if j.joke_by else "anonymous",
            "user_id": j.joke_by.id if j.joke_by else "anonymous",
            "likes_count": j.jokelike_set.count(),
            "is_liked_by_user": j.jokelike_set.filter(user=request.user).exists(),
        })

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
    
    return render(request, "content/joke.html", {"form": form})

@login_required
def toggle_like(request, joke_id):
    joke = get_object_or_404(Joke, id=joke_id)
    user = request.user

    # Check if like exists
    like, created = JokeLike.objects.get_or_create(user=user, joke=joke)

    if not created:
        # Already liked → remove it
        like.delete()
        liked = False
    else:
        # New like created
        liked = True

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