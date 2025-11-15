from django import forms
from .models import Joke


class JokeForm(forms.ModelForm):
    class Meta:
        model = Joke
        fields = ['content', 'description', 'bg_color', 'text_color', 'font_type', 'bg_music']
        widgets = {
            'content': forms.Textarea(attrs={
                'rows': 4, 'cols': 40, 'placeholder': 'Enter your joke here...',
                'class': 'w-full rounded-lg bg-gray-700 border border-gray-600 py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none'
            }),
            'description': forms.Textarea(attrs={
                'rows': 2, 'cols': 40, 'placeholder': 'Optional description...',
                'class': 'w-full rounded-lg bg-gray-700 border border-gray-600 py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none'
            }),
            'bg_color': forms.TextInput(attrs={
                'type': 'color',
                'class': 'w-full h-10 rounded-lg border border-gray-600 p-1 cursor-pointer'
            }),
            'text_color': forms.TextInput(attrs={
                'type': 'color',
                'class': 'w-full h-10 rounded-lg border border-gray-600 p-1 cursor-pointer'
            }),
            'font_type': forms.Select(attrs={
                'class': 'w-full rounded-lg bg-gray-700 border border-gray-600 py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent'
                
            }),
            'bg_music': forms.TextInput(attrs={
                'placeholder': 'Make em dance',
                'class': 'w-full rounded-lg bg-gray-700 border border-gray-600 py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent'
            }),
        }
