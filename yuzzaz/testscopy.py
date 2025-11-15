from content.models import Joke, JokeLike, JokeComment
from django.contrib.auth import get_user_model
import django

django.setup()

# User = get_user_model()

# items = Joke.objects.all()
# print(len(items))
# itemss = set(items)
# print(len(itemss))


items = Joke.objects.all()
print("Total jokes in DB:", items.count())

# --- 2. Deduplicate by 'content' AND 'user' ---
# Keep one instance per (content, joke_by) combination
seen = {}
duplicates = []

for item in items:
    key = (item.content, item.joke_by.id)
    if key not in seen:
        seen[key] = item  # keep this one
    else:
        duplicates.append(item)  # mark for deletion

print("Duplicates found:", len(duplicates))

# --- 3. Delete duplicates from DB ---
for dup in duplicates:
    dup.delete()

# --- 4. Verify ---
items_after = Joke.objects.all()
print("Total jokes after deletion:", items_after.count())

unique_jokes_after = list({(item.content, item.joke_by.id): item for item in items_after}.values())
print("Unique jokes by content & user after deletion:", len(unique_jokes_after))

# exec(open("yuzzaz/testscopy.py").read())
