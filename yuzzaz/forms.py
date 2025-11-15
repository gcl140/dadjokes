import re
from django import forms
from .models import CustomUser
from random_username.generate import generate_username

class UserRegistrationForm(forms.ModelForm):
    password1 = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Password'}),
        label="Password"
    )
    password2 = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Confirm Password'}),
        label="Confirm Password"
    )

    class Meta:
        model = CustomUser
        fields = ['username', 'email',]
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Username'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email'}),
        }

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Passwords do not match!")
        return password2

    # def save(self, commit=True):
    #     user = super().save(commit=False)
    #     user.set_password(self.cleaned_data["password1"])
    #     user.username = self.cleaned_data["email"]  # Set the username to email
    #     if commit:
    #         user.save()
    #     return user


    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])

        if not user.username:
            username = None
            while not username or CustomUser.objects.filter(username=username).exists():
                username = generate_username(1)[0]
            user.username = username

        if commit:
            user.save()
        return user




class CustomUserForm(forms.ModelForm):

    
    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'about', 'profile_picture']
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'input-field',
                'placeholder': 'Username'
            }),
            'about': forms.Textarea(attrs={
                'class': 'input-field',
                'placeholder': 'About You',
                'rows': 1
            }),
            'email': forms.EmailInput(attrs={
                'class': 'input-field',
                'placeholder': 'Email'
            }),
            'profile_picture': forms.FileInput(attrs={
                'class': '',
                'id': 'profile-picture-input'
            }),
        }

    def save(self, commit=True):
        user = super().save(commit=False)
        if commit:
            user.save()
        return user