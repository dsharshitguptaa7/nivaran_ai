from datetime import datetime, timezone
import uuid
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
from app.models.documents import Document
from app.models.document_request import DocumentRequest
from app.models.notification import NotificationType
from app.services.notification_service import create_notification
from app.services.email_service import (
    send_grievance_resolved_email,
    send_grievance_closed_email,
)
from app.services.document_request_service import build_document_request_response

from app.schemas.grievance import (
    GrievanceCreate,
    GrievanceResponse,
    ApplicantSummaryResponse,
    DocumentResponse,
    AIReviewRequest,
    AIReviewDecision,
    GrievanceResolveRequest,
    GrievanceCloseRequest,
    GrievanceReopenRequest,
    GrievanceHistoryItemResponse,
)
from app.schemas.ai_processing import AIProcessingResponse
from app.schemas.escalation import EscalationRequest

from app.services.grievance_workflow import change_grievance_status
from app.services.escalation_service import escalate_grievance
from app.services.ai_processing import (
    process_grievance,
    run_ai_processing_background,
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


def build_full_grievance_response(
    db: Session,
    grievance: Grievance,
    current_user: User | None = None,
) -> GrievanceResponse:
    """Build a rich GrievanceResponse including documents, document requests, resolution/closure details, and routing."""
    ai_processing = db.scalar(
        select(AIProcessingRecord)
        .where(AIProcessingRecord.grievance_id == grievance.id)
        .order_by(AIProcessingRecord.created_at.desc())
    )

    documents = db.scalars(
        select(Document)
        .where(Document.grievance_id == grievance.id)
        .order_by(Document.created_at.asc())
    ).all()

    doc_dtos = [
        DocumentResponse(
            id=d.id,
            grievance_id=d.grievance_id,
            uploaded_by=d.uploaded_by,
            uploader_name=d.uploader.full_name if d.uploader else None,
            file_name=d.file_name,
            file_path=d.file_path,
            mime_type=d.mime_type,
            file_size=d.file_size,
            document_type=d.document_type or "ATTACHMENT",
            created_at=d.created_at,
        )
        for d in documents
    ]

    doc_requests = db.scalars(
        select(DocumentRequest)
        .where(DocumentRequest.grievance_id == grievance.id)
        .order_by(DocumentRequest.created_at.desc())
    ).all()

    response = GrievanceResponse.model_validate(grievance)
    response.ai_processing = ai_processing
    response.documents = doc_dtos
    response.document_requests = [build_document_request_response(dr) for dr in doc_requests]
    response.resolved_by_name = grievance.resolved_by.full_name if grievance.resolved_by else None
    response.closed_by_name = grievance.closed_by.full_name if grievance.closed_by else None

    if grievance.applicant:
        subj_name = None
        if grievance.subject:
            subj_name = grievance.subject.name
        elif grievance.applicant.subject:
            subj_name = grievance.applicant.subject.name

        response.applicant = ApplicantSummaryResponse(
            id=grievance.applicant.id,
            full_name=grievance.applicant.full_name,
            email=grievance.applicant.email,
            phd_registration_number=grievance.applicant.phd_registration_number,
            subject_name=subj_name,
            department=grievance.applicant.department,
        )
        response.subject_name = subj_name

    if current_user is not None:
        try:
            routing_data = get_routing_response(
                db=db,
                grievance=grievance,
                current_user=current_user,
            )
            response.routing = (
                GrievanceRoutingResponse.model_validate(routing_data)
                if routing_data
                else None
            )
        except Exception:
            response.routing = None

    return response


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

    # Automatically run instant AI processing
    try:
        change_grievance_status(
            db=db,
            grievance=grievance,
            new_status=GrievanceStatus.AI_PROCESSING,
            changed_by=None,
            actor_type=HistoryActorType.SYSTEM,
            reason="AI processing started automatically",
        )
        process_grievance(db=db, grievance=grievance)
        change_grievance_status(
            db=db,
            grievance=grievance,
            new_status=GrievanceStatus.PENDING_REVIEW,
            changed_by=None,
            actor_type=HistoryActorType.SYSTEM,
            reason="AI processing completed automatically",
        )
    except Exception as e:
        logger.error(f"[AI Processing] Auto-classification error on creation: {e}")
        if grievance.status != GrievanceStatus.PENDING_REVIEW:
            change_grievance_status(
                db=db,
                grievance=grievance,
                new_status=GrievanceStatus.PENDING_REVIEW,
                changed_by=None,
                actor_type=HistoryActorType.SYSTEM,
                reason="Grievance queued for Manager review",
            )

    # Notify applicant
    create_notification(
        db=db,
        user_id=current_user.id,
        notification_type=NotificationType.GRIEVANCE_SUBMITTED,
        title="Grievance Submitted",
        message=f"Your grievance {grievance.grievance_id} has been successfully submitted and is under review.",
        grievance_id=grievance.id,
    )

    db.commit()
    db.refresh(grievance)

    return build_full_grievance_response(db, grievance, current_user)


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

    return [build_full_grievance_response(db, g, current_user) for g in grievances]


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

    return [build_full_grievance_response(db, g, current_user) for g in grievances]


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
            (Grievance.grievance_id == grievance_id)
            | (Grievance.id == (uuid.UUID(grievance_id) if len(grievance_id) == 36 else None))
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

    return build_full_grievance_response(db, grievance, current_user)


# ============================================================
# GET GRIEVANCE HISTORY
# ============================================================

@router.get(
    "/{grievance_id}/history",
    response_model=list[GrievanceHistoryItemResponse],
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
            (Grievance.grievance_id == grievance_id)
            | (Grievance.id == (uuid.UUID(grievance_id) if len(grievance_id) == 36 else None))
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

    history_records = db.scalars(
        select(GrievanceStatusHistory)
        .where(
            GrievanceStatusHistory.grievance_id == grievance.id
        )
        .order_by(
            GrievanceStatusHistory.created_at.asc()
        )
    ).all()

    # Preload user mapping for actor names
    user_ids = {h.changed_by for h in history_records if h.changed_by is not None}
    users_map = {}
    if user_ids:
        users = db.scalars(select(User).where(User.id.in_(user_ids))).all()
        users_map = {u.id: u for u in users}

    result = []
    for h in history_records:
        actor = users_map.get(h.changed_by)
        actor_name = actor.full_name if actor else None
        actor_role = actor.role.value if actor else None

        reason_str = h.reason or ""
        is_forward_event = (
            reason_str.startswith("Forwarded by")
            or "forwarded to" in reason_str.lower()
            or reason_str.lower().startswith("grievance forwarded")
        )

        display_status = "FORWARDED" if is_forward_event else h.new_status.value
        event_type = "FORWARDED" if is_forward_event else h.new_status.value

        result.append(
            GrievanceHistoryItemResponse(
                id=h.id,
                grievance_id=h.grievance_id,
                previous_status=h.previous_status,
                new_status=h.new_status,
                status=display_status,
                event_type=event_type,
                changed_by=h.changed_by,
                actor_name=actor_name,
                actor_role=actor_role,
                reason=h.reason,
                created_at=h.created_at,
            )
        )

    return result


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
            (Grievance.grievance_id == grievance_id)
            | (Grievance.id == (uuid.UUID(grievance_id) if len(grievance_id) == 36 else None))
        )
    )

    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    # Allow AI processing on SUBMITTED, AI_PROCESSING, or PENDING_REVIEW
    allowed_statuses = {
        GrievanceStatus.SUBMITTED,
        GrievanceStatus.AI_PROCESSING,
        GrievanceStatus.PENDING_REVIEW,
    }
    if grievance.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "AI processing can only run on SUBMITTED, AI_PROCESSING, or PENDING_REVIEW grievances. "
                f"Current status: {grievance.status.value}"
            ),
        )

    # SUBMITTED -> AI_PROCESSING (if starting from SUBMITTED)
    if grievance.status == GrievanceStatus.SUBMITTED:
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

    # Transition to PENDING_REVIEW if not already there
    if grievance.status != GrievanceStatus.PENDING_REVIEW:
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
    # 4. Handle review status
    # --------------------------------------------------

    if grievance.category_reviewed and grievance.status not in {
        GrievanceStatus.PENDING_REVIEW,
        GrievanceStatus.ASSIGNED,
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI category cannot be reviewed in current status",
        )

    # --------------------------------------------------
    # 5. Validate category
    # --------------------------------------------------

    target_category_id = (
        review_data.category_id
        or ai_processing.predicted_category_id
        or grievance.category_id
    )

    if target_category_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category ID must be provided or predicted by AI.",
        )

    category = db.scalar(
        select(Category).where(
            Category.id == target_category_id,
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

    is_confirmed_decision = review_data.decision in {
        AIReviewDecision.CONFIRMED,
        AIReviewDecision.ACCEPTED,
    }

    if is_confirmed_decision:
        if (
            ai_processing.predicted_category_id
            and ai_processing.predicted_category_id != category.id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "For CONFIRMED/ACCEPTED decision, category must "
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

    if is_confirmed_decision:

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

    return build_full_grievance_response(db, grievance, current_user)


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
            (Grievance.grievance_id == grievance_id)
            | (Grievance.id == (uuid.UUID(grievance_id) if len(grievance_id) == 36 else None))
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

    return build_full_grievance_response(db, grievance, current_user)


# ============================================================
# RESOLVE GRIEVANCE (At any authority level)
# ============================================================

@router.post(
    "/{grievance_id}/resolve",
    response_model=GrievanceResponse,
)
def resolve_grievance_api(
    grievance_id: str,
    resolve_data: GrievanceResolveRequest,
    current_user: User = Depends(
        require_permission(
            Permission.RESOLVE_GRIEVANCE
        )
    ),
    db: Session = Depends(get_db),
):
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

    solvable_statuses = {
        GrievanceStatus.ASSIGNED,
        GrievanceStatus.IN_PROGRESS,
        GrievanceStatus.ESCALATED,
        GrievanceStatus.PENDING_REVIEW,
        GrievanceStatus.AWAITING_INFORMATION,
        GrievanceStatus.REOPENED,
    }

    if grievance.status not in solvable_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Grievance cannot be resolved from status: {grievance.status.value}",
        )

    previous_status = grievance.status

    change_grievance_status(
        db=db,
        grievance=grievance,
        new_status=GrievanceStatus.RESOLVED,
        changed_by=current_user,
        reason=f"Resolved by {current_user.full_name}: {resolve_data.resolution_notes}",
    )

    grievance.resolution_notes = resolve_data.resolution_notes
    grievance.resolved_by_id = current_user.id
    grievance.resolved_at = datetime.now(timezone.utc)
    db.add(grievance)

    # Audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        grievance_id=grievance.id,
        action="GRIEVANCE_RESOLVED",
        entity_type="GRIEVANCE",
        entity_id=grievance.id,
        description=(
            f"Grievance {grievance.grievance_id} resolved by {current_user.full_name} "
            f"({current_user.role.value}). Resolution: {resolve_data.resolution_notes}"
        ),
    )
    db.add(audit_log)

    # Notify applicant (In-App)
    create_notification(
        db=db,
        user_id=grievance.applicant_id,
        notification_type=NotificationType.GRIEVANCE_RESOLVED,
        title="Grievance Resolved",
        message=(
            f"Your grievance {grievance.grievance_id} has been resolved by "
            f"{current_user.full_name}. Resolution: {resolve_data.resolution_notes}"
        ),
        grievance_id=grievance.id,
    )

    # Send applicant email notification if status transitioned to RESOLVED
    if previous_status != GrievanceStatus.RESOLVED and grievance.status == GrievanceStatus.RESOLVED:
        try:
            applicant_user = db.scalar(select(User).where(User.id == grievance.applicant_id))
            if applicant_user and applicant_user.email:
                send_grievance_resolved_email(
                    applicant_email=applicant_user.email,
                    applicant_name=applicant_user.full_name,
                    grievance_id=grievance.grievance_id,
                    grievance_title=grievance.title,
                    resolution_notes=resolve_data.resolution_notes,
                )
        except Exception as email_err:
            print(f"[GRIEVANCE_RESOLVED_EMAIL_ERROR]: {email_err}")

    # Notify all active managers about the resolved grievance for closure review
    managers = db.scalars(
        select(User).where(
            User.role == UserRole.MANAGER,
            User.is_active.is_(True),
        )
    ).all()

    for mgr in managers:
        create_notification(
            db=db,
            user_id=mgr.id,
            notification_type=NotificationType.GRIEVANCE_RESOLVED,
            title="Grievance Resolved - Awaiting Closure Review",
            message=(
                f"Grievance {grievance.grievance_id} was solved by {current_user.full_name} "
                f"({current_user.role.value}). Please review and perform final closure."
            ),
            grievance_id=grievance.id,
        )

    db.commit()
    db.refresh(grievance)

    return build_full_grievance_response(db, grievance, current_user)


# ============================================================
# CLOSE GRIEVANCE (Manager Authority)
# ============================================================

@router.post(
    "/{grievance_id}/close",
    response_model=GrievanceResponse,
)
def close_grievance_api(
    grievance_id: str,
    close_data: GrievanceCloseRequest,
    current_user: User = Depends(
        require_permission(
            Permission.CLOSE_GRIEVANCE
        )
    ),
    db: Session = Depends(get_db),
):
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

    allowed_close_statuses = {
        GrievanceStatus.RESOLVED,
        GrievanceStatus.PENDING_REVIEW,
        GrievanceStatus.IN_PROGRESS,
        GrievanceStatus.ASSIGNED,
    }

    if grievance.status not in allowed_close_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Grievance cannot be closed from status: {grievance.status.value}",
        )

    remarks = close_data.closure_remarks or "Resolution verified and grievance closed by Manager."

    previous_status = grievance.status

    change_grievance_status(
        db=db,
        grievance=grievance,
        new_status=GrievanceStatus.CLOSED,
        changed_by=current_user,
        reason=f"Closed by {current_user.full_name}: {remarks}",
    )

    grievance.closure_remarks = remarks
    grievance.closed_by_id = current_user.id
    grievance.closed_at = datetime.now(timezone.utc)
    db.add(grievance)

    # Audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        grievance_id=grievance.id,
        action="GRIEVANCE_CLOSED",
        entity_type="GRIEVANCE",
        entity_id=grievance.id,
        description=(
            f"Grievance {grievance.grievance_id} closed by {current_user.full_name} "
            f"({current_user.role.value}). Remarks: {remarks}"
        ),
    )
    db.add(audit_log)

    # Notify applicant (In-App)
    create_notification(
        db=db,
        user_id=grievance.applicant_id,
        notification_type=NotificationType.GRIEVANCE_CLOSED,
        title="Grievance Closed",
        message=(
            f"Your grievance {grievance.grievance_id} has been formally closed by "
            f"{current_user.full_name} ({current_user.role.value}). Remarks: {remarks}"
        ),
        grievance_id=grievance.id,
    )

    # Send applicant email notification if status transitioned to CLOSED
    if previous_status != GrievanceStatus.CLOSED and grievance.status == GrievanceStatus.CLOSED:
        try:
            applicant_user = db.scalar(select(User).where(User.id == grievance.applicant_id))
            if applicant_user and applicant_user.email:
                send_grievance_closed_email(
                    applicant_email=applicant_user.email,
                    applicant_name=applicant_user.full_name,
                    grievance_id=grievance.grievance_id,
                    grievance_title=grievance.title,
                    closure_remarks=remarks,
                )
        except Exception as email_err:
            print(f"[GRIEVANCE_CLOSED_EMAIL_ERROR]: {email_err}")

    db.commit()
    db.refresh(grievance)

    return build_full_grievance_response(db, grievance, current_user)


