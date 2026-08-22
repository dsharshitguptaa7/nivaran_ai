import logging
import time
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ai_processing import (
    AIProcessingRecord,
    AIProcessingStatus,
)
from app.models.grievance import Grievance
from app.models.category import Category

from app.ai.pipeline import ai_pipeline, DEFAULT_MODEL_NAME, DEFAULT_MODEL_VERSION

from app.db.database import SessionLocal
from app.models.enums import GrievanceStatus
from app.models.grievance_status_history import HistoryActorType
from app.services.grievance_workflow import change_grievance_status

logger = logging.getLogger("nivaran_ai.ai_processing")


def resolve_db_category(db: Session, predicted_name: str) -> Category:
    """
    Resiliently resolves a predicted category string to an active Category in the database.
    Attempts:
      1. Exact match
      2. Case-insensitive match
      3. Space/underscore normalized match
      4. Fallback to 'Other' or first active category
    """
    if not predicted_name:
        predicted_name = "Other"

    # 1. Exact match
    category = db.scalar(
        select(Category).where(
            Category.name == predicted_name,
            Category.is_active.is_(True),
        )
    )
    if category is not None:
        return category

    # 2. Case-insensitive match
    category = db.scalar(
        select(Category).where(
            func.lower(Category.name) == predicted_name.lower(),
            Category.is_active.is_(True),
        )
    )
    if category is not None:
        return category

    # 3. Space / underscore normalized match
    all_categories = db.scalars(
        select(Category).where(Category.is_active.is_(True))
    ).all()

    norm_pred = predicted_name.replace("_", " ").strip().lower()
    for cat in all_categories:
        if cat.name.replace("_", " ").strip().lower() == norm_pred:
            return cat

    # Partial substring match
    for cat in all_categories:
        cat_norm = cat.name.replace("_", " ").strip().lower()
        if norm_pred in cat_norm or cat_norm in norm_pred:
            return cat

    # 4. Fallback to 'Other' category
    other_category = db.scalar(
        select(Category).where(
            func.lower(Category.name) == "other",
            Category.is_active.is_(True),
        )
    )
    if other_category is not None:
        return other_category

    # Absolute fallback: return first active category
    if all_categories:
        return all_categories[0]

    raise ValueError("No active categories found in database to map grievance.")


def create_ai_processing_record(
    db: Session,
    grievance: Grievance,
) -> AIProcessingRecord:

    record = AIProcessingRecord(
        grievance_id=grievance.id,
        model_name=DEFAULT_MODEL_NAME,
        model_version=DEFAULT_MODEL_VERSION,
        status=AIProcessingStatus.PENDING,
    )

    db.add(record)
    db.flush()

    return record


def start_ai_processing(
    db: Session,
    record: AIProcessingRecord,
) -> AIProcessingRecord:

    record.status = AIProcessingStatus.PROCESSING

    db.add(record)
    db.flush()

    return record


def complete_ai_processing(
    db: Session,
    record: AIProcessingRecord,
    predicted_category_id: UUID | None = None,
    confidence_score: float | None = None,
    processing_time_ms: int | None = None,
    grievance: Grievance | None = None,
) -> AIProcessingRecord:

    record.predicted_category_id = predicted_category_id
    record.confidence_score = confidence_score
    record.processing_time_ms = processing_time_ms
    record.status = AIProcessingStatus.COMPLETED
    record.error_message = None

    # Sync AI category result back to grievance directly
    target_grievance = grievance or record.grievance
    if target_grievance is None and record.grievance_id:
        target_grievance = db.scalar(select(Grievance).where(Grievance.id == record.grievance_id))

    if target_grievance is not None:
        target_grievance.category_id = predicted_category_id
        target_grievance.ai_confidence = confidence_score
        if not target_grievance.final_category_id:
            target_grievance.final_category_id = predicted_category_id
        db.add(target_grievance)

    db.add(record)
    db.flush()

    return record


def fail_ai_processing(
    db: Session,
    record: AIProcessingRecord,
    error_message: str,
    processing_time_ms: int | None = None,
) -> AIProcessingRecord:

    record.status = AIProcessingStatus.FAILED
    record.error_message = error_message
    record.processing_time_ms = processing_time_ms

    db.add(record)
    db.flush()

    return record


