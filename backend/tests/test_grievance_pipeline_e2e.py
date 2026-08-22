import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.database import engine, SessionLocal
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.models.category import Category, CategoryRoutingType
from app.models.grievance import Grievance, GrievanceStatus
from app.models.assignment import Assignment
from app.models.documents import Document
from app.schemas.assignment import AssignmentCreate
from app.api.routes.assignment import assign_grievance
from app.services.authority_routing import get_routing_response
from app.services.grievance_workflow import change_grievance_status
from app.services.escalation_service import escalate_grievance
from app.core.security import hash_password


def setup_test_environment(db: Session):
    """Ensure essential test users and categories exist."""
    # 1. Chemistry subject
    chem_subject = db.scalar(select(Subject).where(Subject.name == "Chemistry"))
    if not chem_subject:
        chem_subject = Subject(name="Chemistry", is_active=True)
        db.add(chem_subject)
        db.flush()

    # 2. Test applicant
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
    else:
        applicant.subject_id = chem_subject.id
        db.add(applicant)
        db.flush()

    # 3. Manager
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

    # 4. Dean
    dean = db.scalar(select(User).where(User.role == UserRole.DEAN))
    if not dean:
        dean = User(
            full_name="E2E Dean",
            email="dean@nivaran.local",
            password_hash=hash_password("Admin@789"),
            role=UserRole.DEAN,
            is_active=True,
        )
        db.add(dean)
        db.flush()

    db.commit()
    return applicant, manager, dean


def test_scenario_1_grievance_cluster_flow():
    """Test full pipeline for GRIEVANCE_CLUSTER category:
    Registration -> Priyanka Maurya (Asst Dean) -> Arun Gupta (Assoc Dean) -> Solved -> Manager Review & Closure.
    """
    db = SessionLocal()
    try:
        applicant, manager, dean = setup_test_environment(db)

        # 1. Create Grievance
        gid = f"E2E-{uuid.uuid4().hex[:6].upper()}"
        grievance = Grievance(
            grievance_id=gid,
            title="E2E Registration Issue",
            description="Testing registration grievance routing to Associate Dean and Manager Closure",
            applicant_id=applicant.id,
            subject_id=applicant.subject_id,
            status=GrievanceStatus.SUBMITTED,
        )
        db.add(grievance)
        db.commit()
        db.refresh(grievance)

        # 2. AI Processing
        change_grievance_status(db, grievance, GrievanceStatus.AI_PROCESSING, manager, "AI started")
        change_grievance_status(db, grievance, GrievanceStatus.PENDING_REVIEW, manager, "AI completed")
        db.commit()

        # 3. Manager Reviews and assigns category "Registration"
        reg_cat = db.scalar(select(Category).where(Category.name == "Registration"))
        assert reg_cat is not None, "Registration category must exist"
        grievance.final_category_id = reg_cat.id
        grievance.category_reviewed = True
        db.commit()
        db.refresh(grievance)

        # Check routing for Manager
        routing_mgr = get_routing_response(db, grievance, manager)
        assert routing_mgr["next_authority_name"] == "Dr. Priyanka Maurya", f"Expected Dr. Priyanka Maurya, got {routing_mgr['next_authority_name']}"
        assert routing_mgr["next_authority_id"] is not None
        assert routing_mgr["can_forward"] is True

        # 4. Manager assigns to Dr. Priyanka Maurya
        priyanka = db.scalar(select(User).where(User.id == routing_mgr["next_authority_id"]))
        assignment_1 = Assignment(
            grievance_id=grievance.id,
            assigned_to=priyanka.id,
            assigned_by=manager.id,
            remarks="Assigned to Subject Assistant Dean",
            is_active=True,
        )
        change_grievance_status(db, grievance, GrievanceStatus.ASSIGNED, manager, "Assigned to Assistant Dean")
        db.add(assignment_1)
        db.commit()
        db.refresh(grievance)

        # 5. Assistant Dean views routing
        routing_asst = get_routing_response(db, grievance, priyanka)
        assert routing_asst["can_forward"] is True
        assert routing_asst["next_authority_name"] == "Dr. Arun Kumar Gupta", f"Expected Dr. Arun Kumar Gupta, got {routing_asst['next_authority_name']}"

        # 6. Assistant Dean marks IN_PROGRESS and forwards to Associate Dean
        change_grievance_status(db, grievance, GrievanceStatus.IN_PROGRESS, priyanka, "Investigating")
        db.commit()

        # Forward to Associate Dean
        arun_gupta = db.scalar(select(User).where(User.id == routing_asst["next_authority_id"]))
        assignment_1.is_active = False
        assignment_2 = Assignment(
            grievance_id=grievance.id,
            assigned_to=arun_gupta.id,
            assigned_by=priyanka.id,
            remarks="Forwarded to Cluster Associate Dean",
            is_active=True,
        )
        change_grievance_status(db, grievance, GrievanceStatus.ASSIGNED, priyanka, "Forwarded to Associate Dean")
        db.add(assignment_2)
        db.commit()
        db.refresh(grievance)

        # 7. Associate Dean views routing and resolves
        routing_assoc = get_routing_response(db, grievance, arun_gupta)
        assert routing_assoc["can_resolve"] is True
        assert routing_assoc["can_escalate"] is True

        change_grievance_status(db, grievance, GrievanceStatus.RESOLVED, arun_gupta, "Registration portal updated successfully.")
        grievance.resolution_notes = "Registration details updated and confirmed on official ERP portal."
        grievance.resolved_by_id = arun_gupta.id
        db.commit()
        db.refresh(grievance)

        assert grievance.status == GrievanceStatus.RESOLVED
        assert grievance.resolution_notes is not None

        # 8. Post-Resolution Pipeline: Manager reviews resolution and closes grievance
        routing_mgr_post = get_routing_response(db, grievance, manager)
        assert routing_mgr_post["can_close"] is True

        change_grievance_status(db, grievance, GrievanceStatus.CLOSED, manager, "Resolution verified with applicant and closed.")
        grievance.closure_remarks = "Grievance resolved and verified by Manager. Case closed."
        grievance.closed_by_id = manager.id
        db.commit()
        db.refresh(grievance)

        assert grievance.status == GrievanceStatus.CLOSED
        assert grievance.closure_remarks is not None
        print("[OK] Scenario 1: Grievance Cluster flow & Manager Closure PASSED")

    finally:
        db.close()


