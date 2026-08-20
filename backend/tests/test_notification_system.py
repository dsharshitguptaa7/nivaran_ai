"""
Automated Test Suite for Centralized Notification System in NIVARAN-AI.
Verifies CRUD operations, unread count, security isolation, and workflow triggers.
"""

import sys
from pathlib import Path
from uuid import uuid4

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.notification import Notification, NotificationType
from app.models.grievance import Grievance, GrievanceStatus
from app.services import notification_service
from app.core.security import hash_password


def run_notification_tests():
    db = next(get_db())
    print("=" * 75)
    print("NIVARAN-AI: NOTIFICATION SYSTEM AUTOMATED TEST SUITE")
    print("=" * 75)

    created_user_ids = []
    created_grievance_ids = []

    try:
        # -------------------------------------------------------------
        # SETUP TEST USERS & GRIEVANCE
        # -------------------------------------------------------------
        test_applicant = User(
            id=uuid4(),
            email=f"notif_applicant_{uuid4().hex[:6]}@test.com",
            password_hash=hash_password("TestPass123!"),
            full_name="Notif Test Applicant",
            role=UserRole.APPLICANT,
            is_active=True,
        )
        test_authority = User(
            id=uuid4(),
            email=f"notif_authority_{uuid4().hex[:6]}@test.com",
            password_hash=hash_password("TestPass123!"),
            full_name="Notif Test Authority",
            role=UserRole.ASSISTANT_DEAN,
            is_active=True,
        )
        test_other_user = User(
            id=uuid4(),
            email=f"notif_other_{uuid4().hex[:6]}@test.com",
            password_hash=hash_password("TestPass123!"),
            full_name="Notif Other User",
            role=UserRole.APPLICANT,
            is_active=True,
        )
        db.add_all([test_applicant, test_authority, test_other_user])
        db.flush()
        created_user_ids.extend([test_applicant.id, test_authority.id, test_other_user.id])

        test_grievance = Grievance(
            id=uuid4(),
            grievance_id=f"GRV-TEST-{uuid4().hex[:6].upper()}",
            applicant_id=test_applicant.id,
            title="Notification Verification Fellowship",
            description="Testing automated notification pipeline.",
            status=GrievanceStatus.SUBMITTED,
        )
        db.add(test_grievance)
        db.flush()
        created_grievance_ids.append(test_grievance.id)

        print(f"[SETUP] Created Applicant: {test_applicant.full_name}")
        print(f"[SETUP] Created Authority: {test_authority.full_name}")
        print(f"[SETUP] Created Grievance: {test_grievance.grievance_id}")

        # -------------------------------------------------------------
        # TEST 1: NOTIFICATION CREATION & UNREAD COUNT
        # -------------------------------------------------------------
        print("\n--- TEST 1: Notification Creation & Unread Count ---")
        n1 = notification_service.create_notification(
            db=db,
            user_id=test_applicant.id,
            notification_type=NotificationType.GRIEVANCE_SUBMITTED,
            title="Grievance Submitted",
            message=f"Grievance {test_grievance.grievance_id} submitted successfully.",
            grievance_id=test_grievance.id,
        )
        n2 = notification_service.create_notification(
            db=db,
            user_id=test_applicant.id,
            notification_type=NotificationType.DOCUMENT_REQUESTED,
            title="Document Required",
            message="Please upload your identity card.",
            grievance_id=test_grievance.id,
        )
        n3 = notification_service.create_notification(
            db=db,
            user_id=test_applicant.id,
            notification_type=NotificationType.DOCUMENT_APPROVED,
            title="Document Approved",
            message="Your document has been verified.",
            grievance_id=test_grievance.id,
        )
        db.commit()

        unread_count = notification_service.get_unread_notification_count(db, test_applicant.id)
        assert unread_count == 3, f"Expected 3 unread notifications, got {unread_count}"
        print(f"  -> Initial Unread Count: {unread_count} [OK]")

        all_notifs = notification_service.get_user_notifications(db, test_applicant.id, unread_only=False)
        assert len(all_notifs) == 3, f"Expected 3 notifications, got {len(all_notifs)}"
        assert all_notifs[0].grievance_tracking_id == test_grievance.grievance_id
        print(f"  -> Notifications serialized with tracking ID: {all_notifs[0].grievance_tracking_id} [OK]")

        # -------------------------------------------------------------
        # TEST 2: MARK SINGLE AND ALL NOTIFICATIONS AS READ
        # -------------------------------------------------------------
        print("\n--- TEST 2: Mark Read Operations ---")
        marked_single = notification_service.mark_notification_as_read(db, n1.id, test_applicant.id)
        assert marked_single is not None and marked_single.is_read is True
        assert marked_single.read_at is not None
        print("  -> Single notification marked as read [OK]")

        count_after_single = notification_service.get_unread_notification_count(db, test_applicant.id)
        assert count_after_single == 2, f"Expected 2 unread, got {count_after_single}"
        print(f"  -> Unread count after single read: {count_after_single} [OK]")

        unread_list = notification_service.get_user_notifications(db, test_applicant.id, unread_only=True)
        assert len(unread_list) == 2, f"Expected 2 unread items in list, got {len(unread_list)}"

        updated_count = notification_service.mark_all_notifications_as_read(db, test_applicant.id)
        assert updated_count == 2, f"Expected 2 notifications marked read, got {updated_count}"
        count_after_all = notification_service.get_unread_notification_count(db, test_applicant.id)
        assert count_after_all == 0, f"Expected 0 unread, got {count_after_all}"
        print(f"  -> Mark all as read completed successfully: {count_after_all} unread remaining [OK]")

        # -------------------------------------------------------------
        # TEST 3: SECURITY ISOLATION
        # -------------------------------------------------------------
        print("\n--- TEST 3: Security & Data Isolation ---")
        # User Other tries to mark User Applicant's notification as read
        cross_user_res = notification_service.mark_notification_as_read(db, n2.id, test_other_user.id)
        assert cross_user_res is None, "Cross-user notification modification must be blocked"
        print("  -> Cross-user mark-read correctly blocked [OK]")

        # User Other tries to delete User Applicant's notification
        cross_user_del = notification_service.delete_notification(db, n2.id, test_other_user.id)
        assert cross_user_del is False, "Cross-user notification deletion must be blocked"
        print("  -> Cross-user deletion correctly blocked [OK]")

        # User Other's notification list is empty
        other_notifs = notification_service.get_user_notifications(db, test_other_user.id)
        assert len(other_notifs) == 0, "User Other must see only their own notifications"
        print("  -> User notification isolation verified [OK]")

        # -------------------------------------------------------------
        # TEST 4: DELETION
        # -------------------------------------------------------------
        print("\n--- TEST 4: Notification Deletion ---")
        delete_success = notification_service.delete_notification(db, n3.id, test_applicant.id)
        assert delete_success is True, "Owner deletion should succeed"
        remaining = notification_service.get_user_notifications(db, test_applicant.id)
        assert len(remaining) == 2, f"Expected 2 remaining notifications, got {len(remaining)}"
        print(f"  -> Notification deleted cleanly, {len(remaining)} remaining [OK]")

        # -------------------------------------------------------------
        # TEST 5: ALL NOTIFICATION TYPES SUPPORT
        # -------------------------------------------------------------
        print("\n--- TEST 5: All Notification Types Coverage ---")
        all_types = [
            NotificationType.GRIEVANCE_SUBMITTED,
            NotificationType.GRIEVANCE_ASSIGNED,
            NotificationType.GRIEVANCE_FORWARDED,
            NotificationType.GRIEVANCE_ESCALATED,
            NotificationType.GRIEVANCE_STATUS_CHANGED,
            NotificationType.DOCUMENT_REQUESTED,
            NotificationType.DOCUMENT_UPLOADED,
            NotificationType.DOCUMENT_APPROVED,
            NotificationType.DOCUMENT_REJECTED,
            NotificationType.REMINDER,
            NotificationType.GRIEVANCE_RESOLVED,
            NotificationType.GRIEVANCE_CLOSED,
            NotificationType.GRIEVANCE_REOPENED,
            NotificationType.SYSTEM,
        ]

        for ntype in all_types:
            notif = notification_service.create_notification(
                db=db,
                user_id=test_authority.id,
                notification_type=ntype,
                title=f"Test {ntype.value}",
                message=f"Message for {ntype.value}",
                grievance_id=test_grievance.id,
            )
            assert notif.id is not None
        db.commit()

        authority_unread = notification_service.get_unread_notification_count(db, test_authority.id)
        assert authority_unread == len(all_types), f"Expected {len(all_types)}, got {authority_unread}"
        print(f"  -> Successfully created and verified all {len(all_types)} notification types! [OK]")

        print("\n" + "=" * 75)
        print("ALL NOTIFICATION SYSTEM AUTOMATED TESTS PASSED (100%)!")
        print("=" * 75)

    finally:
        # CLEANUP
        print("\n[CLEANUP] Cleaning temporary test records...")
        if created_user_ids:
            db.execute(
                select(Notification).where(Notification.user_id.in_(created_user_ids))
            )
            # Delete notifications
            from sqlalchemy import delete
            db.execute(delete(Notification).where(Notification.user_id.in_(created_user_ids)))
            db.execute(delete(Grievance).where(Grievance.id.in_(created_grievance_ids)))
            db.execute(delete(User).where(User.id.in_(created_user_ids)))
            db.commit()
        print("[CLEANUP] Cleanup completed successfully.")


if __name__ == "__main__":
    run_notification_tests()