def process_grievance(
    db: Session,
    grievance: Grievance,
) -> AIProcessingRecord:

    start_time = time.perf_counter()

    record = create_ai_processing_record(
        db=db,
        grievance=grievance,
    )

    start_ai_processing(
        db=db,
        record=record,
    )

    try:
        # --------------------------------------------------
        # 1. UNIFIED AI INFERENCE (Category + Confidence)
        # --------------------------------------------------
        ai_result = ai_pipeline.process_grievance_text(
            title=grievance.title,
            description=grievance.description,
        )

        category_name = ai_result["predicted_category"]
        confidence_score = ai_result["confidence_score"]

        # --------------------------------------------------
        # 2. RESILIENT CATEGORY RESOLUTION
        # --------------------------------------------------
        category = resolve_db_category(
            db=db,
            predicted_name=category_name,
        )

        processing_time_ms = int(
            (time.perf_counter() - start_time) * 1000
        )

        # --------------------------------------------------
        # 3. COMPLETE AI RECORD
        # --------------------------------------------------
        complete_ai_processing(
            db=db,
            record=record,
            predicted_category_id=category.id,
            confidence_score=confidence_score,
            processing_time_ms=processing_time_ms,
            grievance=grievance,
        )

        # Explicit direct synchronization on grievance
        grievance.category_id = category.id
        grievance.ai_confidence = confidence_score
        if not grievance.final_category_id:
            grievance.final_category_id = category.id
        db.add(grievance)
        db.flush()

        return record

    except Exception as e:
        logger.error(f"[AI] Error during process_grievance for {grievance.grievance_id}: {e}")
        processing_time_ms = int(
            (time.perf_counter() - start_time) * 1000
        )

        fail_ai_processing(
            db=db,
            record=record,
            error_message=str(e),
            processing_time_ms=processing_time_ms,
        )

        raise


def run_ai_processing_background(
    grievance_id: UUID,
) -> None:

    print(f"[AI] Background task started: {grievance_id}")

    db = SessionLocal()

    try:

        print("[AI] Fetching grievance...")

        grievance = db.scalar(
            select(Grievance).where(
                Grievance.id == grievance_id
            )
        )

        if grievance is None:
            print("[AI] Grievance not found")
            return

        print(
            f"[AI] Grievance found: "
            f"{grievance.grievance_id}"
        )

        if grievance.status != GrievanceStatus.SUBMITTED:
            print(
                f"[AI] Skipping. Current status: "
                f"{grievance.status}"
            )
            return

        print(
            "[AI] Changing status: "
            "SUBMITTED -> AI_PROCESSING"
        )

        change_grievance_status(
            db=db,
            grievance=grievance,
            new_status=GrievanceStatus.AI_PROCESSING,
            changed_by=None,
            actor_type=HistoryActorType.SYSTEM,
            reason="AI processing started automatically",
        )

        db.commit()

        print("[AI] Status committed: AI_PROCESSING")

        print("[AI] Calling process_grievance()...")

        record = process_grievance(
            db=db,
            grievance=grievance,
        )

        print(
            f"[AI] process_grievance() completed. "
            f"Record status: {record.status}"
        )

        print(
            "[AI] Changing status: "
            "AI_PROCESSING -> PENDING_REVIEW"
        )

        change_grievance_status(
            db=db,
            grievance=grievance,
            new_status=GrievanceStatus.PENDING_REVIEW,
            changed_by=None,
            actor_type=HistoryActorType.SYSTEM,
            reason="AI processing completed automatically",
        )

        db.commit()

        print("[AI] Final status committed: PENDING_REVIEW")
        print("[AI] Background task completed successfully")

    except Exception as e:

        print(
            f"[AI] ERROR for grievance "
            f"{grievance_id}: {e}"
        )

        db.rollback()

        try:

            grievance = db.scalar(
                select(Grievance).where(
                    Grievance.id == grievance_id
                )
            )

            if (
                grievance is not None
                and grievance.status
                == GrievanceStatus.AI_PROCESSING
            ):

                print(
                    "[AI] Moving failed grievance "
                    "to PENDING_REVIEW"
                )

                change_grievance_status(
                    db=db,
                    grievance=grievance,
                    new_status=GrievanceStatus.PENDING_REVIEW,
                    changed_by=None,
                    actor_type=HistoryActorType.SYSTEM,
                    reason=(
                        "AI processing failed. "
                        "Manual review required."
                    ),
                )

                db.commit()

        except Exception as fallback_error:

            db.rollback()

            print(
                f"[AI] Fallback error: "
                f"{fallback_error}"
            )

    finally:

        db.close()

        print("[AI] Background DB session closed")