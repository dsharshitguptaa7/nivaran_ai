from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password


ASSOCIATE_DEANS = [
    (
        "Dr. Arun Kumar Gupta",
        "arun.gupta@nivaran.local",
    ),
    (
        "Dr. Manas Upadhyay",
        "manas.upadhyay@nivaran.local",
    ),
    (
        "Dr. Sweta Pandey",
        "sweta.pandey@nivaran.local",
    ),
]

TEMP_PASSWORD = "Admin@789"


def seed_associate_deans():
    db = SessionLocal()

    try:
        for full_name, email in ASSOCIATE_DEANS:

            existing_user = (
                db.query(User)
                .filter(User.email == email)
                .first()
            )

            if existing_user:
                print(f"Already exists: {email}")
                continue

            user = User(
                full_name=full_name,
                email=email,
                password_hash=hash_password(TEMP_PASSWORD),
                role=UserRole.ASSOCIATE_DEAN,
                department=None,
                is_active=True,
            )

            db.add(user)

            print(
                f"Created: {full_name} <{email}>"
            )

        db.commit()

        print(
            "\nAssociate Dean seed completed successfully."
        )

    except Exception as e:
        db.rollback()
        print(f"\nSeed failed: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_associate_deans()