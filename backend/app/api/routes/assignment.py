import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.permissions import Permission
from app.db.database import get_db

from app.models.assignment import Assignment
from app.models.grievance import Grievance
from app.models.user import User, UserRole
from app.models.enums import GrievanceStatus
from app.models.grievance_status_history import GrievanceStatusHistory, HistoryActorType
from app.models.audit_log import AuditLog
from app.models.notification import NotificationType
from app.schemas.assignment import AssignmentCreate
from app.services.authority_routing import (
    get_expected_assistant_dean,
    get_expected_forward_target,
    get_next_authority_for_grievance,
)
from app.services.grievance_workflow import change_grievance_status
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
            (Grievance.grievance_id == grievance_id)
            | (Grievance.id == (uuid.UUID(grievance_id) if len(grievance_id) == 36 else None))
        )
    )

    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    # --------------------------------------------------
    # 2. Check existing active assignment
    # --------------------------------------------------

    existing_assignment = db.scalar(
        select(Assignment).where(
            Assignment.grievance_id == grievance.id,
            Assignment.is_active.is_(True),
        )
    )

    is_forward = existing_assignment is not None

    if (
        existing_assignment is not None
        and existing_assignment.assigned_to != current_user.id
        and current_user.role != UserRole.MANAGER
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only forward grievances currently assigned to you.",
        )

    # --------------------------------------------------
    # 3. Resolve target assignee based on dynamic authority workflow
    # --------------------------------------------------

    expected_assignee = get_next_authority_for_grievance(
        db=db,
        grievance=grievance,
        current_user=current_user,
    )

    if expected_assignee is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forwarding is not available because this grievance has reached its final mapped authority.",
        )

    if assignment_data.assigned_to is not None:
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
        if assignee.id != expected_assignee.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"{current_user.role.value} can only forward to "
                    f"{expected_assignee.full_name} ({expected_assignee.role.value})."
                ),
            )
    else:
        assignee = expected_assignee

    # --------------------------------------------------
    # 4. Validate grievance status
    # --------------------------------------------------

    allowed_statuses = {
        GrievanceStatus.ASSIGNED,
        GrievanceStatus.IN_PROGRESS,
        GrievanceStatus.ESCALATED,
    } if is_forward else {
        GrievanceStatus.PENDING_REVIEW,
        GrievanceStatus.ESCALATED,
        GrievanceStatus.SUBMITTED,
        GrievanceStatus.AI_PROCESSING,
    }

    if grievance.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Grievance cannot be assigned in its "
                f"current status: {grievance.status.value}"
            ),
        )

    if existing_assignment is not None:
        existing_assignment.is_active = False
        existing_assignment.unassigned_at = datetime.now(timezone.utc)
        db.add(existing_assignment)

    # --------------------------------------------------
    # 5. Create assignment
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
    # 6. Change grievance status & record history
    # --------------------------------------------------

    if is_forward:
        role_label = assignee.role.value.replace("_", " ")
        forward_reason = (
            f"Forwarded by {current_user.full_name} to {assignee.full_name}"
            f" ({role_label})"
        )
        if assignment_data.remarks and assignment_data.remarks.strip():
            forward_reason += f": {assignment_data.remarks.strip()}"

        history_entry = GrievanceStatusHistory(
            grievance_id=grievance.id,
            previous_status=grievance.status,
            new_status=GrievanceStatus.ASSIGNED,
            changed_by=current_user.id,
            actor_type=HistoryActorType.USER,
            reason=forward_reason,
        )
        db.add(history_entry)
        grievance.status = GrievanceStatus.ASSIGNED
        db.add(grievance)

        # Audit log
        audit_log = AuditLog(
            user_id=current_user.id,
            grievance_id=grievance.id,
            action="GRIEVANCE_FORWARDED",
            entity_type="ASSIGNMENT",
            entity_id=assignment.id,
            description=(
                f"Forwarded by {current_user.full_name} to "
                f"{assignee.full_name} ({assignee.role.value})."
                + (f" Remarks: {assignment_data.remarks}" if assignment_data.remarks else "")
            ),
        )
        db.add(audit_log)
    else:
        if grievance.status != GrievanceStatus.ASSIGNED:
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

        # Audit log
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

    # --------------------------------------------------
    # 7. Notifications
    # --------------------------------------------------

    if is_forward:
        role_str = assignee.role.value.replace("_", " ")
        curr_role_str = current_user.role.value.replace("_", " ")

        # Notify the new assignee
        create_notification(
            db=db,
            user_id=assignee.id,
            grievance_id=grievance.id,
            notification_type=NotificationType.GRIEVANCE_FORWARDED,
            title="Grievance Forwarded to You",
            message=(
                f"Grievance {grievance.grievance_id} has been forwarded to you ({assignee.full_name}) by "
                f"{current_user.full_name} ({curr_role_str})."
            ),
        )
        # Notify the applicant (In-App status update)
        create_notification(
            db=db,
            user_id=grievance.applicant_id,
            grievance_id=grievance.id,
            notification_type=NotificationType.GRIEVANCE_STATUS_CHANGED,
            title="Grievance Forwarded",
            message=(
                f"Your grievance {grievance.grievance_id} has been forwarded to {assignee.full_name} "
                f"({role_str}) for further review."
            ),
        )
    else:
        # Initial assignment
        create_notification(
            db=db,
            user_id=assignee.id,
            grievance_id=grievance.id,
            notification_type=NotificationType.GRIEVANCE_ASSIGNED,
            title="New Grievance Assigned",
            message=(
                f"Grievance {grievance.grievance_id} has been assigned to you ({assignee.full_name}) for review."
            ),
        )

    # --------------------------------------------------
    # 8. Commit
    # --------------------------------------------------

    db.commit()
    db.refresh(assignment)

    return assignment
