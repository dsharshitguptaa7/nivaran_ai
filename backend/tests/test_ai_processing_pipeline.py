import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from sqlalchemy import select, or_

from app.main import app
from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.grievance import Grievance, GrievanceStatus
from app.models.ai_processing import AIProcessingRecord, AIProcessingStatus
from app.models.notification import Notification
from app.models.assignment import Assignment
from app.models.documents import Document
from app.models.document_request import DocumentRequest
from app.models.audit_log import AuditLog
from app.models.grievance_status_history import GrievanceStatusHistory
from app.core.security import create_access_token, hash_password
from app.ai.pipeline import ai_pipeline
from app.services.ai_processing import (
    process_grievance,
    run_ai_processing_background,
    resolve_db_category,
)

client = TestClient(app)


def get_token(user: User) -> str:
    return create_access_token({"sub": str(user.id), "role": user.role.value})


def run_all_ai_pipeline_tests():
    print("=" * 75)
    print("NIVARAN-AI: AI PROCESSING PIPELINE AUTOMATED TEST SUITE")
    print("=" * 75)

    db = SessionLocal()
    test_user_ids = []
    test_grievance_ids = []

    try:
        # ======================================================================
        # SETUP FIXTURES
        # ======================================================================
        # 1. Applicant
        applicant = User(
            id=uuid.uuid4(),
            full_name="AI Pipeline Test Applicant",
            email=f"ai_app_{uuid.uuid4().hex[:6]}@univ.local",
            password_hash=hash_password("Pass@123"),
            role=UserRole.APPLICANT,
            department="R&D",
            is_active=True,
        )
        db.add(applicant)

        # 2. Manager
        manager = User(
            id=uuid.uuid4(),
            full_name="AI Pipeline Test Manager",
            email=f"ai_mgr_{uuid.uuid4().hex[:6]}@univ.local",
            password_hash=hash_password("Pass@123"),
            role=UserRole.MANAGER,
            department="R&D",
            is_active=True,
        )
        db.add(manager)
        db.commit()

        test_user_ids.extend([applicant.id, manager.id])
        app_token = get_token(applicant)
        mgr_token = get_token(manager)

        print(f"[SETUP] Created Applicant: {applicant.email}")
        print(f"[SETUP] Created Manager:   {manager.email}")

        # ======================================================================
        # TEST 1: AIPipeline Direct Inference & Preprocessing
        # ======================================================================
        print("\n--- TEST 1: AIPipeline Direct NLP & Preprocessing ---")
        cat, conf = ai_pipeline.predict_category("Fellowship delayed", "Stipend for JRF is missing.")
        assert cat in ["Fellowship", "Other"], f"Unexpected category: {cat}"
        assert 0.0 <= conf <= 1.0, f"Invalid confidence score: {conf}"
        print(f"  -> Direct Prediction: Category='{cat}', Confidence={conf:.4f} [OK]")

        cluster_id = ai_pipeline.predict_cluster("Fellowship delayed", "Stipend is missing.")
        assert isinstance(cluster_id, int), f"Cluster ID must be integer, got {type(cluster_id)}"
        print(f"  -> Cluster ID Prediction: {cluster_id} [OK]")

        # Test Empty / Null Strings
        empty_cat, empty_conf = ai_pipeline.predict_category("", "")
        assert empty_cat is not None
        print(f"  -> Empty String Fallback: Category='{empty_cat}', Confidence={empty_conf:.4f} [OK]")

        # ======================================================================
        # TEST 2: Resilient Database Category Resolution
        # ======================================================================
        print("\n--- TEST 2: Resilient Category Resolver ---")
        # Exact match
        cat_exact = resolve_db_category(db, "Fellowship")
        assert cat_exact is not None and cat_exact.name == "Fellowship"
        print("  -> Exact match resolution verified [OK]")

        # Space vs Underscore match ('Course Work' -> 'Course_Work')
        cat_norm = resolve_db_category(db, "Course Work")
        assert cat_norm is not None and cat_norm.name == "Course_Work"
        print("  -> Space/Underscore normalized resolution verified ('Course Work' -> 'Course_Work') [OK]")

        # Case-insensitive match ('fellowship' -> 'Fellowship')
        cat_case = resolve_db_category(db, "fellowship")
        assert cat_case is not None and cat_case.name == "Fellowship"
        print("  -> Case-insensitive resolution verified ('fellowship' -> 'Fellowship') [OK]")

        # Completely unknown category fallback -> 'Other'
        cat_fallback = resolve_db_category(db, "NonExistentDomainXYZ123")
        assert cat_fallback is not None and cat_fallback.name == "Other"
        print("  -> Unknown category fallback to 'Other' verified [OK]")

        # ======================================================================
        # TEST 3: Asynchronous Grievance Intake & Background Task
        # ======================================================================
        print("\n--- TEST 3: Background AI Intake & State Machine ---")
        grv1 = Grievance(
            id=uuid.uuid4(),
            grievance_id=f"GRV-AI-{uuid.uuid4().hex[:6].upper()}",
            applicant_id=applicant.id,
            title="Delayed Monthly Stipend for Ph.D. Scholar",
            description="My JRF fellowship contingency amount for the past 2 months has not been credited.",
            status=GrievanceStatus.SUBMITTED,
        )
        db.add(grv1)
        db.commit()
        test_grievance_ids.append(grv1.id)

        # Trigger background execution
        run_ai_processing_background(grv1.id)

        db.expire_all()
        refreshed_grv1 = db.scalar(select(Grievance).where(Grievance.id == grv1.id))
        assert refreshed_grv1.status == GrievanceStatus.PENDING_REVIEW, f"Expected PENDING_REVIEW, got {refreshed_grv1.status}"
        assert refreshed_grv1.category_id is not None, "Category ID was not populated"
        assert refreshed_grv1.ai_confidence is not None and refreshed_grv1.ai_confidence > 0, "AI confidence missing"

        ai_rec = db.scalar(select(AIProcessingRecord).where(AIProcessingRecord.grievance_id == grv1.id))
        assert ai_rec is not None, "AIProcessingRecord was not created"
        assert ai_rec.status == AIProcessingStatus.COMPLETED, f"AI Record status: {ai_rec.status}"
        assert ai_rec.processing_time_ms is not None and ai_rec.processing_time_ms >= 0
        print(f"  -> State Transition: SUBMITTED -> AI_PROCESSING -> PENDING_REVIEW [OK]")
        print(f"  -> AI Telemetry: Model={ai_rec.model_name} v{ai_rec.model_version}, Latency={ai_rec.processing_time_ms}ms [OK]")

        # ======================================================================
        # TEST 4: Manual Re-Processing API Endpoint (/process-ai)
        # ======================================================================
        print("\n--- TEST 4: Manual Re-Processing API Endpoint (/process-ai) ---")
        # Call /process-ai on PENDING_REVIEW grievance (should re-run without error)
        resp = client.post(
            f"/api/v1/grievances/{refreshed_grv1.grievance_id}/process-ai",
            headers={"Authorization": f"Bearer {mgr_token}"},
        )
        assert resp.status_code == 200, f"Manual AI re-processing failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert data["status"] == "COMPLETED"
        assert data["predicted_category_id"] is not None
        print(f"  -> Manual re-processing on PENDING_REVIEW succeeded cleanly (200 OK) [OK]")

        # ======================================================================
        # TEST 5: Edge Case - Extreme Inputs & Hinglish Text
        # ======================================================================
        print("\n--- TEST 5: Extreme Inputs & Multilingual Edge Cases ---")
        grv_edge = Grievance(
            id=uuid.uuid4(),
            grievance_id=f"GRV-AI-EDGE-{uuid.uuid4().hex[:4].upper()}",
            applicant_id=applicant.id,
            title="Maine apna thesis submit kiya tha lekin acknowledgement nahi mila abhi tak",
            description="Supervisor guide change application status is pending since last month 12345!@#$%",
            status=GrievanceStatus.SUBMITTED,
        )
        db.add(grv_edge)
        db.commit()
        test_grievance_ids.append(grv_edge.id)

        rec_edge = process_grievance(db=db, grievance=grv_edge)
        assert rec_edge.status == AIProcessingStatus.COMPLETED
        assert grv_edge.category_id is not None
        print(f"  -> Hinglish & Special Character Input Processed: Category ID={grv_edge.category_id}, Conf={rec_edge.confidence_score} [OK]")

        print("\n" + "=" * 75)
        print("ALL 5 AI PROCESSING PIPELINE TEST SUITES PASSED (100%)!")
        print("=" * 75)

    finally:
        # ======================================================================
        # DETERMINISTIC TEARDOWN
        # ======================================================================
        print("\n[CLEANUP] Cleaning temporary test fixtures...")
        if test_grievance_ids:
            db.query(Notification).filter(Notification.grievance_id.in_(test_grievance_ids)).delete(synchronize_session=False)
            db.query(DocumentRequest).filter(DocumentRequest.grievance_id.in_(test_grievance_ids)).delete(synchronize_session=False)
            db.query(Document).filter(Document.grievance_id.in_(test_grievance_ids)).delete(synchronize_session=False)
            db.query(Assignment).filter(Assignment.grievance_id.in_(test_grievance_ids)).delete(synchronize_session=False)
            db.query(GrievanceStatusHistory).filter(GrievanceStatusHistory.grievance_id.in_(test_grievance_ids)).delete(synchronize_session=False)
            db.query(AIProcessingRecord).filter(AIProcessingRecord.grievance_id.in_(test_grievance_ids)).delete(synchronize_session=False)
            db.query(AuditLog).filter(AuditLog.grievance_id.in_(test_grievance_ids)).delete(synchronize_session=False)
            db.query(Grievance).filter(Grievance.id.in_(test_grievance_ids)).delete(synchronize_session=False)

        if test_user_ids:
            db.query(Notification).filter(Notification.user_id.in_(test_user_ids)).delete(synchronize_session=False)
            db.query(AuditLog).filter(AuditLog.user_id.in_(test_user_ids)).delete(synchronize_session=False)
            db.query(GrievanceStatusHistory).filter(GrievanceStatusHistory.changed_by.in_(test_user_ids)).delete(synchronize_session=False)
            db.query(Assignment).filter(or_(Assignment.assigned_to.in_(test_user_ids), Assignment.assigned_by.in_(test_user_ids))).delete(synchronize_session=False)
            db.query(User).filter(User.id.in_(test_user_ids)).delete(synchronize_session=False)

        db.commit()
        db.close()
        print("[CLEANUP] Teardown completed successfully.\n")


if __name__ == "__main__":
    run_all_ai_pipeline_tests()
