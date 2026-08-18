from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.permissions import Permission
from app.db.database import get_db

from app.models.assignment import Assignment
from app.models.grievance import Grievance
from app.models.user import User

from datetime import datetime, timezone

from app.models.enums import GrievanceStatus
from app.models.user import UserRole
from app.models.audit_log import AuditLog
from app.schemas.assignment import AssignmentCreate
from app.services.grievance_workflow import change_grievance_status

from app.models.notification import NotificationType
from app.services.notification_service import create_notification

router = APIRouter(
    prefix="/assignments",
    tags=["Assignments"],
)


# ============================================================
# GET MY ASSIGNMENTS
# ============================================================

@router.get("/my")
def get_my_assignments(
    current_user: User = Depends(
        require_permission(Permission.VIEW_ASSIGNMENTS)
    ),
    db: Session = Depends(get_db),
):
    assignments = db.scalars(
        select(Assignment)
        .where(
            Assignment.assigned_to == current_user.id,
            Assignment.is_active.is_(True),
        )
        .order_by(
            Assignment.assigned_at.desc()
        )
    ).all()

    return assignments

# ============================================================
# GET MY ASSIGNED GRIEVANCES
# ============================================================

@router.get("/my/grievances")
def get_my_assigned_grievances(
    current_user: User = Depends(
        require_permission(Permission.VIEW_ASSIGNMENTS)
    ),
    db: Session = Depends(get_db),
):
    grievances = db.scalars(
        select(Grievance)
        .join(
            Assignment,
            Assignment.grievance_id == Grievance.id,
        )
        .where(
            Assignment.assigned_to == current_user.id,
            Assignment.is_active.is_(True),
        )
        .order_by(
            Assignment.assigned_at.desc()
        )
    ).all()

    return grievances

# ============================================================
# ASSIGN GRIEVANCE
# ============================================================

@router.post("/{grievance_id}")
def assign_grievance(
    grievance_id: str,
    assignment_data: AssignmentCreate,
    current_user: User = Depends(
        require_permission(
            Permission.ASSIGN_GRIEVANCE
        )
    ),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------
    # 1. Get grievance
    # --------------------------------------------------

    grievance = db.scalar(
        select(Grievance).where(
            Grievance.grievance_id == grievance_id
        )
    )

    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    # --------------------------------------------------
    # 2. Get assignee
    # --------------------------------------------------

    assignee = db.scalar(
        select(User).where(
            User.id == assignment_data.assigned_to,
            User.is_active.is_(True),
        )
    )

    if assignee is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned user not found or inactive",
        )

    # --------------------------------------------------
# 3. Validate hierarchical assignment
# --------------------------------------------------

    NEXT_ROLE = {
    UserRole.MANAGER: UserRole.ASSISTANT_DEAN,
    UserRole.ASSISTANT_DEAN: UserRole.ASSOCIATE_DEAN,
    UserRole.ASSOCIATE_DEAN: UserRole.DEAN,
    }

    expected_role = NEXT_ROLE.get(current_user.role)

    if expected_role is None:
      raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            f"{current_user.role.value} cannot "
            "forward grievances to another authority."
        ),
    )

    if assignee.role != expected_role:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            f"{current_user.role.value} can only assign "
            f"grievances to {expected_role.value}."
        ),
    )
    # --------------------------------------------------
    # 4. Check existing active assignment
    # --------------------------------------------------

    existing_assignment = db.scalar(
        select(Assignment).where(
            Assignment.grievance_id == grievance.id,
            Assignment.is_active.is_(True),
        )
    )

    if existing_assignment is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grievance is already assigned.",
        )

    # --------------------------------------------------
    # 5. Validate grievance status
    # --------------------------------------------------

    if grievance.status not in {
        GrievanceStatus.PENDING_REVIEW,
        GrievanceStatus.ESCALATED,
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Grievance cannot be assigned in its "
                f"current status: {grievance.status.value}"
            ),
        )

    # --------------------------------------------------
    # 6. Create assignment
    # --------------------------------------------------

    assignment = Assignment(
        grievance_id=grievance.id,
        assigned_to=assignee.id,
        assigned_by=current_user.id,
        remarks=assignment_data.remarks,
        is_active=True,
    )

    db.add(assignment)
    grievance.last_action_at = datetime.now(timezone.utc)
    db.add(grievance)

    # --------------------------------------------------
    # 7. Change grievance status
    # --------------------------------------------------

    change_grievance_status(
        db=db,
        grievance=grievance,
        new_status=GrievanceStatus.ASSIGNED,
        changed_by=current_user,
        reason=(
            f"Grievance assigned to "
            f"{assignee.full_name}."
        ),
    )

    # --------------------------------------------------
    # 8. Audit log
    # --------------------------------------------------

    audit_log = AuditLog(
        user_id=current_user.id,
        grievance_id=grievance.id,
        action="GRIEVANCE_ASSIGNED",
        entity_type="ASSIGNMENT",
        entity_id=assignment.id,
        description=(
            f"Grievance assigned to "
            f"{assignee.full_name} "
            f"({assignee.role.value})."
        ),
    )

    db.add(audit_log)

    create_notification(
    db=db,
    user_id=assignee.id,
    grievance_id=grievance.id,
    notification_type=NotificationType.GRIEVANCE_ASSIGNED,
    title="New Grievance Assigned",
    message=(
        f"Grievance {grievance.grievance_id} "
        "has been assigned to you."
    ),
)

    # --------------------------------------------------
    # 9. Commit
    # --------------------------------------------------

    db.commit()
    db.refresh(assignment)

    return assignment