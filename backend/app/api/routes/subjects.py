from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.subject import Subject


router = APIRouter(
    prefix="/subjects",
    tags=["Subjects"],
)


@router.get("")
def get_subjects(
    db: Session = Depends(get_db),
):
    subjects = db.scalars(
        select(Subject)
        .where(
            Subject.is_active.is_(True)
        )
        .order_by(
            Subject.name.asc()
        )
    ).all()

    return subjects