from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import (
    Category,
    CategoryRoutingType,
)
from app.models.grievance import Grievance
from app.models.enums import GrievanceStatus
from app.models.subject import Subject
from app.models.subject_cluster import SubjectCluster
from app.models.grievance_cluster import GrievanceCluster
from app.models.user import User, UserRole


def get_subject_assistant_dean(
    db: Session,
    grievance: Grievance,
) -> User:
    """
    Find the Assistant Dean responsible for the grievance subject.

    Flow:

    Grievance / Applicant
        ↓
    Subject
        ↓
    Subject Cluster
        ↓
    Assistant Dean
    """

    subject_id = grievance.subject_id
    if subject_id is None and grievance.applicant and grievance.applicant.subject_id:
        subject_id = grievance.applicant.subject_id

    if subject_id is not None:
        subject = db.scalar(
            select(Subject)
            .where(
                Subject.id == subject_id,
                Subject.is_active.is_(True),
            )
        )

        if subject is not None and subject.subject_cluster_id is not None:
            subject_cluster = db.scalar(
                select(SubjectCluster)
                .where(
                    SubjectCluster.id == subject.subject_cluster_id,
                    SubjectCluster.is_active.is_(True),
                )
            )

            if subject_cluster is not None and subject_cluster.assistant_dean_id is not None:
                assistant_dean = db.scalar(
                    select(User)
                    .where(
                        User.id == subject_cluster.assistant_dean_id,
                        User.role == UserRole.ASSISTANT_DEAN,
                        User.is_active.is_(True),
                    )
                )
                if assistant_dean is not None:
                    return assistant_dean

    # Fallback to Cluster 1 Assistant Dean or first active subject-cluster mapped Assistant Dean
    cluster_1 = db.scalar(
        select(SubjectCluster)
        .where(
            SubjectCluster.cluster_number == 1,
            SubjectCluster.is_active.is_(True),
        )
    )
    if cluster_1 and cluster_1.assistant_dean and cluster_1.assistant_dean.is_active:
        return cluster_1.assistant_dean

    fallback_assistant_dean = db.scalar(
        select(User)
        .where(
            User.role == UserRole.ASSISTANT_DEAN,
            User.is_active.is_(True),
            User.full_name.notlike("%Test%"),
        )
        .order_by(User.full_name.asc())
    )

    if fallback_assistant_dean is not None:
        return fallback_assistant_dean

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="No active Assistant Dean is configured in the system.",
    )


def get_category_associate_dean(
    db: Session,
    grievance: Grievance,
) -> User:
    """
    Find the Associate Dean responsible for the grievance's
    final category.

    Flow:

    Final Category
        ↓
    Grievance Cluster
        ↓
    Associate Dean
    """

    if grievance.final_category_id is not None:
        category = db.scalar(
            select(Category)
            .where(
                Category.id == grievance.final_category_id,
                Category.is_active.is_(True),
            )
        )

        if category is not None and category.grievance_cluster_id is not None:
            grievance_cluster = db.scalar(
                select(GrievanceCluster)
                .where(
                    GrievanceCluster.id == category.grievance_cluster_id,
                    GrievanceCluster.is_active.is_(True),
                )
            )

            if grievance_cluster is not None and grievance_cluster.associate_dean_id is not None:
                associate_dean = db.scalar(
                    select(User)
                    .where(
                        User.id == grievance_cluster.associate_dean_id,
                        User.role == UserRole.ASSOCIATE_DEAN,
                        User.is_active.is_(True),
                    )
                )
                if associate_dean is not None:
                    return associate_dean

    # Fallback to Grievance Cluster 1 Associate Dean (Dr. Arun Kumar Gupta)
    cluster_1 = db.scalar(
        select(GrievanceCluster)
        .where(
            GrievanceCluster.cluster_number == 1,
            GrievanceCluster.is_active.is_(True),
        )
    )
    if cluster_1 and cluster_1.associate_dean and cluster_1.associate_dean.is_active:
        return cluster_1.associate_dean

    fallback_associate_dean = db.scalar(
        select(User)
        .where(
            User.role == UserRole.ASSOCIATE_DEAN,
            User.is_active.is_(True),
            User.full_name.notlike("%Test%"),
        )
        .order_by(User.full_name.asc())
    )

    if fallback_associate_dean is not None:
        return fallback_associate_dean

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="No active Associate Dean is configured in the system.",
    )


def get_fixed_authority(
    db: Session,
    grievance: Grievance,
) -> User:
    """
    Find the fixed authority configured for the grievance category.
    """
    cat_id = grievance.final_category_id or grievance.category_id

    if cat_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grievance category is not set.",
        )

    category = db.scalar(
        select(Category)
        .where(
            Category.id == cat_id,
            Category.is_active.is_(True),
        )
    )

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grievance category not found or inactive.",
        )

    if category.routing_type != CategoryRoutingType.FIXED_AUTHORITY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This grievance category does not use "
                "fixed-authority routing."
            ),
        )

    if category.fixed_authority_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fixed authority is not configured for this category.",
        )

    authority = db.scalar(
        select(User)
        .where(
            User.id == category.fixed_authority_id,
            User.is_active.is_(True),
        )
    )

    if authority is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Configured fixed authority is not available.",
        )

    return authority


def get_expected_assistant_dean(
    db: Session,
    grievance: Grievance,
) -> User:
    """
    Returns the Assistant Dean responsible for the grievance subject.

    This is the first destination after Manager review.
    """

    return get_subject_assistant_dean(
        db=db,
        grievance=grievance,
    )


