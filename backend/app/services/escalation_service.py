from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.grievance import Grievance
from app.models.assignment import Assignment
from app.models.escalation import Escalation, EscalationRole
from app.models.enums import GrievanceStatus

from app.services.grievance_workflow import change_grievance_status
from app.services.authority_routing import (
    get_expected_assistant_dean,
    get_expected_forward_target,
)
from app.models.audit_log import AuditLog

from app.models.notification import NotificationType
from app.services.notification_service import create_notification

# ============================================================
# ESCALATION HIERARCHY
# ============================================================

ESCALATION_HIERARCHY: dict[UserRole, UserRole] = {
    UserRole.MANAGER: UserRole.ASSISTANT_DEAN,
    UserRole.ASSISTANT_DEAN: UserRole.ASSOCIATE_DEAN,
    UserRole.ASSOCIATE_DEAN: UserRole.DEAN,
}


# ============================================================
# ROLE CONVERSION
# ============================================================

def user_role_to_escalation_role(
    role: UserRole,
) -> EscalationRole:

    try:
        return EscalationRole(role.value)

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Role {role.value} "
                "cannot participate in escalation"
            ),
        )


# ============================================================
# GET NEXT ESCALATION ROLE
# ============================================================

def get_next_escalation_role(
    current_role: UserRole,
) -> UserRole:

    next_role = ESCALATION_HIERARCHY.get(
        current_role
    )

    if next_role is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{current_role.value} cannot escalate "
                "this grievance any further"
            ),
        )

    return next_role


# ============================================================
# FIND NEXT AUTHORITY
# ============================================================

def get_next_authority(
    db: Session,
    next_role: UserRole,
) -> User:

    user = db.scalar(
        select(User)
        .where(
            User.role == next_role,
            User.is_active.is_(True),
        )
        .order_by(User.created_at.asc())
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No active user found for role "
                f"{next_role.value}"
            ),
        )

    return user


def get_routed_next_authority(
    db: Session,
    grievance: Grievance,
    current_user: User,
) -> User:
    if current_user.role == UserRole.MANAGER:
        return get_expected_assistant_dean(
            db=db,
            grievance=grievance,
        )

    if current_user.role == UserRole.ASSISTANT_DEAN:
        return get_expected_forward_target(
            db=db,
            grievance=grievance,
        )

    next_role = get_next_escalation_role(
        current_user.role
    )

    return get_next_authority(
        db=db,
        next_role=next_role,
    )


# ============================================================
# ESCALATE GRIEVANCE
# ============================================================

def escalate_grievance(
    db: Session,
    grievance: Grievance,
    current_user: User,
    reason: str,
    remarks: str | None = None,
) -> Assignment:

    # --------------------------------------------------------
    # 1. Applicant cannot escalate
    # --------------------------------------------------------

    if current_user.role == UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Applicants cannot escalate grievances",
        )


    # --------------------------------------------------------
    # 3. Find current active assignment
    # --------------------------------------------------------

    current_assignment = db.scalar(
        select(Assignment)
        .where(
            Assignment.grievance_id == grievance.id,
            Assignment.is_active.is_(True),
        )
    )

    # --------------------------------------------------------
    # 3A. Verify grievance ownership for forwarded assignments
    # --------------------------------------------------------

    if current_assignment is None:
        if current_user.role != UserRole.MANAGER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Grievance is not currently assigned to any authority",
            )

    elif current_assignment.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only escalate grievances assigned to you",
        )


    # --------------------------------------------------------
    # 3B. Validate grievance status
    # --------------------------------------------------------

    allowed_statuses = {
        GrievanceStatus.ASSIGNED,
        GrievanceStatus.ESCALATED,
    }

    if current_assignment is None:
        allowed_statuses = {
            GrievanceStatus.PENDING_REVIEW,
            GrievanceStatus.ESCALATED,
        }

    if grievance.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Grievance cannot be escalated from "
                f"{grievance.status.value} status"
            ),
        )

        # --------------------------------------------------------
    # 2. Find next authority using configured routing
    # --------------------------------------------------------

    next_authority = get_routed_next_authority(
        db=db,
        grievance=grievance,
        current_user=current_user,
    )

    next_role = next_authority.role

    # --------------------------------------------------------
    # 4. Deactivate current assignment
    # --------------------------------------------------------

    if current_assignment is not None:

        current_assignment.is_active = False

        current_assignment.unassigned_at = (
            datetime.now(timezone.utc)
        )

        db.add(current_assignment)

    # --------------------------------------------------------
    # 5. Create escalation history
    # --------------------------------------------------------

    escalation = Escalation(
        grievance_id=grievance.id,

        from_user_id=current_user.id,

        from_role=user_role_to_escalation_role(
            current_user.role
        ),

        to_role=user_role_to_escalation_role(
            next_role
        ),

        reason=reason,

        remarks=remarks,
    )

    db.add(escalation)

    # --------------------------------------------------------
    # 6. Create new assignment
    # --------------------------------------------------------

    new_assignment = Assignment(
        grievance_id=grievance.id,

        assigned_to=next_authority.id,

        assigned_by=current_user.id,

        remarks=remarks,

        is_active=True,
    )

    db.add(new_assignment)
    grievance.last_action_at = datetime.now(timezone.utc)
    db.add(grievance)

    # --------------------------------------------------------
    # 6A. Create audit log
    # --------------------------------------------------------

    audit_log = AuditLog(
    user_id=current_user.id,
    grievance_id=grievance.id,
    action="GRIEVANCE_ESCALATED",
    entity_type="ESCALATION",
    entity_id=escalation.id,
    description=(
        f"Grievance escalated from "
        f"{current_user.role.value} to "
        f"{next_role.value}."
    ),
)

    db.add(audit_log)

    # --------------------------------------------------------
    # 6B. Create notification for next authority
    # --------------------------------------------------------

    create_notification(
    db=db,
    user_id=next_authority.id,
    grievance_id=grievance.id,
    notification_type=NotificationType.GRIEVANCE_ESCALATED,
    title="Grievance Escalated",
    message=(
        f"Grievance {grievance.grievance_id} "
        f"has been escalated to you by "
        f"{current_user.full_name}."
    ),
)

    # --------------------------------------------------------
    # 7. Update status ONLY if necessary
    # --------------------------------------------------------

    if grievance.status != GrievanceStatus.ESCALATED:

        change_grievance_status(
            db=db,
            grievance=grievance,
            new_status=GrievanceStatus.ESCALATED,
            changed_by=current_user,
            reason=reason,
        )

    return new_assignment
