import hashlib
import json

from django.core.exceptions import ValidationError
from django.core.validators import validate_ipv46_address
from django.db import connection, transaction
from django.utils import timezone

from .models import AuditChainState, AuditEvent


def _canonical_event_payload(event):
    """
    Produce a deterministic payload for hashing an audit event.
    actor_username is a snapshot, so account deletion won't change it.
    """
    payload = {
        "id": str(event.id),
        "actor_username": event.actor_username,
        "action": event.action,
        "outcome": event.outcome,
        "document_id": event.document_id,
        "details": event.details,
        "ip_address": event.ip_address,
        "created_at": event.created_at.isoformat(),
        "previous_hash": event.previous_hash,
        "chain_sequence": event.chain_sequence,
    }

    return json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def calculate_event_hash(event):
    """Calculate the SHA-256 hash for a persisted audit event."""
    payload = _canonical_event_payload(event)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _lock_chain_state():
    """
    Acquire a write lock before reading the chain head.

    SQLite serializes database writes; PostgreSQL uses row-level
    locking through select_for_update().
    """
    if connection.vendor == "sqlite":
        AuditChainState.objects.filter(pk=1).update(
            updated_at=timezone.now()
        )

    return AuditChainState.objects.select_for_update().get(pk=1)


def record_audit_event(
    *,
    request,
    action,
    outcome,
    document_id="",
    details=None,
):
    """Append an event to the audit chain transactionally."""
    user = getattr(request, "user", None)

    if not user or not user.is_authenticated:
        user = None
        actor_username = "Anonymous"
    else:
        actor_username = user.get_username()

    remote_ip = request.META.get("REMOTE_ADDR")

    try:
        if remote_ip:
            validate_ipv46_address(remote_ip)
        else:
            remote_ip = None
    except ValidationError:
        remote_ip = None

    with transaction.atomic():
        # The singleton row is created by the data migration.
        state = _lock_chain_state()

        next_sequence = state.last_sequence + 1
        previous_hash = state.last_hash

        event = AuditEvent.objects.create(
            actor=user,
            actor_username=actor_username,
            action=action,
            outcome=outcome,
            document_id=str(document_id or ""),
            details=details or {},
            ip_address=remote_ip,
            previous_hash=previous_hash,
            chain_sequence=next_sequence,
        )

        event.event_hash = calculate_event_hash(event)
        event.save(update_fields=["event_hash"])

        state.last_sequence = next_sequence
        state.last_hash = event.event_hash
        state.save(update_fields=["last_sequence", "last_hash", "updated_at"])

        return event