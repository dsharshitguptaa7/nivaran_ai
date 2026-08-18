from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import engine
from app.models.user import User, UserRole
from app.core.security import hash_password


TEST_USERS = [
    {
        "full_name": "Test Assistant Dean",
        "email": "assistant.dean@test.com",
        "password": "Assistant@123",
        "role": UserRole.ASSISTANT_DEAN,
        "department": "Research and Development",
    },
    {
        "full_name": "Test Associate Dean",
        "email": "associate.dean@test.com",
        "password": "Associate@123",
        "role": UserRole.ASSOCIATE_DEAN,
        "department": "Research and Development",
    },
    {
        "full_name": "Test Dean",
        "email": "dean@test.com",
        "password": "Dean@123",
        "role": UserRole.DEAN,
        "department": "Research and Development",
    },
]


def create_test_users():
    with Session(engine) as db:

        for user_data in TEST_USERS:

            existing_user = db.scalar(
                select(User).where(
                    User.email == user_data["email"]
                )
            )

            if existing_user:
                print(
                    f"Already exists: "
                    f"{user_data['email']}"
                )
                continue

            user = User(
                full_name=user_data["full_name"],
                email=user_data["email"],
                password_hash=hash_password(
                    user_data["password"]
                ),
                role=user_data["role"],
                department=user_data["department"],
                is_active=True,
            )

            db.add(user)

            print(
                f"Created: "
                f"{user_data['full_name']} "
                f"({user_data['role'].value})"
            )

        db.commit()

    print("\nTest authority users setup complete.")


if __name__ == "__main__":
    create_test_users()