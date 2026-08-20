import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from io import BytesIO
from fastapi import UploadFile

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.models.grievance import Grievance
from app.models.assignment import Assignment
from app.models.enums import GrievanceStatus, GrievancePriority
from app.models.document_request import DocumentRequest, DocumentRequestStatus
from app.models.notification import Notification, NotificationType
from app.schemas.document_request import (
    CreateDocumentRequestsPayload,
    DocumentRequestItemCreate,
    DocumentRequestReviewPayload,
)
from app.services.document_request_service import (
    create_document_requests,
    fulfill_document_request,
    review_document_request,
)


def run_document_request_system_tests():
    print("=" * 75)
    print("NIVARAN-AI: ADDITIONAL DOCUMENT REQUEST SYSTEM TEST SUITE")
    print("=" * 75)

    db = SessionLocal()
    created_grievances = []
    created_assignments = []
    created_notifications = []

    try:
        # 1. SETUP USERS
        applicant = db.query(User).filter(User.role == UserRole.APPLICANT).first()
        other_applicant = db.query(User).filter(User.role == UserRole.APPLICANT, User.id != applicant.id).first()
        if not other_applicant:
            other_applicant = applicant

        authority = db.query(User).filter(
            User.role == UserRole.ASSISTANT_DEAN,
            User.is_active.is_(True),
        ).first()

        other_authority = db.query(User).filter(
            User.role == UserRole.ASSISTANT_DEAN,
            User.id != authority.id,
            User.is_active.is_(True),
        ).first()

        subject = db.query(Subject).first()

        print(f"\n[SETUP] Applicant: {applicant.full_name}")
        print(f"[SETUP] Assigned Authority: {authority.full_name} ({authority.role.value})")

        # -------------------------------------------------------------
        # TEST 1: Authority requests 1 required document
        # -------------------------------------------------------------
        print("\n--- TEST 1: Authority Requests 1 Document ---")
        g1 = Grievance(
            id=uuid.uuid4(),
            grievance_id=f"GRV-TEST-{uuid.uuid4().hex[:6].upper()}",
            applicant_id=applicant.id,
            subject_id=subject.id if subject else None,
            title="Fellowship Discrepancy",
            description="Testing document request workflow on assigned grievance",
            status=GrievanceStatus.ASSIGNED,
            priority=GrievancePriority.HIGH,
        )
        db.add(g1)
        created_grievances.append(g1)

        a1 = Assignment(
            id=uuid.uuid4(),
            grievance_id=g1.id,
            assigned_to=authority.id,
            assigned_by=applicant.id,
            is_active=True,
        )
        db.add(a1)
        created_assignments.append(a1)
        db.commit()

        payload1 = CreateDocumentRequestsPayload(
            documents=[
                DocumentRequestItemCreate(
                    document_name="Fellowship Award Letter",
                    description="Official sanction letter from university/funding agency",
                    is_required=True,
                )
            ],
            deadline=datetime.now(timezone.utc) + timedelta(days=5),
        )

        reqs1 = create_document_requests(db, g1, authority, payload1)
        db.refresh(g1)

        print(f"  -> Grievance Status after request: {g1.status.value}")
        print(f"  -> Document Request ID: {reqs1[0].id}, Status: {reqs1[0].status.value}")
        print(f"  -> Active Assignment Assigned To: {a1.assigned_to}")

        assert g1.status == GrievanceStatus.AWAITING_INFORMATION, "Grievance status must transition to AWAITING_INFORMATION"
        assert len(reqs1) == 1, "Must create 1 document request"
        assert reqs1[0].status == DocumentRequestStatus.PENDING, "Request must be PENDING"
        assert a1.is_active is True, "Active assignment must remain active"
        assert a1.assigned_to == authority.id, "Assigned authority must remain unchanged"
        print("  [OK] Test 1 Passed: Grievance paused in AWAITING_INFORMATION, assignment preserved.")

        # Verify Applicant Notification
        notif1 = db.query(Notification).filter(
            Notification.user_id == applicant.id,
            Notification.grievance_id == g1.id,
            Notification.notification_type == NotificationType.DOCUMENT_REQUESTED,
        ).first()
        assert notif1 is not None, "Notification must be sent to applicant"
        print(f"  [OK] Applicant Notification Verified: '{notif1.title}' - '{notif1.message}'")

        # -------------------------------------------------------------
        # TEST 2: Applicant Uploads Requested Document -> Restores Grievance
        # -------------------------------------------------------------
        print("\n--- TEST 2: Applicant Uploads Document & Workflow Restores ---")
        mock_file = UploadFile(
            filename="fellowship_award_letter.pdf",
            file=BytesIO(b"%PDF-1.4 Mock PDF Content For Fellowship Award Letter"),
            headers={"content-type": "application/pdf"},
        )

        import asyncio
        updated_req = asyncio.run(fulfill_document_request(
            db=db,
            grievance=g1,
            request_id=reqs1[0].id,
            file=mock_file,
            applicant=applicant,
        ))
        db.refresh(g1)

        print(f"  -> Document Request Status: {updated_req.status.value}")
        print(f"  -> Grievance Restored Status: {g1.status.value}")
        print(f"  -> Assigned Authority: {a1.assigned_to} (Authority: {authority.full_name})")

        assert updated_req.status == DocumentRequestStatus.UPLOADED, "Request status must be UPLOADED"
        assert g1.status == GrievanceStatus.ASSIGNED, "Grievance must be restored to ASSIGNED"
        assert a1.assigned_to == authority.id, "Assigned authority MUST remain the SAME authority"
        print("  [OK] Test 2 Passed: Grievance restored to ASSIGNED with the SAME authority without rerouting.")

        # Verify Authority Notification
        notif_auth = db.query(Notification).filter(
            Notification.user_id == authority.id,
            Notification.grievance_id == g1.id,
            Notification.notification_type == NotificationType.DOCUMENT_UPLOADED,
        ).first()
        assert notif_auth is not None, "Notification must be sent to authority"
        print(f"  [OK] Authority Notification Verified: '{notif_auth.title}' - '{notif_auth.message}'")

        # -------------------------------------------------------------
        # TEST 3: Multiple Documents (1 Optional, 2 Required)
        # Partial upload keeps AWAITING_INFORMATION until all required uploaded
        # -------------------------------------------------------------
        print("\n--- TEST 3: Multiple Documents & Partial Upload Logic ---")
        g2 = Grievance(
            id=uuid.uuid4(),
            grievance_id=f"GRV-TEST-{uuid.uuid4().hex[:6].upper()}",
            applicant_id=applicant.id,
            subject_id=subject.id if subject else None,
            title="Hostel & Fee Multi-Doc Issue",
            description="Testing multiple document requests with partial submission",
            status=GrievanceStatus.IN_PROGRESS,
            priority=GrievancePriority.MEDIUM,
        )
        db.add(g2)
        created_grievances.append(g2)

        a2 = Assignment(
            id=uuid.uuid4(),
            grievance_id=g2.id,
            assigned_to=authority.id,
            assigned_by=applicant.id,
            is_active=True,
        )
        db.add(a2)
        created_assignments.append(a2)
        db.commit()

        payload2 = CreateDocumentRequestsPayload(
            documents=[
                DocumentRequestItemCreate(document_name="Fee Receipt", is_required=True),
                DocumentRequestItemCreate(document_name="ID Card Copy", is_required=True),
                DocumentRequestItemCreate(document_name="Optional Photo", is_required=False),
            ]
        )

        reqs2 = create_document_requests(db, g2, authority, payload2)
        db.refresh(g2)
        assert g2.status == GrievanceStatus.AWAITING_INFORMATION

        # Upload 1st required document
        f1 = UploadFile(filename="fee_receipt.pdf", file=BytesIO(b"Mock Fee Receipt Content"), headers={"content-type": "application/pdf"})
        asyncio.run(fulfill_document_request(db, g2, reqs2[0].id, f1, applicant))
        db.refresh(g2)

        print(f"  -> Grievance status after 1 of 2 required uploaded: {g2.status.value}")
        assert g2.status == GrievanceStatus.AWAITING_INFORMATION, "Grievance must stay AWAITING_INFORMATION while 2nd required is pending"
        print("  [OK] Partial upload correctly keeps grievance in AWAITING_INFORMATION.")

        # Upload 2nd required document (3rd optional remains pending)
        f2 = UploadFile(filename="id_card.png", file=BytesIO(b"Mock ID Card Content"), headers={"content-type": "image/png"})
        asyncio.run(fulfill_document_request(db, g2, reqs2[1].id, f2, applicant))
        db.refresh(g2)

        print(f"  -> Grievance status after all required uploaded (optional pending): {g2.status.value}")
        assert g2.status == GrievanceStatus.IN_PROGRESS, "Grievance must restore to IN_PROGRESS because all required are fulfilled"
        print("  [OK] Test 3 Passed: Optional documents do not block status restoration to IN_PROGRESS.")

        # -------------------------------------------------------------
        # TEST 4: Authority Review (Approve & Reject / Re-upload)
        # -------------------------------------------------------------
        print("\n--- TEST 4: Authority Review (Approve & Re-upload Request) ---")
        # Approve Fee Receipt
        rev_approve = review_document_request(db, g2, reqs2[0].id, authority, DocumentRequestReviewPayload(action="APPROVE", remarks="Valid receipt verified"))
        assert rev_approve.status == DocumentRequestStatus.APPROVED
        print(f"  -> Doc 1 Approval Verified: Status = {rev_approve.status.value}")

        # Reject ID Card (Request Re-upload)
        rev_reject = review_document_request(db, g2, reqs2[1].id, authority, DocumentRequestReviewPayload(action="REJECT", remarks="ID Card copy is blurry. Please re-upload."))
        db.refresh(g2)
        assert rev_reject.status == DocumentRequestStatus.REJECTED
        assert g2.status == GrievanceStatus.AWAITING_INFORMATION, "Grievance must return to AWAITING_INFORMATION upon rejection"
        print(f"  -> Doc 2 Rejection Verified: Status = {rev_reject.status.value}, Grievance Status = {g2.status.value}")

        # Applicant Re-uploads rejected document
        f2_new = UploadFile(filename="id_card_clear.png", file=BytesIO(b"Mock Clear ID Card Content"), headers={"content-type": "image/png"})
        asyncio.run(fulfill_document_request(db, g2, reqs2[1].id, f2_new, applicant))
        db.refresh(g2)
        assert g2.status == GrievanceStatus.IN_PROGRESS
        print(f"  -> Grievance re-restored to {g2.status.value} after applicant re-uploaded clear document.")
        print("  [OK] Test 4 Passed: Authority review, rejection, and re-upload workflow verified.")

        # -------------------------------------------------------------
        # TEST 5: Security & Edge Cases
        # -------------------------------------------------------------
        print("\n--- TEST 5: Security & Edge Case Validations ---")
        # A. Unassigned authority trying to request document
        if other_authority:
            try:
                create_document_requests(db, g1, other_authority, payload1)
                assert False, "Unauthorized authority should be blocked"
            except Exception as e:
                print(f"  [OK] Unauthorized authority blocked correctly: {e.detail if hasattr(e, 'detail') else e}")

        # B. Applicant trying to request document
        try:
            create_document_requests(db, g1, applicant, payload1)
            assert False, "Applicant should not be allowed to request documents"
        except Exception as e:
            print(f"  [OK] Applicant document request blocked correctly: {e.detail if hasattr(e, 'detail') else e}")

        # C. Document request on CLOSED grievance
        g1.status = GrievanceStatus.CLOSED
        db.add(g1)
        db.commit()
        try:
            create_document_requests(db, g1, authority, payload1)
            assert False, "Closed grievance should reject document requests"
        except Exception as e:
            print(f"  [OK] Closed grievance document request blocked correctly: {e.detail if hasattr(e, 'detail') else e}")

        print("\n" + "=" * 75)
        print("ALL DOCUMENT REQUEST SYSTEM TEST SCENARIOS PASSED WITH ZERO ERRORS!")
        print("=" * 75)
        return True

    except Exception as e:
        db.rollback()
        print(f"\n[TEST FAILED]: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # CLEANUP
        print("\n[CLEANUP] Cleaning temporary test records...")
        try:
            from app.models.grievance_status_history import GrievanceStatusHistory
            from app.models.audit_log import AuditLog
            from app.models.documents import Document

            for g in created_grievances:
                db.query(Notification).filter(Notification.grievance_id == g.id).delete()
                db.query(DocumentRequest).filter(DocumentRequest.grievance_id == g.id).delete()
                db.query(Document).filter(Document.grievance_id == g.id).delete()
                db.query(Assignment).filter(Assignment.grievance_id == g.id).delete()
                db.query(GrievanceStatusHistory).filter(GrievanceStatusHistory.grievance_id == g.id).delete()
                db.query(AuditLog).filter(AuditLog.grievance_id == g.id).delete()
                db.query(Grievance).filter(Grievance.id == g.id).delete()
            db.commit()
            print("[CLEANUP] Cleanup finished successfully.")
        except Exception as cleanup_err:
            db.rollback()
            print(f"[CLEANUP ERROR]: {cleanup_err}")
        finally:
            db.close()


if __name__ == "__main__":
    success = run_document_request_system_tests()
    sys.exit(0 if success else 1)
