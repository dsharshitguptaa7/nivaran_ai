import time
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ai_processing import (
    AIProcessingRecord,
    AIProcessingStatus,
)
from app.models.grievance import Grievance
from app.models.category import Category

from app.ai.inference.category_predictor import predict_category

from app.db.database import SessionLocal
from app.models.enums import GrievanceStatus
from app.models.grievance_status_history import HistoryActorType
from app.services.grievance_workflow import change_grievance_status


DEFAULT_MODEL_NAME = "NIVARAN-AI"
DEFAULT_MODEL_VERSION = "0.1.0"


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
) -> AIProcessingRecord:

    record.predicted_category_id = predicted_category_id
    record.confidence_score = confidence_score
    record.processing_time_ms = processing_time_ms
    record.status = AIProcessingStatus.COMPLETED
    record.error_message = None

    # Sync AI category result back to grievance
    grievance = record.grievance

    if grievance is not None:
        grievance.category_id = predicted_category_id
        grievance.ai_confidence = confidence_score

        db.add(grievance)

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
        # 1. CATEGORY PREDICTION
        # --------------------------------------------------

        category_name, confidence_score = predict_category(
            title=grievance.title,
            description=grievance.description,
        )

        category = db.scalar(
            select(Category).where(
                Category.name == category_name,
                Category.is_active.is_(True),
            )
        )

        if category is None:
            raise ValueError(
                f"Predicted category not found in database: "
                f"{category_name}"
            )

        # --------------------------------------------------
        # 2. PROCESSING TIME
        # --------------------------------------------------

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
        )

        return record

    except Exception as e:

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