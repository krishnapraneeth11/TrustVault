import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = "Create a one-time TrustVault deployment administrator."

    def handle(self, *args, **options):
        enabled = os.environ.get("BOOTSTRAP_ADMIN_ENABLED", "").strip().lower()

        if enabled != "true":
            raise CommandError(
                "Administrator bootstrap is disabled. "
                "Set BOOTSTRAP_ADMIN_ENABLED=true temporarily "
                "to authorize this operation."
            )

        username = os.environ.get("BOOTSTRAP_ADMIN_USERNAME", "").strip()

        email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()

        password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")

        if not username or not email or not password:
            raise CommandError(
                "Set BOOTSTRAP_ADMIN_USERNAME, "
                "BOOTSTRAP_ADMIN_EMAIL, and "
                "BOOTSTRAP_ADMIN_PASSWORD."
            )

        if len(password) < 12:
            raise CommandError(
                "Use an administrator password of at least 12 characters."
            )

        User = get_user_model()

        with transaction.atomic():
            if User.objects.filter(username=username).exists():
                raise CommandError(
                    "This username already exists. "
                    "No account or password was changed."
                )

            if User.objects.filter(email=email).exists():
                raise CommandError(
                    "This email already belongs to an account. "
                    "No account was created."
                )

            user = User(
                username=username,
                email=email,
                role=User.Role.ADMIN,
                is_staff=True,
                is_superuser=True,
                is_active=True,
                must_change_password=True,
            )

            user.set_password(password)
            user.save()

        self.stdout.write(
            self.style.SUCCESS(f"Administrator account '{username}' was created.")
        )
