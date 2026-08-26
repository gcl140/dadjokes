from django.core.management.base import BaseCommand

from content.models import Joke, JokeComment

# Telltale byte sequences left behind when UTF-8 text gets decoded as
# Latin-1 somewhere upstream (curly quotes/apostrophes/ellipses turn into
# "â€™", "â€œ", "â¦", etc). Only attempt a repair on strings that actually
# look like this, rather than round-tripping everything blind.
MOJIBAKE_MARKERS = ("â€", "â¦", "Â", "â\x80", "Ã¢")


def repair_mojibake(text):
    if not text or not any(marker in text for marker in MOJIBAKE_MARKERS):
        return None

    try:
        fixed = text.encode("latin1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return None

    return fixed if fixed != text else None


class Command(BaseCommand):
    help = (
        "One-off repair for existing Joke/JokeComment text that was imported "
        "with mojibake-corrupted punctuation (curly quotes/apostrophes/ellipses "
        "showing up as e.g. 'donâ\\x80\\x99t'). Safe to re-run - only touches "
        "rows that still look corrupted."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing to the database.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        fixed_count = 0

        for joke in Joke.objects.all():
            update_fields = []

            new_content = repair_mojibake(joke.content)
            if new_content is not None:
                if not dry_run:
                    joke.content = new_content
                update_fields.append("content")

            new_description = repair_mojibake(joke.description)
            if new_description is not None:
                if not dry_run:
                    joke.description = new_description
                update_fields.append("description")

            if update_fields:
                fixed_count += 1
                self.stdout.write(f"Joke {joke.id}: fixing {', '.join(update_fields)}")
                if not dry_run:
                    joke.save(update_fields=update_fields)

        comment_fixed_count = 0
        for comment in JokeComment.objects.all():
            new_text = repair_mojibake(comment.comment_text)
            if new_text is not None:
                comment_fixed_count += 1
                self.stdout.write(f"Comment {comment.id}: fixing comment_text")
                if not dry_run:
                    comment.comment_text = new_text
                    comment.save(update_fields=["comment_text"])

        verb = "Would fix" if dry_run else "Fixed"
        self.stdout.write(self.style.SUCCESS(
            f"{verb} {fixed_count} joke(s) and {comment_fixed_count} comment(s)."
        ))
