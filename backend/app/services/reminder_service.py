from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.models.grievance import Grievance
from app.models.notification import Notification, NotificationType
from app.services.notification_service import create_notification
from app.models.user import User
from app.services.email_service import send_email


REMINDER_AFTER_DAYS = 3


def find_overdue_grievances(
    db: Session,
) -> list[tuple[Grievance, Assignment]]:
    """
    Find grievances where:
    - there is an active assignment
    - no meaningful action has happened for 3 or more days
    """

    cutoff_time = (
        datetime.now(timezone.utc)
        - timedelta(days=REMINDER_AFTER_DAYS)
    )

    results = db.execute(
        select(Grievance, Assignment)
        .join(
            Assignment,
            Assignment.grievance_id == Grievance.id,
        )
        .where(
            Assignment.is_active.is_(True),
            Grievance.last_action_at <= cutoff_time,
        )
    ).all()

    return results


def create_overdue_reminders(
    db: Session,
) -> int:
    """
    Create reminder notifications and send an email
    to the currently assigned authority when no meaningful
    action has occurred for 3 or more days.
    """

    overdue_items = find_overdue_grievances(db)

    reminders_created = 0
    now = datetime.now(timezone.utc)

    for grievance, assignment in overdue_items:

        # --------------------------------------------------
        # Prevent duplicate reminder in same inactivity cycle
        # --------------------------------------------------

        if (
            grievance.last_reminder_at is not None
            and grievance.last_reminder_at >= grievance.last_action_at
        ):
            continue

        # --------------------------------------------------
        # Get currently assigned authority
        # --------------------------------------------------

        authority = db.scalar(
            select(User).where(
                User.id == assignment.assigned_to,
                User.is_active.is_(True),
            )
        )

        if authority is None:
            continue

        # --------------------------------------------------
        # Notification DB
        # --------------------------------------------------

        create_notification(
            db=db,
            user_id=authority.id,
            grievance_id=grievance.id,
            notification_type=NotificationType.SYSTEM,
            title="Grievance Action Overdue",
            message=(
                f"No meaningful action has been recorded for "
                f"grievance {grievance.grievance_id} for "
                f"{REMINDER_AFTER_DAYS} days. "
                "Please review and take the necessary action."
            ),
        )

                # --------------------------------------------------
        # Email
        # --------------------------------------------------

        try:
            print(
                f"[EMAIL] Sending reminder to {authority.email}"
            )

            send_email(
                to_email=authority.email,
                subject=(
                    f"Action Required - "
                    f"Grievance {grievance.grievance_id}"
                ),
                body=(
                    f"Dear {authority.full_name},\n\n"

                    f"No meaningful action has been recorded "
                    f"for grievance {grievance.grievance_id} "
                    f"for {REMINDER_AFTER_DAYS} days.\n\n"

                    f"Grievance Title: {grievance.title}\n"
                    f"Priority: {grievance.priority.value}\n"
                    f"Current Status: {grievance.status.value}\n\n"

                    "Please review the grievance and take the "
                    "necessary action.\n\n"

                    "Regards,\n"
                    "NIVARAN-AI\n"
                    "AI-Assisted Grievance Redressal System"
                ),
            )

            print(
                f"[EMAIL] Successfully sent to {authority.email}"
            )

        except Exception as email_error:
            print(
                f"[EMAIL ERROR] Failed to send email to "
                f"{authority.email}: "
                f"{type(email_error).__name__}: {email_error}"
            )
        # --------------------------------------------------
        # Mark reminder cycle
        # --------------------------------------------------

        grievance.last_reminder_at = now

        db.add(grievance)

        reminders_created += 1

    return reminders_created