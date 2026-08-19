from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.permissions import Permission
from app.db.database import get_db

from app.models.grievance import (
    Grievance,
    GrievancePriority,
)
from app.models.grievance_status_history import GrievanceStatusHistory
from app.models.enums import GrievanceStatus
from app.models.user import User, UserRole

from app.schemas.grievance import (
    GrievanceCreate,
    GrievanceResponse,
)
from app.schemas.ai_processing import AIProcessingResponse

from app.services.grievance_workflow import change_grievance_status

from app.schemas.escalation import EscalationRequest
from app.services.escalation_service import escalate_grievance
from app.services.ai_processing import (
    process_grievance,
    run_ai_processing_background,
)


from app.models.grievance import Grievance
from app.schemas.grievance import (
    GrievanceCreate,
    GrievanceResponse,
    AIReviewRequest,
    AIReviewDecision,
)

from app.models.ai_processing import AIProcessingRecord

from app.models.audit_log import AuditLog

from app.models.category import Category

from app.services.authority_routing import get_routing_response


router = APIRouter(
    prefix="/grievances",
    tags=["Grievances"],
)

def generate_grievance_id() -> str:
    """Generate a unique human-readable grievance ID."""
    return f"GRV-{uuid4().hex[:10].upper()}"


# ============================================================
# CREATE GRIEVANCE
# ============================================================

@router.post(
    "",
    response_model=GrievanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_grievance(
    grievance_data: GrievanceCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(
        require_permission(Permission.CREATE_GRIEVANCE)
    ),
    db: Session = Depends(get_db),
):
    grievance = Grievance(
        grievance_id=generate_grievance_id(),
        applicant_id=current_user.id,
        subject_id=current_user.subject_id,
        title=grievance_data.title,
        description=grievance_data.description,
        status=GrievanceStatus.SUBMITTED,
        priority=GrievancePriority.MEDIUM,
    )

    db.add(grievance)
    db.flush()

    # Create initial status history
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

    # ---------------------------------------------
# Start AI processing automatically
# AFTER grievance is committed
# ---------------------------------------------

    background_tasks.add_task(
        run_ai_processing_background,
        grievance.id,
    )


    return grievance


# ============================================================
# GET MY GRIEVANCES
# ============================================================

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
        .where(
            Grievance.applicant_id == current_user.id
        )
        .order_by(
            Grievance.created_at.desc()
        )
    ).all()

    return grievances


# ============================================================
# GET ALL GRIEVANCES
# ============================================================

@router.get(
    "/all",
    response_model=list[GrievanceResponse],
)
def get_all_grievances(
    current_user: User = Depends(
        require_permission(Permission.VIEW_GRIEVANCE)
    ),
    db: Session = Depends(get_db),
):
    # Applicants can only view their own grievances.
    if current_user.role == UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Applicants can only view their own grievances",
        )

    grievances = db.scalars(
        select(Grievance)
        .order_by(
            Grievance.created_at.desc()
        )
    ).all()

    return grievances


# ============================================================
# GET SINGLE GRIEVANCE
# ============================================================

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
            Grievance.grievance_id == grievance_id
        )
    )

    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    # Applicant can only access their own grievance.
    if (
        current_user.role == UserRole.APPLICANT
        and grievance.applicant_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    # --------------------------------------------------
    # Latest AI processing record
    # --------------------------------------------------

    ai_processing = db.scalar(
        select(AIProcessingRecord)
        .where(
            AIProcessingRecord.grievance_id == grievance.id
        )
        .order_by(
            AIProcessingRecord.created_at.desc()
        )
    )

    response = GrievanceResponse.model_validate(
        grievance
    )

    response.ai_processing = ai_processing

    response.routing = get_routing_response(
    db=db,
    grievance=grievance,
    current_user=current_user,
    )

    return response


# ============================================================
# GET GRIEVANCE HISTORY
# ============================================================

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
            Grievance.grievance_id == grievance_id
        )
    )

    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    # Applicant can only view history of their own grievance.
    if (
        current_user.role == UserRole.APPLICANT
        and grievance.applicant_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    history = db.scalars(
        select(GrievanceStatusHistory)
        .where(
            GrievanceStatusHistory.grievance_id == grievance.id
        )
        .order_by(
            GrievanceStatusHistory.created_at.asc()
        )
    ).all()

    return history


# ============================================================
# UPDATE GRIEVANCE STATUS
# ============================================================

@router.patch(
    "/{grievance_id}/status",
    response_model=GrievanceResponse,
)
def update_grievance_status(
    grievance_id: str,
    new_status: GrievanceStatus,
    current_user: User = Depends(
        require_permission(Permission.UPDATE_GRIEVANCE)
    ),
    db: Session = Depends(get_db),
):
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

    change_grievance_status(
        db=db,
        grievance=grievance,
        new_status=new_status,
        changed_by=current_user,
        reason=f"Status changed to {new_status.value}",
    )

    db.commit()
    db.refresh(grievance)

    return grievance


# ============================================================
# PROCESS GRIEVANCE USING AI
# ============================================================

@router.post(
    "/{grievance_id}/process-ai",
    response_model=AIProcessingResponse,
)
def process_grievance_ai(
    grievance_id: str,
    current_user: User = Depends(
        require_permission(
            Permission.REVIEW_AI_RECOMMENDATION
        )
    ),
    db: Session = Depends(get_db),
):
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

    # AI processing can only start from SUBMITTED.
    if grievance.status != GrievanceStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "AI processing can only start from "
                f"SUBMITTED status. "
                f"Current status: {grievance.status.value}"
            ),
        )

    # SUBMITTED -> AI_PROCESSING
    change_grievance_status(
        db=db,
        grievance=grievance,
        new_status=GrievanceStatus.AI_PROCESSING,
        changed_by=current_user,
        reason="AI processing started",
    )

    # Run AI processing
    record = process_grievance(
        db=db,
        grievance=grievance,
    )

    # AI_PROCESSING -> PENDING_REVIEW
    change_grievance_status(
        db=db,
        grievance=grievance,
        new_status=GrievanceStatus.PENDING_REVIEW,
        changed_by=current_user,
        reason="AI processing completed",
    )

    db.commit()
    db.refresh(record)

    return record

