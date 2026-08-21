"""
Migration script to ensure all enum values exist in PostgreSQL `notification_type` type.
"""

from sqlalchemy import text
from app.db.database import engine

def migrate_notification_types():
    new_enum_values = [
        "GRIEVANCE_SUBMITTED",
        "GRIEVANCE_ASSIGNED",
        "GRIEVANCE_FORWARDED",
        "GRIEVANCE_ESCALATED",
        "GRIEVANCE_STATUS_CHANGED",
        "GRIEVANCE_RESOLVED",
        "GRIEVANCE_CLOSED",
        "GRIEVANCE_REOPENED",
        "INFORMATION_REQUESTED",
        "DOCUMENT_REQUESTED",
        "DOCUMENT_UPLOADED",
        "DOCUMENT_APPROVED",
        "DOCUMENT_REJECTED",
        "REMINDER",
        "SYSTEM",
    ]

    with engine.connect() as conn:
        for val in new_enum_values:
            try:
                conn.execute(text(f"ALTER TYPE notification_type ADD VALUE IF NOT EXISTS '{val}'"))
                conn.commit()
                print(f"[OK] Ensured enum value '{val}' in notification_type.")
            except Exception as e:
                conn.rollback()
                print(f"[NOTE] Enum value '{val}' check: {e}")

    print("Notification enum migration complete.")

if __name__ == "__main__":
    migrate_notification_types()
