from app.db.database import get_db
from app.services.reminder_service import create_overdue_reminders


db = next(get_db())

try:
    count = create_overdue_reminders(db)

    db.commit()

    print(f"Reminders created: {count}")

finally:
    db.close()