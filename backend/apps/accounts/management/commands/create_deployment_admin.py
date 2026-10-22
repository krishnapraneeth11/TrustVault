```python
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create or promote a TrustVault deployment administrator."

    def handle(self, *args, **options):
        User = get_user_model()

        username = os.environ.get("BOOTSTRAP_ADMIN_USERNAME", "").strip()
        email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "").strip()
        password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")

        if not username or not email or not password:
            raise CommandError(
                "Set BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_EMAIL, "
                "and BOOTSTRAP_ADMIN_PASSWORD before running this command."
            )

        user = User.objects.filter(username=username).first()

        if user is None and User.objects.filter(email=email).exists():
            raise CommandError(
                "That email belongs to another account. Choose a different email."
            )

        if user is None:
            user = User(username=username, email=email)

        elif user.email != email:
            raise CommandError(
                "The existing username has a different email. "
                "No changes were made."
            )

        user.email = email
        user.role = User.Role.ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.must_change_password = True
        user.set_password(password)
        user.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"Administrator account '{username}' is ready."
            )
        )
```
