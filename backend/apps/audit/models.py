import uuid

from django.conf import settings
from django.db import models


class AuditEvent(models.Model):
    class Outcome(models.TextChoices):
        SUCCESS = "SUCCESS", "Success"
        DENIED = "DENIED", "Denied"
        FAILURE = "FAILURE", "Failure"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    previous_hash = models.CharField(
        max_length=64,
        blank=True,
        default="",
        editable=False,
    )

    event_hash = models.CharField(
        max_length=64,
        blank=True,
        default="",
        editable=False,
        db_index=True,
    )
    chain_sequence = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        unique=True,
        editable=False,
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )

    actor_username = models.CharField(
        max_length=150,
        blank=True,
        default="",
    )

    action = models.CharField(max_length=50, db_index=True)

    outcome = models.CharField(
        max_length=10,
        choices=Outcome.choices,
        db_index=True,
    )

    document_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        db_index=True,
    )

    details = models.JSONField(default=dict, blank=True)

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Audit event"
        verbose_name_plural = "Audit events"

    def __str__(self):
        return (
            f"{self.created_at} | {self.action} | "
            f"{self.outcome} | {self.actor_username or 'Anonymous'}"
        )
class AuditChainState(models.Model):
    """
    Stores the current head of the audit hash chain.

    Keep one state row with pk=1. Audit writes must update this
    row transactionally before reading its current head.
    """

    last_hash = models.CharField(
        max_length=64,
        blank=True,
        default="",
    )

    last_sequence = models.PositiveBigIntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Audit chain state"
        verbose_name_plural = "Audit chain state"

    def __str__(self):
        return (
            f"Audit chain head: sequence={self.last_sequence}"
        )