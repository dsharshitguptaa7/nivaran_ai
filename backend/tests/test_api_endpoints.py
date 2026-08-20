import io
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.models.category import Category
from app.models.grievance import Grievance, GrievanceStatus
from app.core.security import create_access_token, hash_password


client = TestClient(app)


def get_token_for_user(user: User) -> str:
    return create_access_token({"sub": str(user.id), "role": user.role.value})


def test_api_document_and_resolution_flow():
    db = SessionLocal()
    try:
        # 1. Setup users
        chem_subject = db.scalar(select(Subject).where(Subject.name == "Chemistry"))
        if not chem_subject:
            chem_subject = Subject(name="Chemistry", is_active=True)
            db.add(chem_subject)
            db.flush()

        applicant = db.scalar(select(User).where(User.email == "test_e2e_applicant@nivaran.local"))
        if not applicant:
            applicant = User(
                full_name="E2E Test Applicant",
                email="test_e2e_applicant@nivaran.local",
                password_hash=hash_password("Test@123"),
                role=UserRole.APPLICANT,
                subject_id=chem_subject.id,
                is_active=True,
            )
            db.add(applicant)
            db.flush()

        manager = db.scalar(select(User).where(User.role == UserRole.MANAGER))
        if not manager:
            manager = User(
                full_name="E2E Manager",
                email="manager@nivaran.local",
                password_hash=hash_password("Admin@789"),
                role=UserRole.MANAGER,
                is_active=True,
            )
            db.add(manager)
            db.flush()

        db.commit()

        applicant_token = get_token_for_user(applicant)
        manager_token = get_token_for_user(manager)

        # 2. Create Grievance via API
        create_resp = client.post(
            "/api/v1/grievances",
            json={
                "title": "API Test Grievance for Document & Closure",
                "description": "Testing comprehensive document upload and manager closure API endpoints.",
            },
            headers={"Authorization": f"Bearer {applicant_token}"},
        )
        assert create_resp.status_code == 201, f"Failed to create grievance: {create_resp.text}"
        grievance_data = create_resp.json()
        g_id = grievance_data["grievance_id"]

        # 3. Upload Document via API
        file_content = b"%PDF-1.4 Mock PDF content for grievance redressal verification"
        upload_resp = client.post(
            f"/api/v1/grievances/{g_id}/documents",
            files={"file": ("test_proof.pdf", io.BytesIO(file_content), "application/pdf")},
            data={"document_type": "ATTACHMENT"},
            headers={"Authorization": f"Bearer {applicant_token}"},
        )
        assert upload_resp.status_code == 201, f"Failed to upload document: {upload_resp.text}"
        doc_data = upload_resp.json()
        assert doc_data["file_name"] == "test_proof.pdf"
        assert doc_data["uploader_name"] == applicant.full_name
        doc_id = doc_data["id"]

        # 4. List Documents via API
        list_resp = client.get(
            f"/api/v1/grievances/{g_id}/documents",
            headers={"Authorization": f"Bearer {applicant_token}"},
        )
        assert list_resp.status_code == 200
        docs = list_resp.json()
        assert len(docs) >= 1
        assert any(d["id"] == doc_id for d in docs)

        # 5. Download Document via API
        download_resp = client.get(
            f"/api/v1/documents/{doc_id}/download",
            headers={"Authorization": f"Bearer {applicant_token}"},
        )
        assert download_resp.status_code == 200
        assert download_resp.content == file_content

        # 6. Put Grievance in solvable state (e.g. ASSIGNED) and resolve via API
        db_g = db.scalar(select(Grievance).where(Grievance.grievance_id == g_id))
        db_g.status = GrievanceStatus.IN_PROGRESS
        db.commit()

        resolve_resp = client.post(
            f"/api/v1/grievances/{g_id}/resolve",
            json={"resolution_notes": "Issue resolved and verified by technical staff."},
            headers={"Authorization": f"Bearer {manager_token}"},
        )
        assert resolve_resp.status_code == 200, f"Failed to resolve grievance: {resolve_resp.text}"
        resolved_data = resolve_resp.json()
        assert resolved_data["status"] == "RESOLVED"
        assert resolved_data["resolution_notes"] == "Issue resolved and verified by technical staff."
        assert resolved_data["resolved_by_name"] == manager.full_name

        # 7. Close Grievance via API (Manager Authority)
        close_resp = client.post(
            f"/api/v1/grievances/{g_id}/close",
            json={"closure_remarks": "Manager confirmed complete redressal. Officially closed."},
            headers={"Authorization": f"Bearer {manager_token}"},
        )
        assert close_resp.status_code == 200, f"Failed to close grievance: {close_resp.text}"
        closed_data = close_resp.json()
        assert closed_data["status"] == "CLOSED"
        assert closed_data["closure_remarks"] == "Manager confirmed complete redressal. Officially closed."
        assert closed_data["closed_by_name"] == manager.full_name
        assert len(closed_data["documents"]) >= 1

        print("[OK] API End-to-End Document Upload, Resolution & Closure PASSED")

    finally:
        db.close()


if __name__ == "__main__":
    test_api_document_and_resolution_flow()
