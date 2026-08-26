from django import forms
from .models import Joke


class JokeForm(forms.ModelForm):
    class Meta:
        model = Joke
        fields = ['content', 'description', 'bg_color', 'text_color', 'font_type', 'bg_music']
        widgets = {
            'content': forms.Textarea(attrs={
                'rows': 4, 'cols': 40, 'placeholder': 'Enter your joke here...',
                'class': 'w-full rounded-xl bg-surface border border-hairline py-2.5 px-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent placeholder-ink-faint resize-none'
            }),
            'description': forms.Textarea(attrs={
                'rows': 2, 'cols': 40, 'placeholder': 'Optional description...',
                'class': 'w-full rounded-xl bg-surface border border-hairline py-2.5 px-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent placeholder-ink-faint resize-none'
            }),
            'bg_color': forms.TextInput(attrs={
                'type': 'color',
                'class': 'w-full h-10 rounded-lg border border-hairline-strong p-1 cursor-pointer'
            }),
            'text_color': forms.TextInput(attrs={
                'type': 'color',
                'class': 'w-full h-10 rounded-lg border border-hairline-strong p-1 cursor-pointer'
            }),
            'font_type': forms.Select(attrs={
                'class': 'w-full rounded-xl bg-surface border border-hairline py-2.5 px-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent'
            }),
            # Rendered as an async search combobox (see joke.html), not a
            # native <select> - this hidden input just carries the chosen
            # JokeMusic id as the actual form value.
            'bg_music': forms.HiddenInput(),

        }


class JokeEditForm(forms.ModelForm):
    class Meta:
        model = Joke
        fields = ['content', 'description', 'bg_color', 'text_color', 'font_type', 'bg_music']
        widgets = {
            # Rendered as an async search combobox (see post_modal.html),
            # same as JokeForm - this hidden input just carries the chosen
            # JokeMusic id as the actual form value.
            'bg_music': forms.HiddenInput(),
        }