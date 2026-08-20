import sys
import os
import uuid
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.models.grievance import Grievance
from app.models.assignment import Assignment
from app.models.enums import GrievanceStatus, GrievancePriority
from app.models.notification import Notification, NotificationType
from app.services.reminder_service import create_overdue_reminders, find_overdue_grievances


def run_comprehensive_reminder_test():
    print("=" * 70)
    print("NIVARAN-AI: 3-DAY NO ACTION REMINDER FEATURE TEST SUITE")
    print("=" * 70)

    db = SessionLocal()
    created_grievances = []
    created_assignments = []
    created_users = []
    created_notifications = []

    try:
        # 1. SETUP TEST USERS
        # Find or create Applicant
        applicant = db.query(User).filter(User.role == UserRole.APPLICANT).first()
        subject = db.query(Subject).first()

        # Find or create Assistant Dean (Authority)
        authority = db.query(User).filter(
            User.role == UserRole.ASSISTANT_DEAN,
            User.is_active.is_(True)
        ).first()

        print(f"\n[SETUP] Testing with Authority: {authority.full_name} ({authority.email})")

        # -------------------------------------------------------------
        # SCENARIO 1: Active Grievance inactive for 4 days (> 3 days)
        # Should generate 1 reminder notification
        # -------------------------------------------------------------
        g1 = Grievance(
            id=uuid.uuid4(),
            grievance_id=f"GRV-TEST-{uuid.uuid4().hex[:6].upper()}",
            applicant_id=applicant.id,
            subject_id=subject.id if subject else None,
            title="Overdue Test Grievance 1",
            description="Testing 3 days no action reminder on active assigned grievance",
            status=GrievanceStatus.ASSIGNED,
            priority=GrievancePriority.HIGH,
            last_action_at=datetime.now(timezone.utc) - timedelta(days=4),  # 4 DAYS AGO
            last_reminder_at=None,
        )
        db.add(g1)
        created_grievances.append(g1)

        a1 = Assignment(
            id=uuid.uuid4(),
            grievance_id=g1.id,
            assigned_to=authority.id,
            assigned_by=applicant.id,
            is_active=True,
            assigned_at=datetime.now(timezone.utc) - timedelta(days=4),
        )
        db.add(a1)
        created_assignments.append(a1)

        # -------------------------------------------------------------
        # SCENARIO 2: Grievance inactive for only 1 day (< 3 days)
        # Should NOT generate reminder
        # -------------------------------------------------------------
        g2 = Grievance(
            id=uuid.uuid4(),
            grievance_id=f"GRV-TEST-{uuid.uuid4().hex[:6].upper()}",
            applicant_id=applicant.id,
            subject_id=subject.id if subject else None,
            title="Recent Active Grievance 2",
            description="Testing recent action (less than 3 days) is ignored",
            status=GrievanceStatus.ASSIGNED,
            priority=GrievancePriority.MEDIUM,
            last_action_at=datetime.now(timezone.utc) - timedelta(days=1),  # 1 DAY AGO
            last_reminder_at=None,
        )
        db.add(g2)
        created_grievances.append(g2)

        a2 = Assignment(
            id=uuid.uuid4(),
            grievance_id=g2.id,
            assigned_to=authority.id,
            assigned_by=applicant.id,
            is_active=True,
            assigned_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db.add(a2)
        created_assignments.append(a2)

        # -------------------------------------------------------------
        # SCENARIO 3: RESOLVED Grievance inactive for 5 days (> 3 days)
        # Should NOT generate reminder (RESOLVED must be ignored)
        # -------------------------------------------------------------
        g3 = Grievance(
            id=uuid.uuid4(),
            grievance_id=f"GRV-TEST-{uuid.uuid4().hex[:6].upper()}",
            applicant_id=applicant.id,
            subject_id=subject.id if subject else None,
            title="Resolved Grievance 3",
            description="Testing that resolved grievances are ignored",
            status=GrievanceStatus.RESOLVED,
            priority=GrievancePriority.MEDIUM,
            last_action_at=datetime.now(timezone.utc) - timedelta(days=5),  # 5 DAYS AGO
            last_reminder_at=None,
        )
        db.add(g3)
        created_grievances.append(g3)

        a3 = Assignment(
            id=uuid.uuid4(),
            grievance_id=g3.id,
            assigned_to=authority.id,
            assigned_by=applicant.id,
            is_active=True,
            assigned_at=datetime.now(timezone.utc) - timedelta(days=5),
        )
        db.add(a3)
        created_assignments.append(a3)

        # -------------------------------------------------------------
        # SCENARIO 4: CLOSED Grievance inactive for 6 days (> 3 days)
        # Should NOT generate reminder (CLOSED must be ignored)
        # -------------------------------------------------------------
        g4 = Grievance(
            id=uuid.uuid4(),
            grievance_id=f"GRV-TEST-{uuid.uuid4().hex[:6].upper()}",
            applicant_id=applicant.id,
            subject_id=subject.id if subject else None,
            title="Closed Grievance 4",
            description="Testing that closed grievances are ignored",
            status=GrievanceStatus.CLOSED,
            priority=GrievancePriority.LOW,
            last_action_at=datetime.now(timezone.utc) - timedelta(days=6),  # 6 DAYS AGO
            last_reminder_at=None,
        )
        db.add(g4)
        created_grievances.append(g4)

        a4 = Assignment(
            id=uuid.uuid4(),
            grievance_id=g4.id,
            assigned_to=authority.id,
            assigned_by=applicant.id,
            is_active=True,
            assigned_at=datetime.now(timezone.utc) - timedelta(days=6),
        )
        db.add(a4)
        created_assignments.append(a4)

        # -------------------------------------------------------------
        # SCENARIO 5: INACTIVE Assignment (is_active = False)
        # Should NOT generate reminder
        # -------------------------------------------------------------
        g5 = Grievance(
            id=uuid.uuid4(),
            grievance_id=f"GRV-TEST-{uuid.uuid4().hex[:6].upper()}",
            applicant_id=applicant.id,
            subject_id=subject.id if subject else None,
            title="Inactive Assignment Grievance 5",
            description="Testing that unassigned / inactive assignments are ignored",
            status=GrievanceStatus.ASSIGNED,
            priority=GrievancePriority.HIGH,
            last_action_at=datetime.now(timezone.utc) - timedelta(days=4),  # 4 DAYS AGO
            last_reminder_at=None,
        )
        db.add(g5)
        created_grievances.append(g5)

        a5 = Assignment(
            id=uuid.uuid4(),
            grievance_id=g5.id,
            assigned_to=authority.id,
            assigned_by=applicant.id,
            is_active=False,  # INACTIVE ASSIGNMENT
            assigned_at=datetime.now(timezone.utc) - timedelta(days=4),
        )
        db.add(a5)
        created_assignments.append(a5)

        db.commit()

        # -------------------------------------------------------------
        # STEP 1: VERIFY FIND_OVERDUE_GRIEVANCES
        # -------------------------------------------------------------
        overdue_items = find_overdue_grievances(db)
        overdue_g_ids = [item[0].id for item in overdue_items]

        print(f"\n[QUERY RESULT] Found {len(overdue_items)} overdue item(s) across database.")
        print(f"  - Overdue Grievance 1 (4 days ago, ASSIGNED, active assignment): {'FOUND [OK]' if g1.id in overdue_g_ids else 'MISSED [FAIL]'}")
        print(f"  - Recent Grievance 2 (1 day ago): {'IGNORED [OK]' if g2.id not in overdue_g_ids else 'INCORRECTLY INCLUDED [FAIL]'}")
        print(f"  - Resolved Grievance 3 (5 days ago, RESOLVED): {'IGNORED [OK]' if g3.id not in overdue_g_ids else 'INCORRECTLY INCLUDED [FAIL]'}")
        print(f"  - Closed Grievance 4 (6 days ago, CLOSED): {'IGNORED [OK]' if g4.id not in overdue_g_ids else 'INCORRECTLY INCLUDED [FAIL]'}")
        print(f"  - Inactive Assignment 5 (is_active=False): {'IGNORED [OK]' if g5.id not in overdue_g_ids else 'INCORRECTLY INCLUDED [FAIL]'}")

        assert g1.id in overdue_g_ids, "G1 must be detected as overdue"
        assert g2.id not in overdue_g_ids, "G2 (recent) must be ignored"
        assert g3.id not in overdue_g_ids, "G3 (resolved) must be ignored"
        assert g4.id not in overdue_g_ids, "G4 (closed) must be ignored"
        assert g5.id not in overdue_g_ids, "G5 (inactive assignment) must be ignored"

        # -------------------------------------------------------------
        # STEP 2: TRIGGER REMINDER SERVICE (FIRST RUN)
        # -------------------------------------------------------------
        print("\n[EXECUTION 1] Triggering create_overdue_reminders(db)...")
        reminders_created = create_overdue_reminders(db)
        db.commit()
        print(f"  -> Reminders created on 1st run: {reminders_created}")

        # Check notification created for authority
        notif = db.query(Notification).filter(
            Notification.user_id == authority.id,
            Notification.grievance_id == g1.id,
        ).first()

        assert notif is not None, "Notification must be created in PostgreSQL notifications table"
        created_notifications.append(notif)

        print(f"\n[NOTIFICATION VERIFICATION]")
        print(f"  - Recipient User ID: {notif.user_id} (Authority: {authority.full_name})")
        print(f"  - Notification Type: {notif.notification_type.value}")
        print(f"  - Title:             {notif.title}")
        print(f"  - Message:           {notif.message}")
        print(f"  - Grievance ID:      {g1.grievance_id}")
        print(f"  - Is Read:           {notif.is_read}")

        assert notif.user_id == authority.id, "Notification recipient must match assigned authority"
        assert g1.grievance_id in notif.message, "Notification message must contain the correct grievance ID"

        # Verify last_reminder_at was recorded on grievance
        db.refresh(g1)
        print(f"  - Grievance last_reminder_at: {g1.last_reminder_at}")
        assert g1.last_reminder_at is not None, "Grievance.last_reminder_at must be updated"

        # -------------------------------------------------------------
        # STEP 3: DUPLICATE REMINDER PREVENTION TEST (SECOND RUN)
        # Running the reminder job again in the same inactivity cycle
        # MUST NOT create duplicate reminders!
        # -------------------------------------------------------------
        print("\n[EXECUTION 2] Triggering create_overdue_reminders(db) 2nd time immediately...")
        reminders_2nd_run = create_overdue_reminders(db)
        db.commit()
        print(f"  -> Reminders created on 2nd run: {reminders_2nd_run}")

        assert reminders_2nd_run == 0, "Duplicate reminder prevention failed! 2nd run must create 0 reminders."
        print("  -> DUPLICATE PREVENTION VERIFIED: 0 duplicate notifications created [OK]")

        # -------------------------------------------------------------
        # STEP 4: ACTION TAKEN -> CYCLE RESETS
        # If authority takes action and resets last_action_at, then 4 days later a new reminder can be sent
        # -------------------------------------------------------------
        print("\n[CYCLE RESET TEST] Simulating new action taken, then another 4 days pass...")
        g1.last_action_at = datetime.now(timezone.utc) - timedelta(days=4)
        g1.last_reminder_at = datetime.now(timezone.utc) - timedelta(days=5)  # Previous reminder is older than new action
        db.add(g1)
        db.commit()

        reminders_3rd_run = create_overdue_reminders(db)
        db.commit()
        print(f"  -> Reminders created after new inactivity cycle: {reminders_3rd_run}")
        assert reminders_3rd_run >= 1, "New inactivity cycle should permit new reminder"

        # Find 2nd notification
        notifs = db.query(Notification).filter(
            Notification.user_id == authority.id,
            Notification.grievance_id == g1.id,
        ).all()
        for n in notifs:
            if n not in created_notifications:
                created_notifications.append(n)

        print(f"  -> Total notifications generated across full lifecycle: {len(notifs)}")

        print("\n" + "=" * 70)
        print("ALL 10 VERIFICATION CRITERIA PASSED WITH ZERO ERRORS!")
        print("=" * 70)
        return True

    except Exception as e:
        db.rollback()
        print(f"\n[TEST FAILED] Error: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # -------------------------------------------------------------
        # CLEANUP TEMPORARY TEST DATA
        # -------------------------------------------------------------
        print("\n[CLEANUP] Deleting temporary test data from PostgreSQL...")
        try:
            for notif in created_notifications:
                db.delete(notif)
            for a in created_assignments:
                db.delete(a)
            for g in created_grievances:
                db.delete(g)
            db.commit()
            print("[CLEANUP] All test grievances, assignments, and notifications successfully deleted.")
        except Exception as cleanup_err:
            db.rollback()
            print(f"[CLEANUP ERROR]: {cleanup_err}")
        finally:
            db.close()


if __name__ == "__main__":
    success = run_comprehensive_reminder_test()
    sys.exit(0 if success else 1)
