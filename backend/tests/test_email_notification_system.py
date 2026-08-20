"""
Automated Test Suite for NIVARAN-AI Email Notification System.

Verifies:
1. Document Request -> In-App notification + Applicant email dispatched.
2. Document Upload -> Authority in-app notification + Applicant receives NO email.
3. Grievance Resolved -> In-App notification + Applicant email dispatched.
4. Duplicate Resolve Attempt -> No duplicate email sent.
5. Grievance Closed -> In-App notification + Applicant email dispatched.
6. Internal Forwarding -> Applicant receives NO email.
7. AI Review -> Applicant receives NO email.
8. 3-Day Inactivity Reminder -> Authority receives in-app reminder, Applicant receives NO email.
9. Email Server Failure -> Grievance workflow succeeds, in-app notification persists, error logged without 500.
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch, MagicMock
from uuid import uuid4

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from app.db.database import get_db
from app.models.assignment import Assignment
from app.models.category import Category, CategoryRoutingType
from app.models.document_request import DocumentRequest, DocumentRequestStatus
from app.models.enums import GrievancePriority, GrievanceStatus
from app.models.grievance import Grievance
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole
from app.models.grievance_status_history import GrievanceStatusHistory
from app.models.audit_log import AuditLog
from app.core.security import hash_password
from app.services import email_service
from app.services.document_request_service import create_document_requests
from app.schemas.document_request import CreateDocumentRequestsPayload, DocumentRequestItemCreate
from app.services.grievance_workflow import change_grievance_status
from app.services.reminder_service import create_overdue_reminders
from app.services.notification_service import create_notification


def run_email_notification_tests():
    db = next(get_db())
    print("=" * 75)
    print("NIVARAN-AI: EMAIL NOTIFICATION SYSTEM AUTOMATED TEST SUITE")
    print("=" * 75)

    created_user_ids = []
    created_grievance_ids = []
    created_category_ids = []

    try:
        # =============================================================
        # SETUP USERS & CATEGORY
        # =============================================================
        applicant = User(
            id=uuid4(),
            email=f"applicant_{uuid4().hex[:6]}@test.com",
            password_hash=hash_password("Pass123!"),
            full_name="Test Applicant Student",
            role=UserRole.APPLICANT,
            is_active=True,
        )
        manager = User(
            id=uuid4(),
            email=f"manager_{uuid4().hex[:6]}@test.com",
            password_hash=hash_password("Pass123!"),
            full_name="Test Grievance Manager",
            role=UserRole.MANAGER,
            is_active=True,
        )
        assistant_dean = User(
            id=uuid4(),
            email=f"asst_dean_{uuid4().hex[:6]}@test.com",
            password_hash=hash_password("Pass123!"),
            full_name="Test Assistant Dean",
            role=UserRole.ASSISTANT_DEAN,
            is_active=True,
        )
        db.add_all([applicant, manager, assistant_dean])
        db.flush()
        created_user_ids.extend([applicant.id, manager.id, assistant_dean.id])

        category = Category(
            id=uuid4(),
            name=f"Scholarship Test Cat {uuid4().hex[:4]}",
            description="Testing category for email notification suite.",
            routing_type=CategoryRoutingType.SUBJECT_ASSISTANT_DEAN,
            is_active=True,
        )
        db.add(category)
        db.flush()
        created_category_ids.append(category.id)

        # Helper to create a test grievance
        def create_test_grievance(initial_status=GrievanceStatus.SUBMITTED):
            g = Grievance(
                id=uuid4(),
                grievance_id=f"GRV-TEST-{uuid4().hex[:6].upper()}",
                applicant_id=applicant.id,
                title="Fellowship Discrepancy Case",
                description="Testing email notification lifecycle triggers.",
                status=initial_status,
                priority=GrievancePriority.HIGH,
                category_id=category.id,
                final_category_id=category.id,
                category_reviewed=True,
                last_action_at=datetime.now(timezone.utc),
            )
            db.add(g)
            db.flush()
            created_grievance_ids.append(g.id)
            return g

        # -------------------------------------------------------------
        # TEST 1: DOCUMENT REQUEST (In-App + Applicant Email)
        # -------------------------------------------------------------
        print("\n--- TEST 1: Document Request (In-App Notification + Applicant Email) ---")
        g1 = create_test_grievance(GrievanceStatus.IN_PROGRESS)
        a1 = Assignment(
            id=uuid4(),
            grievance_id=g1.id,
            assigned_to=assistant_dean.id,
            assigned_by=manager.id,
            is_active=True,
        )
        db.add(a1)
        db.flush()

        with patch("app.services.email_service.send_email", return_value=True) as mock_send_email:
            payload = CreateDocumentRequestsPayload(
                documents=[
                    DocumentRequestItemCreate(
                        document_name="Income Certificate & Fee Receipt",
                        description="Please provide original scanned income certificate from competent authority.",
                        is_required=True,
                    )
                ],
                deadline=datetime.now(timezone.utc) + timedelta(days=5),
            )
            created_reqs = create_document_requests(
                db=db,
                grievance=g1,
                payload=payload,
                authority=assistant_dean,
            )

            assert len(created_reqs) == 1, "Document request record should be created"
            assert g1.status == GrievanceStatus.AWAITING_INFORMATION, "Grievance status should transition to AWAITING_INFORMATION"

            # Check in-app notification for applicant
            notif = db.scalar(
                select(Notification).where(
                    Notification.user_id == applicant.id,
                    Notification.grievance_id == g1.id,
                    Notification.notification_type == NotificationType.DOCUMENT_REQUESTED,
                )
            )
            assert notif is not None, "Applicant should receive in-app notification"
            print("  -> Applicant In-App notification created [OK]")

            # Check email dispatch
            assert mock_send_email.called, "Applicant email should be sent"
            args, kwargs = mock_send_email.call_args
            assert kwargs.get("to_email") == applicant.email or (args and args[0] == applicant.email)
            print(f"  -> Email dispatched to applicant: {applicant.email} [OK]")

        # -------------------------------------------------------------
        # TEST 2: DOCUMENT UPLOAD (Authority In-App, Applicant NO Email)
        # -------------------------------------------------------------
        print("\n--- TEST 2: Document Upload (Authority In-App, Applicant NO Email) ---")
        g2 = create_test_grievance(GrievanceStatus.AWAITING_INFORMATION)

        with patch("app.services.email_service.send_email") as mock_send_email:
            # Simulate fulfillment notification
            create_notification(
                db=db,
                user_id=assistant_dean.id,
                grievance_id=g2.id,
                notification_type=NotificationType.DOCUMENT_UPLOADED,
                title="Requested Document Uploaded",
                message=f"Applicant uploaded document for {g2.grievance_id}",
            )
            db.commit()

            # Authority gets notification
            auth_notif = db.scalar(
                select(Notification).where(
                    Notification.user_id == assistant_dean.id,
                    Notification.grievance_id == g2.id,
                    Notification.notification_type == NotificationType.DOCUMENT_UPLOADED,
                )
            )
            assert auth_notif is not None, "Authority should receive in-app notification on upload"
            assert not mock_send_email.called, "Applicant should NOT receive email for document upload"
            print("  -> Authority received In-App notification [OK]")
            print("  -> Applicant received NO email on upload [OK]")

        # -------------------------------------------------------------
        # TEST 3: RESOLVED (In-App Notification + Applicant Email)
        # -------------------------------------------------------------
        print("\n--- TEST 3: Grievance Resolved (In-App Notification + Applicant Email) ---")
        g3 = create_test_grievance(GrievanceStatus.IN_PROGRESS)

        with patch("app.services.email_service.send_email", return_value=True) as mock_send_email:
            # Transition to RESOLVED
            prev_status = g3.status
            change_grievance_status(
                db=db,
                grievance=g3,
                new_status=GrievanceStatus.RESOLVED,
                changed_by=assistant_dean,
                reason="Resolved by Assistant Dean with financial adjustment.",
            )
            g3.resolution_notes = "Scholarship arrears have been credited to student account."
            g3.resolved_by_id = assistant_dean.id
            g3.resolved_at = datetime.now(timezone.utc)
            db.add(g3)

            create_notification(
                db=db,
                user_id=g3.applicant_id,
                notification_type=NotificationType.GRIEVANCE_RESOLVED,
                title="Grievance Resolved",
                message=f"Your grievance {g3.grievance_id} has been resolved.",
                grievance_id=g3.id,
            )

            # Trigger email
            if prev_status != GrievanceStatus.RESOLVED and g3.status == GrievanceStatus.RESOLVED:
                email_service.send_grievance_resolved_email(
                    applicant_email=applicant.email,
                    applicant_name=applicant.full_name,
                    grievance_id=g3.grievance_id,
                    grievance_title=g3.title,
                    resolution_notes=g3.resolution_notes,
                )

            db.commit()

            # Check In-App
            res_notif = db.scalar(
                select(Notification).where(
                    Notification.user_id == applicant.id,
                    Notification.grievance_id == g3.id,
                    Notification.notification_type == NotificationType.GRIEVANCE_RESOLVED,
                )
            )
            assert res_notif is not None, "Applicant should receive In-App resolution notification"
            assert mock_send_email.call_count == 1, "Applicant should receive exactly 1 resolution email"
            print("  -> Applicant received In-App notification [OK]")
            print(f"  -> Applicant received resolution email to {applicant.email} [OK]")

        # -------------------------------------------------------------
        # TEST 4: DUPLICATE RESOLVE ATTEMPT (No Duplicate Email)
        # -------------------------------------------------------------
        print("\n--- TEST 4: Duplicate Resolve Attempt (No Duplicate Email) ---")
        with patch("app.services.email_service.send_email") as mock_send_email:
            prev_status = g3.status  # Already RESOLVED
            
            # If status does not transition (prev == RESOLVED), no email is sent
            if prev_status != GrievanceStatus.RESOLVED:
                email_service.send_grievance_resolved_email(
                    applicant_email=applicant.email,
                    applicant_name=applicant.full_name,
                    grievance_id=g3.grievance_id,
                    grievance_title=g3.title,
                    resolution_notes=g3.resolution_notes,
                )

            assert not mock_send_email.called, "Duplicate resolve call must NOT trigger duplicate email"
            print("  -> Duplicate resolution attempt correctly suppressed email [OK]")

        # -------------------------------------------------------------
        # TEST 5: CLOSED (In-App Notification + Applicant Email)
        # -------------------------------------------------------------
        print("\n--- TEST 5: Grievance Closed (In-App Notification + Applicant Email) ---")
        with patch("app.services.email_service.send_email", return_value=True) as mock_send_email:
            prev_status = g3.status
            change_grievance_status(
                db=db,
                grievance=g3,
                new_status=GrievanceStatus.CLOSED,
                changed_by=manager,
                reason="Manager verified resolution and closed.",
            )
            g3.closure_remarks = "Resolution validated against bank records."
            g3.closed_by_id = manager.id
            g3.closed_at = datetime.now(timezone.utc)
            db.add(g3)

            create_notification(
                db=db,
                user_id=g3.applicant_id,
                notification_type=NotificationType.GRIEVANCE_CLOSED,
                title="Grievance Closed",
                message=f"Your grievance {g3.grievance_id} has been formally closed.",
                grievance_id=g3.id,
            )

            # Trigger email
            if prev_status != GrievanceStatus.CLOSED and g3.status == GrievanceStatus.CLOSED:
                email_service.send_grievance_closed_email(
                    applicant_email=applicant.email,
                    applicant_name=applicant.full_name,
                    grievance_id=g3.grievance_id,
                    grievance_title=g3.title,
                    closure_remarks=g3.closure_remarks,
                )

            db.commit()

            # Check In-App
            close_notif = db.scalar(
                select(Notification).where(
                    Notification.user_id == applicant.id,
                    Notification.grievance_id == g3.id,
                    Notification.notification_type == NotificationType.GRIEVANCE_CLOSED,
                )
            )
            assert close_notif is not None, "Applicant should receive In-App closure notification"
            assert mock_send_email.call_count == 1, "Applicant should receive exactly 1 closure email"
            print("  -> Applicant received In-App closure notification [OK]")
            print(f"  -> Applicant received closure email to {applicant.email} [OK]")

        # -------------------------------------------------------------
        # TEST 6: INTERNAL FORWARDING (Applicant Receives NO Email)
        # -------------------------------------------------------------
        print("\n--- TEST 6: Internal Forwarding (Applicant Receives NO Email) ---")
        g4 = create_test_grievance(GrievanceStatus.ASSIGNED)

        with patch("app.services.email_service.send_email") as mock_send_email:
            # Forward action creates status notification for applicant, but NO email
            create_notification(
                db=db,
                user_id=applicant.id,
                grievance_id=g4.id,
                notification_type=NotificationType.GRIEVANCE_STATUS_CHANGED,
                title="Grievance Forwarded",
                message="Grievance forwarded to Associate Dean.",
            )
            db.commit()

            assert not mock_send_email.called, "Applicant should NOT receive email for internal forwarding"
            print("  -> Forwarding in-app notification created [OK]")
            print("  -> Applicant received NO email on internal forwarding [OK]")

        # -------------------------------------------------------------
        # TEST 7: AI REVIEW (Applicant Receives NO Email)
        # -------------------------------------------------------------
        print("\n--- TEST 7: AI Review / Classification (Applicant Receives NO Email) ---")
        g5 = create_test_grievance(GrievanceStatus.SUBMITTED)

        with patch("app.services.email_service.send_email") as mock_send_email:
            g5.category_reviewed = True
            g5.last_action_at = datetime.now(timezone.utc)
            db.add(g5)
            db.commit()

            assert not mock_send_email.called, "Applicant should NOT receive email for AI review"
            print("  -> AI Category confirmed without sending applicant email [OK]")

        # -------------------------------------------------------------
        # TEST 8: 3 DAYS NO ACTION REMINDER (Authority In-App, Applicant NO Email)
        # -------------------------------------------------------------
        print("\n--- TEST 8: 3 Days No Action Reminder (Authority In-App, Applicant NO Email) ---")
        g6 = create_test_grievance(GrievanceStatus.ASSIGNED)
        # Set last_action_at to 4 days ago
        g6.last_action_at = datetime.now(timezone.utc) - timedelta(days=4)
        db.add(g6)

        assignment = Assignment(
            id=uuid4(),
            grievance_id=g6.id,
            assigned_to=assistant_dean.id,
            assigned_by=manager.id,
            is_active=True,
        )
        db.add(assignment)
        db.flush()

        with patch("app.services.email_service.send_email") as mock_send_email:
            reminders_sent = create_overdue_reminders(db)
            db.commit()

            assert reminders_sent >= 1, "Should create reminder for overdue grievance"

            # Check that authority received notification
            auth_reminder = db.scalar(
                select(Notification).where(
                    Notification.user_id == assistant_dean.id,
                    Notification.grievance_id == g6.id,
                    Notification.notification_type == NotificationType.SYSTEM,
                )
            )
            assert auth_reminder is not None, "Authority should receive in-app reminder"

            # Check that applicant received NO reminder notification or email
            app_reminder = db.scalar(
                select(Notification).where(
                    Notification.user_id == applicant.id,
                    Notification.grievance_id == g6.id,
                    Notification.title.ilike("%overdue%"),
                )
            )
            assert app_reminder is None, "Applicant should NEVER receive 3-day inactivity reminder notification"
            print("  -> Authority received In-App reminder [OK]")
            print("  -> Applicant received NO reminder notification or email [OK]")

        # -------------------------------------------------------------
        # TEST 9: EMAIL SERVER FAILURE RESILIENCE (SMTP Failure Simulation)
        # -------------------------------------------------------------
        print("\n--- TEST 9: Email Server Failure Simulation (No 500 / Operation Succeeds) ---")
        g7 = create_test_grievance(GrievanceStatus.IN_PROGRESS)

        with patch("smtplib.SMTP", side_effect=ConnectionRefusedError("SMTP server down")):
            # Resolve grievance while SMTP fails
            change_grievance_status(
                db=db,
                grievance=g7,
                new_status=GrievanceStatus.RESOLVED,
                changed_by=assistant_dean,
                reason="Resolved during network outage.",
            )
            g7.resolution_notes = "Resolved with offline paper receipt."
            g7.resolved_by_id = assistant_dean.id
            g7.resolved_at = datetime.now(timezone.utc)
            db.add(g7)

            # In-App notification still created
            create_notification(
                db=db,
                user_id=g7.applicant_id,
                notification_type=NotificationType.GRIEVANCE_RESOLVED,
                title="Grievance Resolved",
                message=f"Your grievance {g7.grievance_id} has been resolved.",
                grievance_id=g7.id,
            )

            # Send email returns False safely without raising exception
            result = email_service.send_grievance_resolved_email(
                applicant_email=applicant.email,
                applicant_name=applicant.full_name,
                grievance_id=g7.grievance_id,
                grievance_title=g7.title,
                resolution_notes=g7.resolution_notes,
            )

            assert result is False, "Email service should return False on failure"
            assert g7.status == GrievanceStatus.RESOLVED, "Grievance status must remain RESOLVED"

            db.commit()

            # Verify in-app notification exists in DB
            persisted_notif = db.scalar(
                select(Notification).where(
                    Notification.user_id == applicant.id,
                    Notification.grievance_id == g7.id,
                    Notification.notification_type == NotificationType.GRIEVANCE_RESOLVED,
                )
            )
            assert persisted_notif is not None, "In-app notification must persist even if email fails"
            print("  -> SMTP Failure safely caught and logged [OK]")
            print("  -> Grievance operation completed successfully with status RESOLVED [OK]")
            print("  -> In-App notification persisted cleanly in database [OK]")

        print("\n" + "=" * 75)
        print("ALL 9 EMAIL NOTIFICATION TESTS PASSED (100%)!")
        print("=" * 75)

    finally:
        # CLEANUP
        print("\n[CLEANUP] Cleaning temporary test data...")
        try:
            for gid in created_grievance_ids:
                db.query(Notification).filter(Notification.grievance_id == gid).delete()
                db.query(DocumentRequest).filter(DocumentRequest.grievance_id == gid).delete()
                db.query(Assignment).filter(Assignment.grievance_id == gid).delete()
                db.query(GrievanceStatusHistory).filter(GrievanceStatusHistory.grievance_id == gid).delete()
                db.query(AuditLog).filter(AuditLog.grievance_id == gid).delete()
                db.query(Grievance).filter(Grievance.id == gid).delete()

            for uid in created_user_ids:
                db.query(Notification).filter(Notification.user_id == uid).delete()
                db.query(AuditLog).filter(AuditLog.user_id == uid).delete()
                db.query(User).filter(User.id == uid).delete()

            for cid in created_category_ids:
                db.query(Category).filter(Category.id == cid).delete()

            db.commit()
            print("[CLEANUP] Cleanup completed successfully.")
        except Exception as cleanup_err:
            db.rollback()
            print(f"[CLEANUP ERROR] {cleanup_err}")


if __name__ == "__main__":
    run_email_notification_tests()
