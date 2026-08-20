from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password


ASSISTANT_DEANS = [
    ("Dr. Ankit Trivedi", "ankit.trivedi@nivaran.local"),
    ("Dr. Pooja Singh", "pooja.singh@nivaran.local"),
    ("Dr. Priyanka Maurya", "priyanka.maurya@nivaran.local"),
    ("Dr. Dipesh Kumar Verma", "dipesh.verma@nivaran.local"),
    ("Dr. Adarsh Kumar Srivastav", "adarsh.srivastav@nivaran.local"),
    ("Dr. Pravin Kumar Agarwal", "pravin.agarwal@nivaran.local"),
    ("Dr. Shashi Kiran Mishra", "shashi.mishra@nivaran.local"),
    ("Dr. Priyanka Gupta", "priyanka.gupta@nivaran.local"),
    ("Dr. Anjani Kumar Upadhayay", "anjani.upadhayay@nivaran.local"),
    ("Dr. Samiuddin", "samiuddin@nivaran.local"),
]

TEMP_PASSWORD = "Admin@789"


def seed_assistant_deans():
    db = SessionLocal()

    try:
        for full_name, email in ASSISTANT_DEANS:

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
                role=UserRole.ASSISTANT_DEAN,
                department="R&D",
                is_active=True,
            )

            db.add(user)

            print(f"Created: {full_name} <{email}>")

        db.commit()

        print("\nAssistant Dean seed completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"\nSeed failed: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_assistant_deans()