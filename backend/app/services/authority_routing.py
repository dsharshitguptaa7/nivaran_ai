from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import (
    Category,
    CategoryRoutingType,
)
from app.models.grievance import Grievance
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
    Find the fixed authority configured for the final category.
    """

    if grievance.final_category_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Final grievance category is not set.",
        )

    category = db.scalar(
        select(Category)
        .where(
            Category.id == grievance.final_category_id,
            Category.is_active.is_(True),
        )
    )

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Final grievance category not found or inactive.",
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

    if grievance.final_category_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Final grievance category is not set.",
        )

    category = db.scalar(
        select(Category)
        .where(
            Category.id == grievance.final_category_id,
            Category.is_active.is_(True),
        )
    )

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Final grievance category not found or inactive.",
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

def get_routing_response(
    db: Session,
    grievance: Grievance,
    current_user: User,
) -> dict:

    """
    Determine the routing target and action capabilities based on
    the current authority level.
    """

    # ========================================================
    # MANAGER → ASSISTANT DEAN
    # ========================================================

    if current_user.role == UserRole.MANAGER:

        assistant_dean = get_expected_assistant_dean(
            db=db,
            grievance=grievance,
        )

        return {
            "can_forward": True,
            "can_resolve": True,
            "can_close": True,
            "can_escalate": False,
            "routing_type": "SUBJECT_ASSISTANT_DEAN",
            "next_authority_id": assistant_dean.id,
            "next_authority_role": UserRole.ASSISTANT_DEAN.value,
            "next_authority_name": assistant_dean.full_name,
        }

    # ========================================================
    # DEAN
    # ========================================================

    if current_user.role == UserRole.DEAN:
        return {
            "can_forward": False,
            "can_resolve": True,
            "can_close": True,
            "can_escalate": False,
            "routing_type": None,
            "next_authority_id": None,
            "next_authority_role": None,
            "next_authority_name": None,
        }

    # ========================================================
    # ASSOCIATE DEAN
    # ========================================================

    if current_user.role == UserRole.ASSOCIATE_DEAN:
        # Associate Dean can forward/escalate to Dean or resolve directly
        dean = db.scalar(
            select(User).where(
                User.role == UserRole.DEAN,
                User.is_active.is_(True),
            )
        )

        return {
            "can_forward": True,
            "can_resolve": True,
            "can_close": False,
            "can_escalate": True,
            "routing_type": "DEAN",
            "next_authority_id": dean.id if dean else None,
            "next_authority_role": UserRole.DEAN.value,
            "next_authority_name": dean.full_name if dean else "Dean",
        }

    # ========================================================
    # NO FINAL CATEGORY (for Assistant Dean or other)
    # ========================================================

    if grievance.final_category_id is None:
        return {
            "can_forward": False,
            "can_resolve": True,
            "can_close": False,
            "can_escalate": True,
            "routing_type": None,
            "next_authority_id": None,
            "next_authority_role": None,
            "next_authority_name": None,
        }

    # ========================================================
    # GET FINAL CATEGORY
    # ========================================================

    category = db.scalar(
        select(Category)
        .where(
            Category.id == grievance.final_category_id,
            Category.is_active.is_(True),
        )
    )

    if category is None:
        return {
            "can_forward": False,
            "can_resolve": True,
            "can_close": False,
            "can_escalate": True,
            "routing_type": None,
            "next_authority_id": None,
            "next_authority_role": None,
            "next_authority_name": None,
        }

    # ========================================================
    # SUBJECT ASSISTANT DEAN
    # ========================================================

    if (
        category.routing_type
        == CategoryRoutingType.SUBJECT_ASSISTANT_DEAN
    ):
        return {
            "can_forward": False,
            "can_resolve": True,
            "can_close": False,
            "can_escalate": True,
            "routing_type": category.routing_type.value,
            "next_authority_id": None,
            "next_authority_role": None,
            "next_authority_name": None,
        }

    # ========================================================
    # GRIEVANCE CLUSTER → ASSOCIATE DEAN
    # ========================================================

    if (
        category.routing_type
        == CategoryRoutingType.GRIEVANCE_CLUSTER
    ):

        if category.grievance_cluster_id is None:
            return {
                "can_forward": False,
                "can_resolve": True,
                "can_close": False,
                "can_escalate": True,
                "routing_type": category.routing_type.value,
                "next_authority_id": None,
                "next_authority_role": None,
                "next_authority_name": None,
            }

        grievance_cluster = db.scalar(
            select(GrievanceCluster)
            .where(
                GrievanceCluster.id
                == category.grievance_cluster_id,
                GrievanceCluster.is_active.is_(True),
            )
        )

        if grievance_cluster is None:
            return {
                "can_forward": False,
                "can_resolve": True,
                "can_close": False,
                "can_escalate": True,
                "routing_type": category.routing_type.value,
                "next_authority_id": None,
                "next_authority_role": None,
                "next_authority_name": None,
            }

        associate_dean = db.scalar(
            select(User)
            .where(
                User.id
                == grievance_cluster.associate_dean_id,
                User.role
                == UserRole.ASSOCIATE_DEAN,
                User.is_active.is_(True),
            )
        )

        if associate_dean is None:
            return {
                "can_forward": False,
                "can_resolve": True,
                "can_close": False,
                "can_escalate": True,
                "routing_type": category.routing_type.value,
                "next_authority_id": None,
                "next_authority_role": None,
                "next_authority_name": None,
            }

        return {
            "can_forward": True,
            "can_resolve": True,
            "can_close": False,
            "can_escalate": True,
            "routing_type": category.routing_type.value,
            "next_authority_id": associate_dean.id,
            "next_authority_role": UserRole.ASSOCIATE_DEAN.value,
            "next_authority_name": associate_dean.full_name,
        }

    # ========================================================
    # FIXED AUTHORITY
    # ========================================================

    if (
        category.routing_type
        == CategoryRoutingType.FIXED_AUTHORITY
    ):

        if category.fixed_authority_id is None:
            return {
                "can_forward": False,
                "can_resolve": True,
                "can_close": False,
                "can_escalate": True,
                "routing_type": category.routing_type.value,
                "next_authority_id": None,
                "next_authority_role": None,
                "next_authority_name": None,
            }

        authority = db.scalar(
            select(User)
            .where(
                User.id == category.fixed_authority_id,
                User.is_active.is_(True),
            )
        )

        if authority is None:
            return {
                "can_forward": False,
                "can_resolve": True,
                "can_close": False,
                "can_escalate": True,
                "routing_type": category.routing_type.value,
                "next_authority_id": None,
                "next_authority_role": None,
                "next_authority_name": None,
            }

        return {
            "can_forward": True,
            "can_resolve": True,
            "can_close": False,
            "can_escalate": True,
            "routing_type": category.routing_type.value,
            "next_authority_id": authority.id,
            "next_authority_role": authority.role.value,
            "next_authority_name": authority.full_name,
        }

    return {
        "can_forward": False,
        "can_resolve": True,
        "can_close": False,
        "can_escalate": True,
        "routing_type": None,
        "next_authority_id": None,
        "next_authority_role": None,
        "next_authority_name": None,
    }