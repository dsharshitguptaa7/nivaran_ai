"""
Migration script to ensure all enum values exist in PostgreSQL `notification_type` type.
"""

from sqlalchemy import text
from app.db.database import engine

def migrate_notification_types():
    new_enum_values = [
        "GRIEVANCE_FORWARDED",
        "GRIEVANCE_STATUS_CHANGED",
        "GRIEVANCE_REOPENED",
        "REMINDER",
    ]

    with engine.connect() as conn:
        for val in new_enum_values:
            try:
                conn.execute(text(f"ALTER TYPE notification_type ADD VALUE IF NOT EXISTS '{val}'"))
                conn.commit()
                print(f"[OK] Added enum value '{val}' to notification_type.")
            except Exception as e:
                conn.rollback()
                print(f"[NOTE] Enum value '{val}' check: {e}")

    print("Notification enum migration complete.")

if __name__ == "__main__":
    migrate_notification_types()
