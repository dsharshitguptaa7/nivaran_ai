from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password


db = SessionLocal()

try:
    existing_user = (
        db.query(User)
        .filter(User.email == "manager@test.com")
        .first()
    )

    if existing_user:
        print("Manager already exists")
    else:
        manager = User(
            full_name="Test Manager",
            email="manager@test.com",
            password_hash=hash_password("Manager@123"),
            role=UserRole.MANAGER,
            department="R&D",
            is_active=True,
        )

        db.add(manager)
        db.commit()
        db.refresh(manager)

        print("Test Manager created")
        print(f"ID: {manager.id}")

finally:
    db.close()