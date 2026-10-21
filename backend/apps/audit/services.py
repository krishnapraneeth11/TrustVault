

from .models import AuditEvent


def record_audit_event(
    *,
    request,
    action,
    outcome,
    document_id="",
    details=None,
):
    """
    Record a TrustVault security event.

    Do not include document contents, passwords, session tokens,
    or other secrets in the details field.
    """
    user = getattr(request, "user", None)

    if not user or not user.is_authenticated:
        user = None
        actor_username = "Anonymous"
    else:
        actor_username = user.get_username()

    remote_ip = request.META.get("REMOTE_ADDR")

    # Only accept a valid IP address from the direct connection.
    from django.core.exceptions import ValidationError
    from django.core.validators import validate_ipv46_address

    try:
        if remote_ip:
            validate_ipv46_address(remote_ip)
        else:
            remote_ip = None
    except ValidationError:
        remote_ip = None

    return AuditEvent.objects.create(
        actor=user,
        actor_username=actor_username,
        action=action,
        outcome=outcome,
        document_id=str(document_id or ""),
        details=details or {},
        ip_address=remote_ip,
    )