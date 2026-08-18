from app.celery_app import celery_app
from app.db.database import SessionLocal
from app.services.reminder_service import create_overdue_reminders


@celery_app.task
def check_overdue_grievances():
    db = SessionLocal()

    try:
        reminders_created = create_overdue_reminders(db)

        db.commit()

        return {
            "reminders_created": reminders_created,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()