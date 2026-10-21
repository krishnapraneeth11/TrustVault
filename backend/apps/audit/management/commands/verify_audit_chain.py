from django.core.management.base import BaseCommand
from apps.audit.verification import verify_audit_chain


class Command(BaseCommand):
    help = "Verify the integrity of the TrustVault audit chain."

    def handle(self, *args, **options):
        result = verify_audit_chain()

        if result.valid:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Audit chain verified: {result.checked_events} events checked."
                )
            )
            return

        self.stderr.write(
            self.style.ERROR(
                f"Audit chain verification failed: "
                f"{result.checked_events} events checked."
            )
        )

        for error in result.errors:
            self.stderr.write(f"- {error}")

        raise SystemExit(1)