def test_scenario_2_subject_assistant_dean_flow():
    """Test full pipeline for SUBJECT_ASSISTANT_DEAN category:
    Viva -> solved directly by Assistant Dean -> Manager reviews and closes.
    """
    db = SessionLocal()
    try:
        applicant, manager, dean = setup_test_environment(db)

        # 1. Create Grievance
        gid = f"E2E-{uuid.uuid4().hex[:6].upper()}"
        grievance = Grievance(
            grievance_id=gid,
            title="E2E Viva Schedule Issue",
            description="Testing Viva category resolved at Assistant Dean level and closed by Manager",
            applicant_id=applicant.id,
            subject_id=applicant.subject_id,
            status=GrievanceStatus.PENDING_REVIEW,
        )
        viva_cat = db.scalar(select(Category).where(Category.name == "Viva"))
        assert viva_cat is not None
        grievance.final_category_id = viva_cat.id
        grievance.category_reviewed = True
        db.add(grievance)
        db.commit()
        db.refresh(grievance)

        # 2. Manager assigns to Assistant Dean (Priyanka Maurya for Chemistry)
        routing_mgr = get_routing_response(db, grievance, manager)
        priyanka = db.scalar(select(User).where(User.id == routing_mgr["next_authority_id"]))
        assignment = Assignment(
            grievance_id=grievance.id,
            assigned_to=priyanka.id,
            assigned_by=manager.id,
            remarks="Assigned to Assistant Dean",
            is_active=True,
        )
        change_grievance_status(db, grievance, GrievanceStatus.ASSIGNED, manager, "Assigned to Assistant Dean")
        db.add(assignment)
        db.commit()
        db.refresh(grievance)

        # 3. Assistant Dean views routing
        routing_asst = get_routing_response(db, grievance, priyanka)
        assert routing_asst["can_resolve"] is True, "Assistant Dean should be able to resolve Viva category directly"
        assert routing_asst["can_forward"] is False, "Viva should not have next operational forward target"
        assert routing_asst["can_escalate"] is True, "Assistant Dean should be able to escalate if dispute arises"

        # 4. Assistant Dean resolves grievance
        change_grievance_status(db, grievance, GrievanceStatus.RESOLVED, priyanka, "Viva scheduled for 25th August.")
        grievance.resolution_notes = "Viva examination date coordinated with department and scheduled."
        grievance.resolved_by_id = priyanka.id
        db.commit()
        db.refresh(grievance)
        assert grievance.status == GrievanceStatus.RESOLVED

        # 5. Manager reviews and closes
        change_grievance_status(db, grievance, GrievanceStatus.CLOSED, manager, "Manager confirmed closure.")
        grievance.closure_remarks = "Student notified and acknowledged viva schedule."
        grievance.closed_by_id = manager.id
        db.commit()
        db.refresh(grievance)
        assert grievance.status == GrievanceStatus.CLOSED

        print("[OK] Scenario 2: Subject Assistant Dean direct resolution & Manager Closure PASSED")

    finally:
        db.close()


