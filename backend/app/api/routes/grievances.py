from uuid import uuid4

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.permissions import Permission
from app.db.database import get_db
from app.models.grievance import (
    Grievance,
    GrievancePriority,
    GrievanceStatus,
)
from app.models.user import User
from app.schemas.grievance import (
    GrievanceCreate,
    GrievanceResponse,
)

from app.models.grievance_status_history import GrievanceStatusHistory

from sqlalchemy import select


router = APIRouter(
    prefix="/grievances",
    tags=["Grievances"],
)


def generate_grievance_id() -> str:
    """Generate a unique human-readable grievance ID."""

    return f"GRV-{uuid4().hex[:10].upper()}"


@router.post(
    "",
    response_model=GrievanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_grievance(
    grievance_data: GrievanceCreate,
    current_user: User = Depends(
        require_permission(Permission.CREATE_GRIEVANCE)
    ),
    db: Session = Depends(get_db),
):
    grievance = Grievance(
        grievance_id=generate_grievance_id(),
        applicant_id=current_user.id,
        title=grievance_data.title,
        description=grievance_data.description,
        status=GrievanceStatus.SUBMITTED,
        priority=GrievancePriority.MEDIUM,
    )

    db.add(grievance)
    db.add(grievance)
    db.flush()

    history = GrievanceStatusHistory(
    grievance_id=grievance.id,
    previous_status=None,
    new_status=GrievanceStatus.SUBMITTED,
    changed_by=current_user.id,
    reason="Grievance submitted",
    )

    db.add(history)

    db.commit()
    db.refresh(grievance)

    return grievance
    db.commit()
    db.refresh(grievance)

    return grievance

@router.get(
    "",
    response_model=list[GrievanceResponse],
)
def get_my_grievances(
    current_user: User = Depends(
        require_permission(Permission.VIEW_GRIEVANCE)
    ),
    db: Session = Depends(get_db),
):
    grievances = db.scalars(
        select(Grievance)
        .where(Grievance.applicant_id == current_user.id)
        .order_by(Grievance.created_at.desc())
    ).all()

    return grievances

@router.get(
    "/{grievance_id}",
    response_model=GrievanceResponse,
)
def get_grievance(
    grievance_id: str,
    current_user: User = Depends(
        require_permission(Permission.VIEW_GRIEVANCE)
    ),
    db: Session = Depends(get_db),
):
    grievance = db.scalar(
        select(Grievance).where(
            Grievance.grievance_id == grievance_id,
            Grievance.applicant_id == current_user.id,
        )
    )

    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    return grievance

@router.get(
    "/{grievance_id}/history",
)
def get_grievance_history(
    grievance_id: str,
    current_user: User = Depends(
        require_permission(Permission.VIEW_GRIEVANCE)
    ),
    db: Session = Depends(get_db),
):
    grievance = db.scalar(
        select(Grievance).where(
            Grievance.grievance_id == grievance_id,
            Grievance.applicant_id == current_user.id,
        )
    )

    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    history = db.scalars(
        select(GrievanceStatusHistory)
        .where(
            GrievanceStatusHistory.grievance_id == grievance.id
        )
        .order_by(GrievanceStatusHistory.created_at.asc())
    ).all()

    return history