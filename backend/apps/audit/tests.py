from django.test import TestCase, RequestFactory

from apps.audit.models import AuditEvent
from apps.audit.services import record_audit_event
from apps.audit.verification import verify_audit_chain


class AuditChainIntegrityTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.request = self.factory.get("/test/")
        self.request.user = None

    def create_event(self, action="TEST_EVENT"):
        return record_audit_event(
            request=self.request,
            action=action,
            outcome="SUCCESS",
            details={"test": True},
        )

    def test_single_event_verifies(self):
        self.create_event()

        result = verify_audit_chain()

        self.assertTrue(result.valid, result.errors)
        self.assertEqual(result.checked_events, 1)

    def test_modifying_event_details_is_detected(self):
        event = self.create_event()

        AuditEvent.objects.filter(pk=event.pk).update(
            details={"test": "tampered"}
        )

        result = verify_audit_chain()

        self.assertFalse(result.valid)
        self.assertTrue(
            any("invalid event_hash" in error for error in result.errors)
        )

    def test_modifying_event_hash_is_detected(self):
        event = self.create_event()

        AuditEvent.objects.filter(pk=event.pk).update(
            event_hash="0" * 64
        )

        result = verify_audit_chain()

        self.assertFalse(result.valid)
        self.assertTrue(
            any("invalid event_hash" in error for error in result.errors)
        )

    def test_deleting_middle_event_is_detected(self):
        first = self.create_event("FIRST")
        middle = self.create_event("MIDDLE")
        last = self.create_event("LAST")

        # Confirm the events are linked before simulating deletion.
        middle.refresh_from_db()
        last.refresh_from_db()
        self.assertEqual(middle.previous_hash, first.event_hash)
        self.assertEqual(last.previous_hash, middle.event_hash)

        # Simulate direct database tampering.
        AuditEvent.objects.filter(pk=middle.pk).delete()

        result = verify_audit_chain()

        self.assertFalse(result.valid)
        self.assertTrue(
            any("invalid previous_hash" in error for error in result.errors)
        )
    def test_chain_head_hash_tampering_is_detected(self):
        self.create_event()

        from apps.audit.models import AuditChainState

        AuditChainState.objects.filter(pk=1).update(
            last_hash="0" * 64
        )

        result = verify_audit_chain()

        self.assertFalse(result.valid)
        self.assertTrue(
            any(
                "Chain-head hash" in error
                for error in result.errors
            ),
            result.errors,
        )

    def test_chain_head_sequence_tampering_is_detected(self):
        self.create_event()

        from apps.audit.models import AuditChainState

        AuditChainState.objects.filter(pk=1).update(
            last_sequence=999
        )

        result = verify_audit_chain()

        self.assertFalse(result.valid)
        self.assertTrue(
            any(
                "Chain-head sequence" in error
                for error in result.errors
            ),
            result.errors,
        )
    def test_sequence_gap_is_detected(self):
        self.create_event("FIRST")
        second = self.create_event("SECOND")

        AuditEvent.objects.filter(pk=second.pk).update(
            chain_sequence=5
        )

        result = verify_audit_chain()

        self.assertFalse(result.valid)
        self.assertTrue(
            any("Expected sequence" in error for error in result.errors),
            result.errors,
        )

    def test_legacy_events_are_reported_separately(self):
        self.create_event("CHAINED")

        AuditEvent.objects.create(
            actor_username="legacy-user",
            action="LEGACY_EVENT",
            outcome="SUCCESS",
            details={"legacy": True},
        )

        result = verify_audit_chain()

        self.assertEqual(result.unverified_legacy_events, 1)
        self.assertTrue(
            result.valid,
            result.errors,
        )

    def test_missing_chain_head_is_detected(self):
        from apps.audit.models import AuditChainState

        self.create_event("CHAINED")
        AuditChainState.objects.filter(pk=1).delete()

        result = verify_audit_chain()

        self.assertFalse(result.valid)
        self.assertTrue(
            any(
                "Audit chain state is missing" in error
                for error in result.errors
            ),
            result.errors,
        )
    def test_deleting_latest_event_is_detected_by_chain_head(self):
        self.create_event("FIRST")
        latest = self.create_event("LATEST")

        # Simulate someone deleting the latest event directly.
        AuditEvent.objects.filter(pk=latest.pk).delete()

        result = verify_audit_chain()

        self.assertFalse(result.valid)
        self.assertTrue(
            any(
                "Chain-head" in error
                for error in result.errors
            ),
            result.errors,
        )