def test_scenario_3_escalation_to_dean_and_closure():
    """Test escalation of a disputed case all the way to the Dean, then Manager/Dean closure."""
    db = SessionLocal()
    try:
        applicant, manager, dean = setup_test_environment(db)

        # 1. Create and Assign Grievance
        gid = f"E2E-{uuid.uuid4().hex[:6].upper()}"
        course_cat = db.scalar(select(Category).where(Category.name == "Course_Work"))
        grievance = Grievance(
            grievance_id=gid,
            title="E2E Disputed Grievance",
            description="Testing escalation to Dean",
            applicant_id=applicant.id,
            subject_id=applicant.subject_id,
            final_category_id=course_cat.id,
            category_reviewed=True,
            status=GrievanceStatus.PENDING_REVIEW,
        )
        db.add(grievance)
        db.commit()
        db.refresh(grievance)

        # Manager forwards to Assistant Dean
        routing_mgr = get_routing_response(db, grievance, manager)
        priyanka = db.scalar(select(User).where(User.id == routing_mgr["next_authority_id"]))
        assignment_1 = Assignment(
            grievance_id=grievance.id,
            assigned_to=priyanka.id,
            assigned_by=manager.id,
            is_active=True,
        )
        change_grievance_status(db, grievance, GrievanceStatus.ASSIGNED, manager, "Assigned")
        db.add(assignment_1)
        db.commit()
        db.refresh(grievance)

        # Assistant Dean marks in progress then escalates
        change_grievance_status(db, grievance, GrievanceStatus.IN_PROGRESS, priyanka, "In progress")
        db.commit()

        # Escalate from Assistant Dean (should route to Associate Dean)
        escalate_grievance(db, grievance, priyanka, "Unresolved at assistant dean level")
        db.commit()
        db.refresh(grievance)
        assert grievance.status == GrievanceStatus.ESCALATED

        # Active assignee should now be an Associate Dean
        active_assignment = db.scalar(select(Assignment).where(Assignment.grievance_id == grievance.id, Assignment.is_active.is_(True)))
        assoc_dean = db.scalar(select(User).where(User.id == active_assignment.assigned_to))
        assert assoc_dean.role == UserRole.ASSOCIATE_DEAN

        # Associate Dean escalates to Dean
        escalate_grievance(db, grievance, assoc_dean, "Requires Executive Dean intervention")
        db.commit()
        db.refresh(grievance)

        active_assignment_dean = db.scalar(select(Assignment).where(Assignment.grievance_id == grievance.id, Assignment.is_active.is_(True)))
        dean_user = db.scalar(select(User).where(User.id == active_assignment_dean.assigned_to))
        assert dean_user.role == UserRole.DEAN

        # Dean resolves
        change_grievance_status(db, grievance, GrievanceStatus.RESOLVED, dean_user, "Resolved by Dean executive decision.")
        grievance.resolution_notes = "Executive approval granted for fellowship disbursement."
        grievance.resolved_by_id = dean_user.id
        db.commit()
        db.refresh(grievance)
        assert grievance.status == GrievanceStatus.RESOLVED

        # Manager performs final closure
        change_grievance_status(db, grievance, GrievanceStatus.CLOSED, manager, "Closure executed after Dean approval.")
        grievance.closure_remarks = "Finance office notified to process payment. Case closed."
        grievance.closed_by_id = manager.id
        db.commit()
        db.refresh(grievance)

        assert grievance.status == GrievanceStatus.CLOSED
        print("[OK] Scenario 3: Escalation to Dean and Manager Closure PASSED")

    finally:
        db.close()