# ============================================================
# REVIEW AI RECOMMENDATION
# ============================================================

@router.patch(
    "/{grievance_id}/ai-review",
    response_model=GrievanceResponse,
)
def review_ai_recommendation(
    grievance_id: str,
    review_data: AIReviewRequest,
    current_user: User = Depends(
        require_permission(
            Permission.REVIEW_AI_RECOMMENDATION
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
    # 2. AI processing must exist and be completed
    # --------------------------------------------------

    ai_processing = db.scalar(
        select(AIProcessingRecord)
        .where(
            AIProcessingRecord.grievance_id
            == grievance.id
        )
        .order_by(
            AIProcessingRecord.created_at.desc()
        )
    )

    if ai_processing is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI processing record not found",
        )

    if ai_processing.status.value != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "AI recommendation is not ready for review. "
                f"Current AI status: "
                f"{ai_processing.status.value}"
            ),
        )

        # --------------------------------------------------
    # 3. Manager-only review
    # --------------------------------------------------

    if current_user.role != UserRole.MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Manager can review AI category",
        )

    # --------------------------------------------------
    # 4. Prevent duplicate review
    # --------------------------------------------------

    if grievance.category_reviewed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI category has already been reviewed",
        )

    # --------------------------------------------------
    # 5. Validate category
    # --------------------------------------------------

    category = db.scalar(
        select(Category).where(
            Category.id == review_data.category_id,
            Category.is_active.is_(True),
        )
    )

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or inactive category",
        )

    # --------------------------------------------------
    # 6. Validate review decision
    # --------------------------------------------------

    if review_data.decision == AIReviewDecision.CONFIRMED:

        if (
            ai_processing.predicted_category_id
            != review_data.category_id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "For CONFIRMED decision, category must "
                    "match the AI recommendation."
                ),
            )

    # --------------------------------------------------
    # 7. Store original AI category
    # --------------------------------------------------

    ai_category = db.scalar(
        select(Category).where(
            Category.id == ai_processing.predicted_category_id
        )
    )

    ai_category_name = (
        ai_category.name
        if ai_category is not None
        else "None"
    )

    # --------------------------------------------------
    # 8. Store Manager's final category decision
    # --------------------------------------------------

    grievance.final_category_id = category.id
    grievance.category_reviewed = True

    if review_data.decision == AIReviewDecision.CONFIRMED:

        grievance.category_overridden = False

        description = (
            f"AI category confirmed by Manager. "
            f"Final category: {category.name}."
        )

        action = "AI_CATEGORY_CONFIRMED"

    else:

        grievance.category_overridden = True

        description = (
            f"AI category overridden by Manager. "
            f"AI category: {ai_category_name}. "
            f"Final category: {category.name}."
        )

        action = "AI_CATEGORY_OVERRIDDEN"

    db.add(grievance)

    # --------------------------------------------------
    # 9. Create audit log
    # --------------------------------------------------

    audit_log = AuditLog(
        user_id=current_user.id,
        grievance_id=grievance.id,
        action=action,
        entity_type="GRIEVANCE",
        entity_id=grievance.id,
        description=description,
    )

    db.add(audit_log)

    # --------------------------------------------------
    # 10. Commit
    # --------------------------------------------------

    db.commit()
    db.refresh(grievance)

    # --------------------------------------------------
    # 9. Get latest AI processing record
    # --------------------------------------------------

    ai_processing = db.scalar(
        select(AIProcessingRecord)
        .where(
            AIProcessingRecord.grievance_id == grievance.id
        )
        .order_by(
            AIProcessingRecord.created_at.desc()
        )
    )

    # --------------------------------------------------
    # 10. Build response
    # --------------------------------------------------

    response = GrievanceResponse.model_validate(
        grievance
    )

    response.ai_processing = ai_processing

    response.routing = get_routing_response(
    db=db,
    grievance=grievance,
    current_user=current_user,
    )

    return response

# ============================================================
# ESCALATE GRIEVANCE
# ============================================================

@router.post(
    "/{grievance_id}/escalate",
    response_model=GrievanceResponse,
)
def escalate_grievance_api(
    grievance_id: str,
    escalation_data: EscalationRequest,
    current_user: User = Depends(
        require_permission(
            Permission.INITIATE_ESCALATION
        )
    ),
    db: Session = Depends(get_db),
):
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

    escalate_grievance(
        db=db,
        grievance=grievance,
        current_user=current_user,
        reason=escalation_data.reason,
        remarks=escalation_data.remarks,
    )

    db.commit()
    db.refresh(grievance)

    response = GrievanceResponse.model_validate(
    grievance
    )

    response.routing = get_routing_response(
    db=db,
    grievance=grievance,
    )

    return grievance