# ============================================================
# REOPEN GRIEVANCE (Manager or Applicant)
# ============================================================

@router.post(
    "/{grievance_id}/reopen",
    response_model=GrievanceResponse,
)
def reopen_grievance_api(
    grievance_id: str,
    reopen_data: GrievanceReopenRequest,
    current_user: User = Depends(
        require_permission(
            Permission.REOPEN_GRIEVANCE
        )
    ),
    db: Session = Depends(get_db),
):
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

    if current_user.role == UserRole.APPLICANT and grievance.applicant_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this grievance",
        )

    reopenable_statuses = {
        GrievanceStatus.RESOLVED,
        GrievanceStatus.CLOSED,
    }

    if grievance.status not in reopenable_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Grievance in status '{grievance.status.value}' cannot be reopened",
        )

    change_grievance_status(
        db=db,
        grievance=grievance,
        new_status=GrievanceStatus.REOPENED,
        changed_by=current_user,
        reason=f"Reopened by {current_user.full_name}: {reopen_data.reason}",
    )

    db.add(grievance)

    # Audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        grievance_id=grievance.id,
        action="GRIEVANCE_REOPENED",
        entity_type="GRIEVANCE",
        entity_id=grievance.id,
        description=(
            f"Grievance {grievance.grievance_id} reopened by {current_user.full_name} "
            f"({current_user.role.value}). Reason: {reopen_data.reason}"
        ),
    )
    db.add(audit_log)

    # Notify managers
    managers = db.scalars(
        select(User).where(
            User.role == UserRole.MANAGER,
            User.is_active.is_(True),
        )
    ).all()

    for mgr in managers:
        create_notification(
            db=db,
            user_id=mgr.id,
            notification_type=NotificationType.SYSTEM,
            title="Grievance Reopened",
            message=(
                f"Grievance {grievance.grievance_id} has been reopened by {current_user.full_name}. "
                f"Reason: {reopen_data.reason}"
            ),
            grievance_id=grievance.id,
        )

    db.commit()
    db.refresh(grievance)

    return build_full_grievance_response(db, grievance, current_user)