def test_scenario_4_document_attachment_flow():
    """Test document creation, attachment to grievance, and metadata verification."""
    db = SessionLocal()
    try:
        applicant, manager, dean = setup_test_environment(db)

        gid = f"E2E-DOC-{uuid.uuid4().hex[:6].upper()}"
        grievance = Grievance(
            grievance_id=gid,
            title="E2E Document Attached Grievance",
            description="Testing document uploads and resolution proof attachments",
            applicant_id=applicant.id,
            subject_id=applicant.subject_id,
            status=GrievanceStatus.SUBMITTED,
        )
        db.add(grievance)
        db.commit()
        db.refresh(grievance)

        # 1. Applicant attaches document
        doc1 = Document(
            grievance_id=grievance.id,
            uploaded_by=applicant.id,
            file_name="application_receipt.pdf",
            file_path="/storage/documents/sample_receipt.pdf",
            mime_type="application/pdf",
            file_size=102400,
            document_type="ATTACHMENT",
        )
        db.add(doc1)
        db.commit()
        db.refresh(doc1)

        assert doc1.id is not None
        assert doc1.document_type == "ATTACHMENT"

        # 2. Authority attaches resolution proof document
        doc2 = Document(
            grievance_id=grievance.id,
            uploaded_by=manager.id,
            file_name="resolution_approval_order.pdf",
            file_path="/storage/documents/sample_order.pdf",
            mime_type="application/pdf",
            file_size=204800,
            document_type="RESOLUTION_PROOF",
        )
        db.add(doc2)
        db.commit()
        db.refresh(doc2)

        # 3. Check documents on grievance relationship
        db.refresh(grievance)
        docs = db.scalars(select(Document).where(Document.grievance_id == grievance.id)).all()
        assert len(docs) == 2
        types = {d.document_type for d in docs}
        assert "ATTACHMENT" in types
        assert "RESOLUTION_PROOF" in types

        print("[OK] Scenario 4: Document Upload & Resolution Proof Attachment PASSED")

    finally:
        db.close()


