import random
import re
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from content.models import Joke, JokeMusic

User = get_user_model()

LINE_RE = re.compile(r"^User ID:\s*\d+\s*\|\s*Joke ID:\s*\d+\s*\|\s*Content:\s*(.*)$")

# Same palette family the create-joke form's colour pickers draw from, so
# seeded jokes look at home next to user-created ones instead of all being
# flat white-on-white.
BG_COLORS = [
    "#F2B134", "#8B5A0B", "#B4CB10", "#C81AA4", "#1F6FB2",
    "#2E9E6B", "#D9382A", "#7A4FBF", "#0B7A75", "#C9622B",
]
TEXT_COLORS = ["#FFFFFF", "#000000", "#FFF7E6", "#1C1204"]
FONT_TYPES = [choice[0] for choice in Joke.font_types]


def repair_mojibake(text):
    """jokes.txt has UTF-8 text that was round-tripped through Latin-1 at some
    point (curly quotes/apostrophes show up as e.g. "donâ\x80\x99t"). Undo that
    single mis-encoding pass; if the text isn't actually mojibake this raises
    and we just keep the original string.
    """
    try:
        return text.encode("latin1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return text


def parse_jokes(path):
    """jokes.txt is "User ID: N | Joke ID: M | Content: <text>" per entry,
    but a joke's content can wrap onto following bare lines (no prefix) until
    the next "User ID:" line starts. Collapse those continuation lines back
    into one joke, join with paragraph breaks where the source had them.
    """
    jokes = []
    current_lines = None

    with open(path, encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.rstrip("\n")
            match = LINE_RE.match(line)
            if match:
                if current_lines is not None:
                    jokes.append("\n".join(current_lines).strip())
                current_lines = [match.group(1)]
            elif current_lines is not None:
                current_lines.append(line)

    if current_lines is not None:
        jokes.append("\n".join(current_lines).strip())

    # Collapse runs of blank continuation lines down to a single paragraph break.
    cleaned = []
    for joke in jokes:
        joke = re.sub(r"\n{2,}", "\n\n", joke).strip()
        joke = repair_mojibake(joke)
        if joke:
            cleaned.append(joke)
    return cleaned


class Command(BaseCommand):
    help = "Seed Joke rows from jokes.txt (idempotent - skips content that's already in the database)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            default=str(Path(settings.BASE_DIR) / "jokes.txt"),
            help="Path to the jokes.txt-formatted file (default: jokes.txt at project root).",
        )
        parser.add_argument(
            "--username",
            default="dadjokes_bot",
            help="Username to attribute seeded jokes to. Created automatically if it doesn't exist (default: dadjokes_bot).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report counts without writing to the database.",
        )

    def handle(self, *args, **options):
        path = Path(options["file"])
        if not path.exists():
            raise CommandError(f"File not found: {path}")

        parsed = parse_jokes(path)
        if not parsed:
            self.stdout.write(self.style.WARNING("No jokes parsed from file - nothing to do."))
            return

        existing = set(Joke.objects.values_list("content", flat=True))
        to_create = [text for text in parsed if text not in existing]
        skipped = len(parsed) - len(to_create)

        self.stdout.write(f"Parsed {len(parsed)} jokes from {path}")
        self.stdout.write(f"Already in database (skipped): {skipped}")
        self.stdout.write(f"New jokes to create: {len(to_create)}")

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("--dry-run set, not writing anything."))
            return

        if not to_create:
            self.stdout.write(self.style.SUCCESS("Nothing new to seed."))
            return

        author, created = User.objects.get_or_create(
            username=options["username"],
            defaults={"email": f"{options['username']}@example.com"},
        )
        if created:
            author.set_unusable_password()
            author.save()
            self.stdout.write(f"Created bot user '{author.username}' to own seeded jokes.")

        # Pick a random song per joke instead of leaving bg_music unset (which
        # defaults every seeded joke to "Original Sound"). Falls back to no
        # music only if the library is empty.
        music_ids = list(JokeMusic.objects.values_list("id", flat=True))
        if not music_ids:
            self.stdout.write(self.style.WARNING("No JokeMusic rows in the database - seeded jokes will have no background music."))

        objs = [
            Joke(
                joke_by=author,
                content=text,
                bg_color=random.choice(BG_COLORS),
                text_color=random.choice(TEXT_COLORS),
                font_type=random.choice(FONT_TYPES),
                bg_music_id=random.choice(music_ids) if music_ids else None,
            )
            for text in to_create
        ]
        Joke.objects.bulk_create(objs, batch_size=200)

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(objs)} new jokes as @{author.username}."))
