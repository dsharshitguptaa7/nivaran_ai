import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.db.database import engine
from sqlalchemy import text
from app.models.document_request import Base

def run_migration():
    print("Running migration for document_requests table and enum...")
    with engine.connect() as conn:
        # Create enum type if not exists
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_request_status') THEN
                    CREATE TYPE document_request_status AS ENUM (
                        'PENDING',
                        'UPLOADED',
                        'APPROVED',
                        'REJECTED',
                        'EXPIRED',
                        'CANCELLED'
                    );
                END IF;
            END$$;
        """))
        conn.commit()

        # Add values to notification_type
        for val in ['DOCUMENT_REQUESTED', 'DOCUMENT_UPLOADED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED']:
            try:
                conn.execute(text(f"ALTER TYPE notification_type ADD VALUE IF NOT EXISTS '{val}'"))
                conn.commit()
            except Exception as e:
                print(f"Notice: {e}")

        # Create table
        Base.metadata.create_all(bind=engine)
        print("[OK] document_requests table and enum successfully created/verified!")

if __name__ == "__main__":
    run_migration()