def test_scenario_5_fixed_authority_forwarding_and_terminal_behavior():
    """Test dynamic forwarding to a Fixed Authority (Fellowship -> Dr. Dipesh Kumar Verma)
    and verify that forwarding is removed once at terminal authority.
    """
    db = SessionLocal()
    try:
        applicant, manager, dean = setup_test_environment(db)

        # 1. Setup Dipesh Kumar Verma as Fixed Authority for Fellowship
        dipesh = db.scalar(select(User).where(User.email == "dipesh.verma@nivaran.local"))
        if not dipesh:
            dipesh = User(
                full_name="Dr. Dipesh Kumar Verma",
                email="dipesh.verma@nivaran.local",
                password_hash=hash_password("Admin@789"),
                role=UserRole.ASSISTANT_DEAN,
                is_active=True,
            )
            db.add(dipesh)
            db.flush()

        fellowship_cat = db.scalar(select(Category).where(Category.name == "Fellowship"))
        if not fellowship_cat:
            fellowship_cat = Category(
                name="Fellowship",
                routing_type=CategoryRoutingType.FIXED_AUTHORITY,
                fixed_authority_id=dipesh.id,
                is_active=True,
            )
            db.add(fellowship_cat)
            db.flush()
        else:
            fellowship_cat.routing_type = CategoryRoutingType.FIXED_AUTHORITY
            fellowship_cat.fixed_authority_id = dipesh.id
            db.add(fellowship_cat)
            db.flush()
        db.commit()

        # 2. Create Grievance
        gid = f"E2E-FELL-{uuid.uuid4().hex[:6].upper()}"
        grievance = Grievance(
            grievance_id=gid,
            title="Non-disbursement of monthly stipend",
            description="My fellowship stipend has been delayed for 3 months.",
            applicant_id=applicant.id,
            subject_id=applicant.subject_id,
            final_category_id=fellowship_cat.id,
            category_reviewed=True,
            status=GrievanceStatus.PENDING_REVIEW,
        )
        db.add(grievance)
        db.commit()
        db.refresh(grievance)

        # 3. Manager views routing -> First authority is Subject Assistant Dean (Dr. Priyanka Maurya)
        routing_mgr = get_routing_response(db, grievance, manager)
        assert routing_mgr["can_forward"] is True
        assert routing_mgr["next_authority_name"] == "Dr. Priyanka Maurya"

        # Manager assigns to Dr. Priyanka Maurya via assign_grievance endpoint handler
        priyanka = db.scalar(select(User).where(User.id == routing_mgr["next_authority_id"]))
        assign_grievance(
            grievance_id=grievance.grievance_id,
            assignment_data=AssignmentCreate(assigned_to=priyanka.id, remarks="Initial assignment to subject dean"),
            current_user=manager,
            db=db,
        )
        db.refresh(grievance)
        assert grievance.status == GrievanceStatus.ASSIGNED

        # 4. Assistant Dean (Dr. Priyanka Maurya) views grievance:
        # Dynamic lookup recognizes Fellowship is FIXED_AUTHORITY -> next authority is Dr. Dipesh Kumar Verma
        routing_asst = get_routing_response(db, grievance, priyanka)
        assert routing_asst["can_forward"] is True
        assert routing_asst["next_authority_name"] == "Dr. Dipesh Kumar Verma"
        assert routing_asst["next_authority_id"] == dipesh.id

        # Assistant Dean forwards to Dr. Dipesh Kumar Verma
        assign_grievance(
            grievance_id=grievance.grievance_id,
            assignment_data=AssignmentCreate(
                assigned_to=dipesh.id,
                remarks="Forwarded to Fellowship Nodal Officer for disbursement processing",
            ),
            current_user=priyanka,
            db=db,
        )
        db.refresh(grievance)

        # 5. Terminal Authority: Dr. Dipesh Kumar Verma views grievance
        routing_terminal = get_routing_response(db, grievance, dipesh)
        assert routing_terminal["can_forward"] is False, "Terminal authority must NOT have forwarding enabled"
        assert routing_terminal["next_authority_id"] is None
        assert routing_terminal["next_authority_name"] == None
        assert routing_terminal["can_resolve"] is True

        # Attempt to forward from terminal authority should raise HTTPException 400
        from fastapi import HTTPException
        try:
            assign_grievance(
                grievance_id=grievance.grievance_id,
                assignment_data=AssignmentCreate(assigned_to=None, remarks="Illegal forward"),
                current_user=dipesh,
                db=db,
            )
            assert False, "Should have raised HTTPException when forwarding from terminal authority"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "final mapped authority" in exc.detail

        # 6. Verify complete forwarding history & audit log
        from app.models.grievance_status_history import GrievanceStatusHistory
        from app.models.audit_log import AuditLog

        history = db.scalars(
            select(GrievanceStatusHistory)
            .where(GrievanceStatusHistory.grievance_id == grievance.id)
            .order_by(GrievanceStatusHistory.created_at.asc())
        ).all()

        assert len(history) >= 2
        # Verify initial assignment and forward entries
        forward_history = [h for h in history if "Forwarded by" in (h.reason or "")]
        assert len(forward_history) == 1
        assert "Dr. Priyanka Maurya" in forward_history[0].reason
        assert "Dr. Dipesh Kumar Verma" in forward_history[0].reason

        # Verify AuditLog has GRIEVANCE_FORWARDED
        forward_audits = db.scalars(
            select(AuditLog)
            .where(
                AuditLog.grievance_id == grievance.id,
                AuditLog.action == "GRIEVANCE_FORWARDED",
            )
        ).all()
        assert len(forward_audits) == 1

        # 7. Dr. Dipesh Kumar Verma resolves grievance
        change_grievance_status(db, grievance, GrievanceStatus.RESOLVED, dipesh, "Fellowship arrears processed.")
        grievance.resolution_notes = "Arrears credited to applicant bank account."
        grievance.resolved_by_id = dipesh.id
        db.commit()

        # 8. Manager closes
        change_grievance_status(db, grievance, GrievanceStatus.CLOSED, manager, "Closure verified.")
        grievance.closure_remarks = "Stipend received confirmation by applicant."
        grievance.closed_by_id = manager.id
        db.commit()

        print("[OK] Scenario 5: Fixed Authority Dynamic Forwarding & Terminal Removal PASSED")

    finally:
        db.close()


