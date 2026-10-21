from dataclasses import dataclass

from .models import AuditChainState, AuditEvent
from .services import calculate_event_hash


@dataclass
class AuditVerificationResult:
    valid: bool
    checked_events: int
    errors: list[str]
    unverified_legacy_events: int = 0


def verify_audit_chain():
    """
    Verify the integrity of the sequenced audit chain.

    Historical events without sequence numbers are counted separately.
    They are not treated as verified or as proof of tampering.
    """
    events = list(
        AuditEvent.objects
        .filter(chain_sequence__isnull=False)
        .order_by("chain_sequence")
    )

    legacy_count = AuditEvent.objects.filter(
        chain_sequence__isnull=True
    ).count()

    errors = []
    checked_events = 0
    previous_hash = ""
    expected_sequence = 1

    for event in events:
        if event.chain_sequence != expected_sequence:
            errors.append(
                f"Expected sequence {expected_sequence}, "
                f"found {event.chain_sequence}."
            )

        if event.previous_hash != previous_hash:
            errors.append(
                f"Event {event.id} has an invalid previous_hash."
            )

        expected_hash = calculate_event_hash(event)

        if event.event_hash != expected_hash:
            errors.append(
                f"Event {event.id} has an invalid event_hash."
            )

        checked_events += 1
        expected_sequence = event.chain_sequence + 1
        previous_hash = event.event_hash

    state = AuditChainState.objects.filter(pk=1).first()

    if events:
        if state is None:
            errors.append("Audit chain state is missing.")
        else:
            last_event = events[-1]

            if state.last_sequence != last_event.chain_sequence:
                errors.append(
                    "Chain-head sequence does not match the last event."
                )

            if state.last_hash != last_event.event_hash:
                errors.append(
                    "Chain-head hash does not match the last event."
                )
    elif state and state.last_sequence != 0:
        errors.append(
            "Chain head references events, but no chained events exist."
        )

    return AuditVerificationResult(
        valid=not errors,
        checked_events=checked_events,
        errors=errors,
        unverified_legacy_events=legacy_count,
    )