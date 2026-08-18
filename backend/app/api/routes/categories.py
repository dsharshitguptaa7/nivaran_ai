from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.category import Category
from app.schemas.grievance import CategoryResponse


router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
)


@router.get(
    "",
    response_model=list[CategoryResponse],
)
def get_categories(
    db: Session = Depends(get_db),
):
    categories = db.scalars(
        select(Category)
        .where(Category.is_active.is_(True))
        .order_by(Category.name)
    ).all()

    return categories