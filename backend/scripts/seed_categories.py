import sys
from pathlib import Path

from sqlalchemy import select

# Add backend/ to Python path
BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.database import SessionLocal
from app.models.category import Category


CATEGORIES = [
    ("Course_Work", "Issues related to coursework and academic course requirements."),
    ("FT_PT_Conversion", "Issues related to full-time and part-time research status conversion."),
    ("Fee", "Issues related to fees, payments, and financial charges."),
    ("Fellowship", "Issues related to research fellowship and scholarship payments."),
    ("Other", "Grievances that do not fit into the defined categories."),
    ("PhD_Admission", "Issues related to PhD admission and admission procedures."),
    ("Portal_Data_Correction", "Requests to correct incorrect information in the portal."),
    ("Publication_Verification", "Issues related to research publication verification."),
    ("RAC", "Issues related to Research Advisory Committee processes."),
    ("RDC", "Issues related to Research Degree Committee processes."),
    ("RTI_IIGRS", "Issues related to RTI and IIGRS matters."),
    ("Registration", "Issues related to research registration."),
    ("Supervisor_Related", "Issues related to research supervisors or guides."),
    ("Thesis_Evaluation", "Issues related to thesis evaluation and review."),
    ("Thesis_Submission", "Issues related to thesis submission and acknowledgement."),
    ("Viva", "Issues related to viva voce and viva procedures."),
]


def seed_categories():
    db = SessionLocal()

    try:
        created = 0
        skipped = 0

        for name, description in CATEGORIES:

            existing = db.scalar(
                select(Category).where(
                    Category.name == name
                )
            )

            if existing:
                skipped += 1
                continue

            category = Category(
                name=name,
                description=description,
                is_active=True,
            )

            db.add(category)
            created += 1

        db.commit()

        print(f"Categories created: {created}")
        print(f"Categories already existed: {skipped}")
        print("Category seeding completed successfully.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_categories()