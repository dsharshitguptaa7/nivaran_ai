import sys
import os
import uuid
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.subject import Subject
from app.models.subject_cluster import SubjectCluster
from app.models.grievance import Grievance
from app.models.enums import GrievanceStatus, GrievancePriority
from app.models.assignment import Assignment
from app.models.escalation import Escalation, EscalationRole
from app.core.security import create_access_token


def test_dean_analytics_api():
    client = TestClient(app)
    db = SessionLocal()

    try:
        # 1. Setup / find Dean User
        dean_user = db.query(User).filter(User.role == UserRole.DEAN).first()
        if not dean_user:
            dean_user = User(
                id=uuid.uuid4(),
                email=f"dean_test_{uuid.uuid4().hex[:6]}@csjmu.ac.in",
                full_name="Prof. Test Dean",
                role=UserRole.DEAN,
                password_hash="test_hash",
                is_active=True,
            )
            db.add(dean_user)
            db.commit()
            db.refresh(dean_user)

        # 2. Setup / find Manager User
        mgr_user = db.query(User).filter(User.role == UserRole.MANAGER).first()
        if not mgr_user:
            mgr_user = User(
                id=uuid.uuid4(),
                email=f"mgr_test_{uuid.uuid4().hex[:6]}@csjmu.ac.in",
                full_name="Manager Admin",
                role=UserRole.MANAGER,
                password_hash="test_hash",
                is_active=True,
            )
            db.add(mgr_user)
            db.commit()
            db.refresh(mgr_user)

        # 3. Setup / find Applicant
        applicant = db.query(User).filter(User.role == UserRole.APPLICANT).first()
        if not applicant:
            applicant = User(
                id=uuid.uuid4(),
                email=f"student_test_{uuid.uuid4().hex[:6]}@csjmu.ac.in",
                full_name="Student Test",
                role=UserRole.APPLICANT,
                password_hash="test_hash",
                is_active=True,
            )
            db.add(applicant)
            db.commit()
            db.refresh(applicant)

        # 4. Generate JWT for Dean
        dean_token = create_access_token(
            data={"sub": str(dean_user.id), "role": dean_user.role.value}
        )
        headers = {"Authorization": f"Bearer {dean_token}"}

        # 5. Call GET /api/v1/dean/analytics
        response = client.get("/api/v1/dean/analytics", headers=headers)
        assert response.status_code == 200, f"Analytics API failed: {response.text}"
        data = response.json()

        # Verify all 11 modules are present in response payload
        assert "kpis" in data, "Missing KPIs"
        assert "flow_stages" in data, "Missing flow_stages"
        assert "ai_analytics" in data, "Missing ai_analytics"
        assert "authority_workloads" in data, "Missing authority_workloads"
        assert "category_analytics" in data, "Missing category_analytics"
        assert "subject_analytics" in data, "Missing subject_analytics"
        assert "cluster_analytics" in data, "Missing cluster_analytics"
        assert "trends" in data, "Missing trends"
        assert "risk_monitoring" in data, "Missing risk_monitoring"
        assert "recent_activities" in data, "Missing recent_activities"
        assert "dean_attention_cases" in data, "Missing dean_attention_cases"
        assert "filters_meta" in data, "Missing filters_meta"

        kpis = data["kpis"]
        assert isinstance(kpis["total_grievances"], int)
        assert isinstance(kpis["resolution_rate"], (int, float))
        assert isinstance(kpis["ai_prediction_accuracy"], (int, float))

        # 6. Test Filter by Priority
        filtered_resp = client.get("/api/v1/dean/analytics?priority=HIGH", headers=headers)
        assert filtered_resp.status_code == 200

        # 7. Test Dean Attention endpoint
        att_resp = client.get("/api/v1/dean/attention", headers=headers)
        assert att_resp.status_code == 200
        assert isinstance(att_resp.json(), list)

        # 8. Test Activity Feed endpoint
        feed_resp = client.get("/api/v1/dean/activity-feed?limit=10", headers=headers)
        assert feed_resp.status_code == 200
        assert isinstance(feed_resp.json(), list)

        # 9. Test Unauthorized Access (Applicant cannot access Dean dashboard)
        app_token = create_access_token(
            data={"sub": str(applicant.id), "role": applicant.role.value}
        )
        unauth_resp = client.get("/api/v1/dean/analytics", headers={"Authorization": f"Bearer {app_token}"})
        assert unauth_resp.status_code == 403, "Applicant should be forbidden from accessing Dean analytics"

        print("[OK] Dean Dashboard Analytics & Attention API Verified Successfully!")

    finally:
        db.close()


if __name__ == "__main__":
    test_dean_analytics_api()