def test_scenario_6_subject_category_terminal_removal():
    """Test that a Subject Assistant Dean category (e.g. Fee) does NOT show forwarding to the Assistant Dean."""
    db = SessionLocal()
    try:
        applicant, manager, dean = setup_test_environment(db)

        fee_cat = db.scalar(select(Category).where(Category.name == "Fee"))
        assert fee_cat is not None

        gid = f"E2E-FEE-{uuid.uuid4().hex[:6].upper()}"
        grievance = Grievance(
            grievance_id=gid,
            title="Fee Receipt Discrepancy",
            description="Semester fee receipt not reflecting in ERP.",
            applicant_id=applicant.id,
            subject_id=applicant.subject_id,
            final_category_id=fee_cat.id,
            category_reviewed=True,
            status=GrievanceStatus.PENDING_REVIEW,
        )
        db.add(grievance)
        db.commit()
        db.refresh(grievance)

        # Manager assigns to Assistant Dean
        routing_mgr = get_routing_response(db, grievance, manager)
        priyanka = db.scalar(select(User).where(User.id == routing_mgr["next_authority_id"]))
        assign_grievance(
            grievance_id=grievance.grievance_id,
            assignment_data=AssignmentCreate(assigned_to=priyanka.id),
            current_user=manager,
            db=db,
        )
        db.refresh(grievance)

        # Assistant Dean views routing -> Should be terminal for SUBJECT_ASSISTANT_DEAN
        routing_asst = get_routing_response(db, grievance, priyanka)
        assert routing_asst["can_forward"] is False
        assert routing_asst["next_authority_name"] is None
        assert routing_asst["can_resolve"] is True

        print("[OK] Scenario 6: Subject Category Terminal Removal PASSED")

    finally:
        db.close()


if __name__ == "__main__":
    print("\n--- RUNNING E2E GRIEVANCE PIPELINE & RESOLUTION TESTS ---\n")
    test_scenario_1_grievance_cluster_flow()
    test_scenario_2_subject_assistant_dean_flow()
    test_scenario_3_escalation_to_dean_and_closure()
    test_scenario_4_document_attachment_flow()
    test_scenario_5_fixed_authority_forwarding_and_terminal_behavior()
    test_scenario_6_subject_category_terminal_removal()
    print("\nALL 6 PIPELINE SCENARIOS PASSED WITH ZERO ERRORS!\n")
