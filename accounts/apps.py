from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    # Historical app_label. The app (and its package) used to be called
    # "yuzzaz" - every existing migration, the AUTH_USER_MODEL setting, and
    # the actual "yuzzaz_customuser" database table all key off this label.
    # Renaming the package to "accounts" without pinning the label would make
    # Django treat this as a brand new app with no migration history and try
    # to create a second, empty table. Keeping label='yuzzaz' here means the
    # rename is purely cosmetic - no data migration required.
    label = 'yuzzaz'

    def ready(self):
        from django.contrib.auth.signals import user_logged_out
        from django.contrib import messages

        def _on_logout(sender, request, user, **kwargs):
            messages.success(request, "You have successfully logged out.")

        user_logged_out.connect(_on_logout, dispatch_uid='accounts_logout_message')
