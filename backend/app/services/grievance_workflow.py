from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.grievance import Grievance
from app.models.enums import GrievanceStatus
from app.models.grievance_status_history import GrievanceStatusHistory,HistoryActorType
from app.models.user import User
from datetime import datetime, timezone

ALLOWED_TRANSITIONS: dict[GrievanceStatus, set[GrievanceStatus]] = {
    GrievanceStatus.SUBMITTED: {
        GrievanceStatus.AI_PROCESSING,
    },

    GrievanceStatus.AI_PROCESSING: {
        GrievanceStatus.PENDING_REVIEW,
    },

    GrievanceStatus.PENDING_REVIEW: {
        GrievanceStatus.ASSIGNED,
        GrievanceStatus.IN_PROGRESS,
        GrievanceStatus.ESCALATED,
    },

    GrievanceStatus.ASSIGNED: {
        GrievanceStatus.IN_PROGRESS,
        GrievanceStatus.ESCALATED,
    },

    GrievanceStatus.IN_PROGRESS: {
        GrievanceStatus.AWAITING_INFORMATION,
        GrievanceStatus.RESOLVED,
        GrievanceStatus.ESCALATED,
    },

    GrievanceStatus.AWAITING_INFORMATION: {
        GrievanceStatus.IN_PROGRESS,
    },

    GrievanceStatus.ESCALATED: {
        GrievanceStatus.ASSIGNED,
        GrievanceStatus.IN_PROGRESS,
        GrievanceStatus.RESOLVED,
    },

    GrievanceStatus.RESOLVED: {
        GrievanceStatus.CLOSED,
        GrievanceStatus.REOPENED,
    },

    GrievanceStatus.CLOSED: {
        GrievanceStatus.REOPENED,
    },

    GrievanceStatus.REOPENED: {
        GrievanceStatus.IN_PROGRESS,
        GrievanceStatus.ESCALATED,
    },
}


def change_grievance_status(
    db: Session,
    grievance: Grievance,
    new_status: GrievanceStatus,
    changed_by: User | None = None,
    reason: str | None = None,
    actor_type: HistoryActorType = HistoryActorType.USER,
) -> Grievance:

    current_status = grievance.status

    if current_status == new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grievance is already in this status",
        )

    allowed_statuses = ALLOWED_TRANSITIONS.get(
        current_status,
        set(),
    )

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid status transition: "
                f"{current_status.value} -> {new_status.value}"
            ),
        )

    # --------------------------------------------------
    # Actor validation
    # --------------------------------------------------

    if actor_type == HistoryActorType.USER:
        if changed_by is None:
            raise ValueError(
                "changed_by is required for USER actor"
            )

    elif actor_type == HistoryActorType.SYSTEM:
        changed_by = None

    # --------------------------------------------------
    # Create history
    # --------------------------------------------------

    history = GrievanceStatusHistory(
        grievance_id=grievance.id,
        previous_status=current_status,
        new_status=new_status,
        changed_by=(
            changed_by.id
            if changed_by is not None
            else None
        ),
        actor_type=actor_type,
        reason=reason,
    )

    grievance.status = new_status
    grievance.last_action_at = datetime.now(timezone.utc)

    db.add(history)
    db.add(grievance)

    return grievance