def get_expected_forward_target(
    db: Session,
    grievance: Grievance,
) -> User:
    """
    Determine the correct authority for the next forward operation.

    This function is intentionally used only when an Assistant Dean
    wants to forward the grievance.

    Routing rules:

    GRIEVANCE_CLUSTER
        → Associate Dean

    SUBJECT_ASSISTANT_DEAN
        → No further authority required

    FIXED_AUTHORITY
        → Fixed authority
    """
    cat_id = grievance.final_category_id or grievance.category_id

    if cat_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grievance category is not set.",
        )

    category = db.scalar(
        select(Category)
        .where(
            Category.id == cat_id,
            Category.is_active.is_(True),
        )
    )

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grievance category not found or inactive.",
        )

    if category.routing_type == CategoryRoutingType.GRIEVANCE_CLUSTER:
        return get_category_associate_dean(
            db=db,
            grievance=grievance,
        )

    if category.routing_type == CategoryRoutingType.FIXED_AUTHORITY:
        return get_fixed_authority(
            db=db,
            grievance=grievance,
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            "This grievance category is handled at "
            "Assistant Dean level and cannot be forwarded further."
        ),
    )

def get_next_authority_for_grievance(
    db: Session,
    grievance: Grievance,
    current_user: User,
) -> User | None:
    """
    Dynamically determine the next authority in the grievance workflow.
    Returns None if the grievance has reached its terminal resolving authority
    or if forwarding is not applicable.
    """
    # Resolved or Closed grievances cannot be forwarded further
    if grievance.status in {GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED}:
        return None

    # Manager review step -> first authority (Subject Assistant Dean)
    if current_user.role == UserRole.MANAGER:
        if grievance.status in {
            GrievanceStatus.SUBMITTED,
            GrievanceStatus.AI_PROCESSING,
            GrievanceStatus.PENDING_REVIEW,
            GrievanceStatus.ESCALATED,
        }:
            try:
                return get_expected_assistant_dean(db=db, grievance=grievance)
            except Exception:
                return None
        return None

    # Dean is executive terminal
    if current_user.role == UserRole.DEAN:
        return None

    # For Assistant Dean or other assigned authorities:
    cat_id = grievance.final_category_id or grievance.category_id
    if cat_id is None:
        return None

    category = db.scalar(
        select(Category)
        .where(
            Category.id == cat_id,
            Category.is_active.is_(True),
        )
    )

    if category is None:
        return None

    # Case 1: SUBJECT_ASSISTANT_DEAN -> Resolved directly by Subject Assistant Dean (Terminal)
    if category.routing_type == CategoryRoutingType.SUBJECT_ASSISTANT_DEAN:
        return None

    # Case 2: GRIEVANCE_CLUSTER -> Mapped Associate Dean
    if category.routing_type == CategoryRoutingType.GRIEVANCE_CLUSTER:
        try:
            assoc_dean = get_category_associate_dean(db=db, grievance=grievance)
            # If current user is already this Associate Dean, terminal!
            if assoc_dean and assoc_dean.id == current_user.id:
                return None
            return assoc_dean
        except Exception:
            return None

    # Case 3: FIXED_AUTHORITY -> Specific configured authority (e.g. Dr. Dipesh Kumar Verma)
    if category.routing_type == CategoryRoutingType.FIXED_AUTHORITY:
        try:
            fixed_auth = get_fixed_authority(db=db, grievance=grievance)
            # If current user is already the fixed authority, terminal!
            if fixed_auth and fixed_auth.id == current_user.id:
                return None
            return fixed_auth
        except Exception:
            return None

    return None


def get_routing_response(
    db: Session,
    grievance: Grievance,
    current_user: User,
) -> dict:
    """
    Determine the routing target and action capabilities based on
    the current authority level and grievance workflow mapping.
    """
    is_resolved_or_closed = grievance.status in {
        GrievanceStatus.RESOLVED,
        GrievanceStatus.CLOSED,
    }

    # Determine next dynamic authority
    next_authority = get_next_authority_for_grievance(
        db=db,
        grievance=grievance,
        current_user=current_user,
    )

    can_forward = next_authority is not None

    # Determine routing type label
    routing_type_str: str | None = None
    if current_user.role == UserRole.MANAGER:
        routing_type_str = "SUBJECT_ASSISTANT_DEAN"
    elif current_user.role == UserRole.ASSOCIATE_DEAN:
        routing_type_str = "DEAN"
    elif grievance.final_category and grievance.final_category.routing_type:
        routing_type_str = grievance.final_category.routing_type.value
    elif grievance.category and grievance.category.routing_type:
        routing_type_str = grievance.category.routing_type.value

    # Determine capability permissions
    can_resolve = not is_resolved_or_closed
    can_close = (
        current_user.role == UserRole.MANAGER
        and grievance.status in {
            GrievanceStatus.RESOLVED,
            GrievanceStatus.PENDING_REVIEW,
            GrievanceStatus.ASSIGNED,
            GrievanceStatus.IN_PROGRESS,
        }
    )
    can_escalate = (
        not is_resolved_or_closed
        and current_user.role in {
            UserRole.ASSISTANT_DEAN,
            UserRole.ASSOCIATE_DEAN,
        }
    )

    next_authority_dict = None
    if next_authority is not None:
        next_authority_dict = {
            "id": next_authority.id,
            "name": next_authority.full_name,
            "role": next_authority.role.value,
            "email": next_authority.email,
        }

    return {
        "can_forward": can_forward,
        "can_resolve": can_resolve,
        "can_close": can_close,
        "can_escalate": can_escalate,
        "routing_type": routing_type_str,
        "next_authority_id": next_authority.id if next_authority else None,
        "next_authority_role": next_authority.role.value if next_authority else None,
        "next_authority_name": next_authority.full_name if next_authority else None,
        "next_authority": next_authority_dict,
    }