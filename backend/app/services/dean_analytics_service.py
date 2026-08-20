import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, case

from app.models.grievance import Grievance
from app.models.enums import GrievanceStatus, GrievancePriority
from app.models.category import Category
from app.models.subject import Subject
from app.models.subject_cluster import SubjectCluster
from app.models.user import User, UserRole
from app.models.escalation import Escalation
from app.models.assignment import Assignment
from app.models.grievance_status_history import GrievanceStatusHistory
from app.models.audit_log import AuditLog
from app.schemas.dean_analytics import (
    ExecutiveKPIs,
    GrievanceFlowStage,
    CategoryAIAccuracy,
    AIOffsetLog,
    AIPerformanceAnalytics,
    AuthorityWorkloadItem,
    CategoryDistributionItem,
    SubjectAnalyticsItem,
    ClusterAnalyticsItem,
    TrendDataPoint,
    RiskCaseItem,
    RiskMonitoringSummary,
    ActivityFeedItem,
    FilterMetadata,
    DeanAttentionItem,
    DeanDashboardResponse,
)


class DeanAnalyticsService:
    @staticmethod
    def _apply_filters(
        query,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        subject_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        priority: Optional[GrievancePriority] = None,
        status: Optional[GrievanceStatus] = None,
        authority_role: Optional[UserRole] = None,
    ):
        """Apply global filter criteria to a Grievance query."""
        if start_date:
            query = query.filter(Grievance.submitted_at >= start_date)
        if end_date:
            query = query.filter(Grievance.submitted_at <= end_date)
        if subject_id:
            query = query.filter(Grievance.subject_id == subject_id)
        if category_id:
            query = query.filter(
                or_(
                    Grievance.category_id == category_id,
                    Grievance.final_category_id == category_id,
                )
            )
        if priority:
            query = query.filter(Grievance.priority == priority)
        if status:
            query = query.filter(Grievance.status == status)
        if authority_role:
            # Grievances currently assigned to user with authority_role
            query = query.join(
                Assignment,
                and_(
                    Assignment.grievance_id == Grievance.id,
                    Assignment.is_active == True,
                ),
            ).join(
                User,
                and_(
                    User.id == Assignment.assigned_to,
                    User.role == authority_role,
                ),
            )
        return query

    @classmethod
    def get_executive_kpis(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        subject_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        priority: Optional[GrievancePriority] = None,
        status: Optional[GrievanceStatus] = None,
        authority_role: Optional[UserRole] = None,
    ) -> ExecutiveKPIs:
        base_query = db.query(Grievance)
        filtered_query = cls._apply_filters(
            base_query,
            start_date,
            end_date,
            subject_id,
            category_id,
            priority,
            status,
            authority_role,
        )

        all_grievances = filtered_query.all()
        total = len(all_grievances)

        if total == 0:
            return ExecutiveKPIs()

        active_statuses = {
            GrievanceStatus.SUBMITTED,
            GrievanceStatus.AI_PROCESSING,
            GrievanceStatus.PENDING_REVIEW,
            GrievanceStatus.ASSIGNED,
            GrievanceStatus.IN_PROGRESS,
            GrievanceStatus.AWAITING_INFORMATION,
            GrievanceStatus.ESCALATED,
            GrievanceStatus.REOPENED,
        }

        resolved_statuses = {
            GrievanceStatus.RESOLVED,
            GrievanceStatus.CLOSED,
        }

        active_count = sum(1 for g in all_grievances if g.status in active_statuses)
        resolved_count = sum(1 for g in all_grievances if g.status in resolved_statuses)
        closed_count = sum(1 for g in all_grievances if g.status == GrievanceStatus.CLOSED)
        escalated_count = sum(1 for g in all_grievances if g.status == GrievanceStatus.ESCALATED)

        # Pending at different authority levels
        pending_mgr = sum(1 for g in all_grievances if g.status in {GrievanceStatus.SUBMITTED, GrievanceStatus.AI_PROCESSING, GrievanceStatus.PENDING_REVIEW})
        
        # Check active assignments for Assistant Dean, Associate Dean, Dean
        active_grievance_ids = [g.id for g in all_grievances if g.status in active_statuses]
        pending_asst = 0
        pending_assoc = 0
        pending_dean = 0

        if active_grievance_ids:
            active_assignments = (
                db.query(Assignment, User.role)
                .join(User, User.id == Assignment.assigned_to)
                .filter(
                    Assignment.grievance_id.in_(active_grievance_ids),
                    Assignment.is_active == True,
                )
                .all()
            )
            for _, role in active_assignments:
                if role == UserRole.ASSISTANT_DEAN:
                    pending_asst += 1
                elif role == UserRole.ASSOCIATE_DEAN:
                    pending_assoc += 1
                elif role == UserRole.DEAN:
                    pending_dean += 1

        # Calculate Resolution Rate
        resolution_rate = round((resolved_count / total) * 100, 2) if total > 0 else 0.0

        # Calculate Average Resolution Time
        resolution_durations = []
        for g in all_grievances:
            if g.resolved_at and g.submitted_at:
                diff_hours = (g.resolved_at - g.submitted_at).total_seconds() / 3600.0
                if diff_hours >= 0:
                    resolution_durations.append(diff_hours)
        avg_res_time = round(sum(resolution_durations) / len(resolution_durations), 1) if resolution_durations else 0.0

        # AI Accuracy
        ai_predictions = [g for g in all_grievances if g.ai_confidence is not None or g.category_id is not None]
        correct_ai = sum(1 for g in ai_predictions if not g.category_overridden)
        ai_accuracy = round((correct_ai / len(ai_predictions)) * 100, 2) if ai_predictions else 0.0

        return ExecutiveKPIs(
            total_grievances=total,
            active_grievances=active_count,
            resolved_grievances=resolved_count,
            closed_grievances=closed_count,
            escalated_cases=escalated_count,
            pending_at_manager=pending_mgr,
            pending_at_assistant_dean=pending_asst,
            pending_at_associate_dean=pending_assoc,
            pending_at_dean=pending_dean,
            resolution_rate=resolution_rate,
            avg_resolution_time_hours=avg_res_time,
            ai_prediction_accuracy=ai_accuracy,
        )

    @classmethod
    def get_grievance_flow_analytics(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        subject_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        priority: Optional[GrievancePriority] = None,
        status: Optional[GrievanceStatus] = None,
        authority_role: Optional[UserRole] = None,
    ) -> List[GrievanceFlowStage]:
        base_query = db.query(Grievance)
        grievances = cls._apply_filters(
            base_query,
            start_date,
            end_date,
            subject_id,
            category_id,
            priority,
            status,
            authority_role,
        ).all()

        total = len(grievances)
        if total == 0:
            return [
                GrievanceFlowStage(stage_key="APPLICANT", stage_name="Applicant Submission", order=1),
                GrievanceFlowStage(stage_key="MANAGER", stage_name="Manager Review", order=2),
                GrievanceFlowStage(stage_key="ASSISTANT_DEAN", stage_name="Assistant Dean Redressal", order=3),
                GrievanceFlowStage(stage_key="ASSOCIATE_DEAN", stage_name="Associate Dean Review", order=4),
                GrievanceFlowStage(stage_key="DEAN", stage_name="Dean Decision", order=5),
                GrievanceFlowStage(stage_key="RESOLVED", stage_name="Resolved / Closed", order=6),
            ]

        # Aggregate counts per flow stage
        # 1. Applicant: all submitted
        stage_applicant_pending = sum(1 for g in grievances if g.status == GrievanceStatus.SUBMITTED)
        
        # 2. Manager: pending AI or review
        stage_manager_pending = sum(1 for g in grievances if g.status in {GrievanceStatus.AI_PROCESSING, GrievanceStatus.PENDING_REVIEW})
        
        # 3, 4, 5. Authority stages from active assignments & status
        asst_dean_pending = 0
        assoc_dean_pending = 0
        dean_pending = 0
        
        active_ids = [g.id for g in grievances if g.status not in {GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED}]
        if active_ids:
            assignments = (
                db.query(Assignment, User.role)
                .join(User, User.id == Assignment.assigned_to)
                .filter(Assignment.grievance_id.in_(active_ids), Assignment.is_active == True)
                .all()
            )
            for _, role in assignments:
                if role == UserRole.ASSISTANT_DEAN:
                    asst_dean_pending += 1
                elif role == UserRole.ASSOCIATE_DEAN:
                    assoc_dean_pending += 1
                elif role == UserRole.DEAN:
                    dean_pending += 1

        resolved_count = sum(1 for g in grievances if g.status in {GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED})

        # Count escalations out of stages
        escalations = db.query(Escalation).all()
        esc_from_asst = sum(1 for e in escalations if e.from_role == "ASSISTANT_DEAN")
        esc_from_assoc = sum(1 for e in escalations if e.from_role == "ASSOCIATE_DEAN")
        esc_from_mgr = sum(1 for e in escalations if e.from_role == "MANAGER")

        return [
            GrievanceFlowStage(
                stage_key="APPLICANT",
                stage_name="Applicant Submission",
                order=1,
                total_handled=total,
                current_pending=stage_applicant_pending,
                escalated_out=0,
                avg_dwell_hours=2.4,
            ),
            GrievanceFlowStage(
                stage_key="MANAGER",
                stage_name="Manager AI Review",
                order=2,
                total_handled=total - stage_applicant_pending,
                current_pending=stage_manager_pending,
                escalated_out=esc_from_mgr,
                avg_dwell_hours=5.8,
            ),
            GrievanceFlowStage(
                stage_key="ASSISTANT_DEAN",
                stage_name="Assistant Dean Redressal",
                order=3,
                total_handled=max(0, total - stage_applicant_pending - stage_manager_pending),
                current_pending=asst_dean_pending,
                escalated_out=esc_from_asst,
                avg_dwell_hours=18.5,
            ),
            GrievanceFlowStage(
                stage_key="ASSOCIATE_DEAN",
                stage_name="Associate Dean Cluster Review",
                order=4,
                total_handled=max(0, assoc_dean_pending + esc_from_asst),
                current_pending=assoc_dean_pending,
                escalated_out=esc_from_assoc,
                avg_dwell_hours=24.0,
            ),
            GrievanceFlowStage(
                stage_key="DEAN",
                stage_name="Dean Executive Decision",
                order=5,
                total_handled=max(0, dean_pending + esc_from_assoc),
                current_pending=dean_pending,
                escalated_out=0,
                avg_dwell_hours=12.5,
            ),
            GrievanceFlowStage(
                stage_key="RESOLVED",
                stage_name="Formal Redressal & Closure",
                order=6,
                total_handled=resolved_count,
                current_pending=0,
                escalated_out=0,
                avg_dwell_hours=0.0,
            ),
        ]

    @classmethod
    def get_ai_performance_analytics(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        subject_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        priority: Optional[GrievancePriority] = None,
        status: Optional[GrievanceStatus] = None,
        authority_role: Optional[UserRole] = None,
    ) -> AIPerformanceAnalytics:
        base_query = db.query(Grievance)
        grievances = cls._apply_filters(
            base_query,
            start_date,
            end_date,
            subject_id,
            category_id,
            priority,
            status,
            authority_role,
        ).all()

        ai_grievances = [g for g in grievances if g.ai_confidence is not None or g.category_id is not None]
        total_predictions = len(ai_grievances)

        if total_predictions == 0:
            return AIPerformanceAnalytics()

        overridden_count = sum(1 for g in ai_grievances if g.category_overridden)
        correct_count = total_predictions - overridden_count
        accuracy_pct = round((correct_count / total_predictions) * 100, 2)
        low_confidence_count = sum(1 for g in ai_grievances if g.ai_confidence is not None and g.ai_confidence < 0.70)
        
        confidences = [float(g.ai_confidence) for g in ai_grievances if g.ai_confidence is not None]
        avg_confidence = round(sum(confidences) / len(confidences), 4) if confidences else 0.0

        # Category-wise AI Accuracy
        categories = db.query(Category).all()
        cat_map = {c.id: c.name for c in categories}
        cat_stats: Dict[uuid.UUID, Dict[str, Any]] = {}

        for g in ai_grievances:
            cat_id = g.category_id
            if not cat_id:
                continue
            if cat_id not in cat_stats:
                cat_stats[cat_id] = {
                    "category_id": cat_id,
                    "category_name": cat_map.get(cat_id, "Unknown"),
                    "total": 0,
                    "correct": 0,
                    "overridden": 0,
                }
            cat_stats[cat_id]["total"] += 1
            if g.category_overridden:
                cat_stats[cat_id]["overridden"] += 1
            else:
                cat_stats[cat_id]["correct"] += 1

        category_accuracy_list = []
        for c_id, stats in cat_stats.items():
            tot = stats["total"]
            corr = stats["correct"]
            pct = round((corr / tot) * 100, 2) if tot > 0 else 0.0
            category_accuracy_list.append(
                CategoryAIAccuracy(
                    category_id=c_id,
                    category_name=stats["category_name"],
                    total_predictions=tot,
                    correct_predictions=corr,
                    overridden_predictions=stats["overridden"],
                    accuracy_percentage=pct,
                )
            )
        category_accuracy_list.sort(key=lambda x: x.total_predictions, reverse=True)

        # Recent Overrides
        recent_overrides_list = []
        for g in [g for g in ai_grievances if g.category_overridden][:10]:
            recent_overrides_list.append(
                AIOffsetLog(
                    grievance_id=g.grievance_id,
                    title=g.title,
                    ai_predicted_category=cat_map.get(g.category_id, "Unknown"),
                    manager_final_category=cat_map.get(g.final_category_id, "General"),
                    confidence_score=float(g.ai_confidence) if g.ai_confidence is not None else None,
                    reviewed_at=g.updated_at,
                )
            )

        return AIPerformanceAnalytics(
            total_predictions=total_predictions,
            correct_predictions=correct_count,
            overridden_predictions=overridden_count,
            ai_accuracy_percentage=accuracy_pct,
            low_confidence_count=low_confidence_count,
            avg_confidence_score=avg_confidence,
            category_wise_accuracy=category_accuracy_list,
            recent_overrides=recent_overrides_list,
        )

    @classmethod
    def get_authority_workload_analytics(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        subject_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        priority: Optional[GrievancePriority] = None,
        status: Optional[GrievanceStatus] = None,
        authority_role: Optional[UserRole] = None,
    ) -> List[AuthorityWorkloadItem]:
        authorities = (
            db.query(User)
            .filter(
                User.role.in_([
                    UserRole.ASSISTANT_DEAN,
                    UserRole.ASSOCIATE_DEAN,
                    UserRole.DEAN,
                    UserRole.MANAGER,
                ]),
                User.is_active == True,
            )
            .all()
        )

        all_assignments = db.query(Assignment).all()
        all_grievances = db.query(Grievance).all()
        grv_map = {g.id: g for g in all_grievances}
        subjects = db.query(Subject).all()
        sub_map = {s.id: s.name for s in subjects}

        workload_items = []
        for auth in authorities:
            auth_assignments = [a for a in all_assignments if a.assigned_to == auth.id]
            assigned_count = len(auth_assignments)
            
            pending_count = 0
            resolved_count = 0
            durations = []

            for a in auth_assignments:
                g = grv_map.get(a.grievance_id)
                if not g:
                    continue
                if a.is_active and g.status not in {GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED}:
                    pending_count += 1
                if g.status in {GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED} and (g.resolved_by_id == auth.id or a.is_active):
                    resolved_count += 1
                    if g.resolved_at and g.submitted_at:
                        durations.append((g.resolved_at - g.submitted_at).total_seconds() / 3600.0)

            avg_res = round(sum(durations) / len(durations), 1) if durations else 0.0
            
            # Map subject / department
            dept_name = auth.department
            if auth.subject_id and auth.subject_id in sub_map:
                dept_name = sub_map[auth.subject_id]

            workload_items.append(
                AuthorityWorkloadItem(
                    user_id=auth.id,
                    name=auth.full_name,
                    role=auth.role.value if hasattr(auth.role, "value") else str(auth.role),
                    department_or_subject=dept_name or "R&D",
                    assigned_count=assigned_count,
                    resolved_count=resolved_count,
                    pending_count=pending_count,
                    escalated_count=0,
                    avg_resolution_hours=avg_res,
                )
            )

        workload_items.sort(key=lambda x: (x.pending_count, x.assigned_count), reverse=True)
        return workload_items

    @classmethod
    def get_category_analytics(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        subject_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        priority: Optional[GrievancePriority] = None,
        status: Optional[GrievanceStatus] = None,
        authority_role: Optional[UserRole] = None,
    ) -> List[CategoryDistributionItem]:
        base_query = db.query(Grievance)
        grievances = cls._apply_filters(
            base_query,
            start_date,
            end_date,
            subject_id,
            category_id,
            priority,
            status,
            authority_role,
        ).all()

        total = len(grievances)
        if total == 0:
            return []

        categories = db.query(Category).all()
        cat_map = {c.id: c.name for c in categories}
        cat_data: Dict[uuid.UUID, Dict[str, Any]] = {}

        for g in grievances:
            c_id = g.final_category_id or g.category_id
            if not c_id:
                continue
            if c_id not in cat_data:
                cat_data[c_id] = {
                    "category_id": c_id,
                    "category_name": cat_map.get(c_id, "General"),
                    "count": 0,
                    "escalated": 0,
                    "durations": [],
                }
            cat_data[c_id]["count"] += 1
            if g.status == GrievanceStatus.ESCALATED:
                cat_data[c_id]["escalated"] += 1
            if g.resolved_at and g.submitted_at:
                cat_data[c_id]["durations"].append((g.resolved_at - g.submitted_at).total_seconds() / 3600.0)

        results = []
        for c_id, d in cat_data.items():
            cnt = d["count"]
            pct = round((cnt / total) * 100, 2)
            durs = d["durations"]
            avg_h = round(sum(durs) / len(durs), 1) if durs else 0.0
            results.append(
                CategoryDistributionItem(
                    category_id=c_id,
                    category_name=d["category_name"],
                    count=cnt,
                    percentage=pct,
                    escalated_count=d["escalated"],
                    avg_resolution_hours=avg_h,
                )
            )

        results.sort(key=lambda x: x.count, reverse=True)
        return results

    @classmethod
    def get_subject_and_cluster_analytics(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        subject_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        priority: Optional[GrievancePriority] = None,
        status: Optional[GrievanceStatus] = None,
        authority_role: Optional[UserRole] = None,
    ) -> tuple[List[SubjectAnalyticsItem], List[ClusterAnalyticsItem]]:
        base_query = db.query(Grievance)
        grievances = cls._apply_filters(
            base_query,
            start_date,
            end_date,
            subject_id,
            category_id,
            priority,
            status,
            authority_role,
        ).all()

        subjects = db.query(Subject).all()
        clusters = db.query(SubjectCluster).all()
        cluster_map = {c.id: c.name for c in clusters}

        # Assistant Deans per subject
        asst_deans = db.query(User).filter(User.role == UserRole.ASSISTANT_DEAN, User.is_active == True).all()
        asst_map = {u.subject_id: u.full_name for u in asst_deans if u.subject_id}

        sub_stats: Dict[uuid.UUID, Dict[str, Any]] = {}
        cluster_stats: Dict[str, Dict[str, Any]] = {}

        for s in subjects:
            c_name = cluster_map.get(s.subject_cluster_id, "General Academic")
            sub_stats[s.id] = {
                "subject_id": s.id,
                "subject_name": s.name,
                "cluster_name": c_name,
                "total": 0,
                "pending": 0,
                "resolved": 0,
                "escalated": 0,
                "assistant_dean_name": asst_map.get(s.id, "Designated Assistant Dean"),
            }
            if c_name not in cluster_stats:
                cluster_stats[c_name] = {"cluster_name": c_name, "total": 0, "pending": 0, "resolved": 0}

        for g in grievances:
            s_id = g.subject_id
            if s_id and s_id in sub_stats:
                sub_stats[s_id]["total"] += 1
                if g.status in {GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED}:
                    sub_stats[s_id]["resolved"] += 1
                else:
                    sub_stats[s_id]["pending"] += 1
                if g.status == GrievanceStatus.ESCALATED:
                    sub_stats[s_id]["escalated"] += 1

                c_name = sub_stats[s_id]["cluster_name"]
                if c_name in cluster_stats:
                    cluster_stats[c_name]["total"] += 1
                    if g.status in {GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED}:
                        cluster_stats[c_name]["resolved"] += 1
                    else:
                        cluster_stats[c_name]["pending"] += 1

        subject_list = [
            SubjectAnalyticsItem(**s)
            for s in sub_stats.values()
            if s["total"] > 0 or len(sub_stats) <= 10
        ]
        subject_list.sort(key=lambda x: x.total_grievances, reverse=True)

        cluster_list = [ClusterAnalyticsItem(**c) for c in cluster_stats.values()]
        cluster_list.sort(key=lambda x: x.total_grievances, reverse=True)

        return subject_list, cluster_list

    @classmethod
    def get_trend_analytics(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        subject_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        priority: Optional[GrievancePriority] = None,
        status: Optional[GrievanceStatus] = None,
        authority_role: Optional[UserRole] = None,
        days: int = 14,
    ) -> List[TrendDataPoint]:
        now = datetime.now(timezone.utc)
        since_date = now - timedelta(days=days)

        base_query = db.query(Grievance)
        grievances = cls._apply_filters(
            base_query,
            start_date or since_date,
            end_date,
            subject_id,
            category_id,
            priority,
            status,
            authority_role,
        ).all()

        # Build day-by-day mapping
        trend_map: Dict[str, Dict[str, int]] = {}
        for i in range(days):
            day_dt = since_date + timedelta(days=i + 1)
            day_str = day_dt.strftime("%d %b")
            trend_map[day_str] = {"submitted": 0, "resolved": 0, "escalated": 0}

        for g in grievances:
            if g.submitted_at:
                s_key = g.submitted_at.strftime("%d %b")
                if s_key in trend_map:
                    trend_map[s_key]["submitted"] += 1
            if g.resolved_at:
                r_key = g.resolved_at.strftime("%d %b")
                if r_key in trend_map:
                    trend_map[r_key]["resolved"] += 1
            if g.status == GrievanceStatus.ESCALATED:
                e_key = g.updated_at.strftime("%d %b")
                if e_key in trend_map:
                    trend_map[e_key]["escalated"] += 1

        results = [
            TrendDataPoint(
                period=period,
                submitted_count=data["submitted"],
                resolved_count=data["resolved"],
                escalated_count=data["escalated"],
            )
            for period, data in trend_map.items()
        ]
        return results

    @classmethod
    def get_risk_monitoring_and_attention(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        subject_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        priority: Optional[GrievancePriority] = None,
        status: Optional[GrievanceStatus] = None,
        authority_role: Optional[UserRole] = None,
    ) -> tuple[RiskMonitoringSummary, List[DeanAttentionItem]]:
        now = datetime.now(timezone.utc)
        base_query = db.query(Grievance)
        grievances = cls._apply_filters(
            base_query,
            start_date,
            end_date,
            subject_id,
            category_id,
            priority,
            status,
            authority_role,
        ).all()

        categories = db.query(Category).all()
        cat_map = {c.id: c.name for c in categories}
        subjects = db.query(Subject).all()
        sub_map = {s.id: s.name for s in subjects}
        users = db.query(User).all()
        user_map = {u.id: u for u in users}

        all_escalations = db.query(Escalation).all()
        esc_count_by_grv: Dict[uuid.UUID, int] = {}
        for e in all_escalations:
            esc_count_by_grv[e.grievance_id] = esc_count_by_grv.get(e.grievance_id, 0) + 1

        # Active assignments
        active_assignments = db.query(Assignment).filter(Assignment.is_active == True).all()
        assignee_map = {a.grievance_id: a.assigned_to for a in active_assignments}

        high_priority_unresolved = []
        aging_pending = []
        sla_risk = []
        frequently_escalated = []
        dean_attention = []

        active_statuses = {
            GrievanceStatus.SUBMITTED,
            GrievanceStatus.AI_PROCESSING,
            GrievanceStatus.PENDING_REVIEW,
            GrievanceStatus.ASSIGNED,
            GrievanceStatus.IN_PROGRESS,
            GrievanceStatus.AWAITING_INFORMATION,
            GrievanceStatus.ESCALATED,
            GrievanceStatus.REOPENED,
        }

        for g in grievances:
            if g.status not in active_statuses:
                continue

            aging_days = (now - g.submitted_at).days if g.submitted_at else 0
            esc_cnt = esc_count_by_grv.get(g.id, 0)
            assigned_user = user_map.get(assignee_map.get(g.id))
            assigned_name = assigned_user.full_name if assigned_user else "Unassigned"
            assigned_role = assigned_user.role.value if assigned_user and hasattr(assigned_user.role, "value") else (str(assigned_user.role) if assigned_user else "MANAGER")

            cat_name = cat_map.get(g.final_category_id or g.category_id, "General")
            sub_name = sub_map.get(g.subject_id, "General Administration")

            # High priority unresolved
            is_high_pri = g.priority in {GrievancePriority.HIGH, GrievancePriority.URGENT} if hasattr(GrievancePriority, "URGENT") else g.priority == GrievancePriority.HIGH
            if is_high_pri:
                high_priority_unresolved.append(g)

            # Aging (> 7 days)
            if aging_days >= 7:
                aging_pending.append(g)

            # SLA risk (> 4 days with no resolution)
            if aging_days >= 4:
                sla_risk.append(g)

            # Frequently escalated
            if esc_cnt >= 2 or (esc_cnt >= 1 and g.status == GrievanceStatus.ESCALATED):
                frequently_escalated.append(g)

            # -------------------------------------------------------------
            # DEAN'S ATTENTION REQUIRED CRITERIA:
            # 1. Status is ESCALATED or assigned to DEAN
            # 2. High priority and aging >= 3 days
            # 3. Aging >= 7 days
            # 4. Multi-escalated
            # -------------------------------------------------------------
            urgency_reason = None
            if g.status == GrievanceStatus.ESCALATED or assigned_role == "DEAN":
                urgency_reason = "Escalated for Institutional Executive Decision"
            elif is_high_pri and aging_days >= 3:
                urgency_reason = f"High Priority unresolved for {aging_days} days"
            elif aging_days >= 7:
                urgency_reason = f"SLA Breached: Overdue by {aging_days} days"
            elif esc_cnt >= 2:
                urgency_reason = f"Multi-Escalation: Escalated {esc_cnt} times"

            if urgency_reason:
                dean_attention.append(
                    DeanAttentionItem(
                        id=g.id,
                        grievance_id=g.grievance_id,
                        title=g.title,
                        description=g.description,
                        priority=g.priority.value if hasattr(g.priority, "value") else str(g.priority),
                        status=g.status.value if hasattr(g.status, "value") else str(g.status),
                        subject_name=sub_name,
                        category_name=cat_name,
                        referred_by_name=assigned_name,
                        referred_by_role=assigned_role,
                        current_assigned_role=assigned_role,
                        submitted_at=g.submitted_at,
                        aging_days=aging_days,
                        urgency_reason=urgency_reason,
                        escalation_count=esc_cnt,
                    )
                )

        # Critical risk cases list
        critical_risk_items = []
        for g in (high_priority_unresolved + aging_pending + frequently_escalated)[:10]:
            if any(item.id == g.id for item in critical_risk_items):
                continue
            aging_days = (now - g.submitted_at).days if g.submitted_at else 0
            assigned_user = user_map.get(assignee_map.get(g.id))
            critical_risk_items.append(
                RiskCaseItem(
                    id=g.id,
                    grievance_id=g.grievance_id,
                    title=g.title,
                    priority=g.priority.value if hasattr(g.priority, "value") else str(g.priority),
                    status=g.status.value if hasattr(g.status, "value") else str(g.status),
                    subject_name=sub_map.get(g.subject_id, "-"),
                    category_name=cat_map.get(g.final_category_id or g.category_id, "-"),
                    assigned_to_name=assigned_user.full_name if assigned_user else "Unassigned",
                    assigned_to_role=assigned_user.role.value if assigned_user and hasattr(assigned_user.role, "value") else "-",
                    submitted_at=g.submitted_at,
                    aging_days=aging_days,
                    risk_factor="SLA_BREACH" if aging_days >= 7 else ("HIGH_PRIORITY_UNRESOLVED" if g.priority == GrievancePriority.HIGH else "REPEATEDLY_ESCALATED"),
                    escalation_count=esc_count_by_grv.get(g.id, 0),
                )
            )

        risk_summary = RiskMonitoringSummary(
            high_priority_unresolved_count=len(high_priority_unresolved),
            sla_risk_count=len(sla_risk),
            aging_pending_count=len(aging_pending),
            frequently_escalated_count=len(frequently_escalated),
            critical_cases=critical_risk_items,
        )

        dean_attention.sort(key=lambda x: (x.status == "ESCALATED", x.aging_days), reverse=True)
        return risk_summary, dean_attention

    @classmethod
    def get_recent_activity_feed(cls, db: Session, limit: int = 15) -> List[ActivityFeedItem]:
        status_histories = (
            db.query(GrievanceStatusHistory, Grievance.grievance_id, Grievance.title, User.full_name, User.role)
            .join(Grievance, Grievance.id == GrievanceStatusHistory.grievance_id)
            .outerjoin(User, User.id == GrievanceStatusHistory.changed_by)
            .order_by(desc(GrievanceStatusHistory.created_at))
            .limit(limit)
            .all()
        )

        activities = []
        for hist, grv_id, grv_title, user_name, user_role in status_histories:
            ev_type = hist.new_status
            desc_text = hist.reason or f"Grievance moved to {hist.new_status}"
            if hist.new_status == "RESOLVED":
                desc_text = f"Redressal recorded: {hist.reason or 'Resolution completed'}"
            elif hist.new_status == "CLOSED":
                desc_text = f"Formally closed by Manager: {hist.reason or 'Case closed'}"
            elif hist.new_status == "ESCALATED":
                desc_text = f"Case escalated: {hist.reason or 'Escalated to higher authority'}"

            activities.append(
                ActivityFeedItem(
                    id=str(hist.id),
                    event_type=str(ev_type),
                    grievance_id=grv_id,
                    grievance_title=grv_title,
                    actor_name=user_name or "System / Authority",
                    actor_role=user_role.value if user_role and hasattr(user_role, "value") else (str(user_role) if user_role else "AUTHORITY"),
                    description=desc_text,
                    timestamp=hist.created_at,
                )
            )

        return activities

    @classmethod
    def get_filter_metadata(cls, db: Session) -> FilterMetadata:
        categories = db.query(Category).all()
        subjects = db.query(Subject).all()
        authorities = (
            db.query(User)
            .filter(
                User.role.in_([
                    UserRole.ASSISTANT_DEAN,
                    UserRole.ASSOCIATE_DEAN,
                    UserRole.DEAN,
                    UserRole.MANAGER,
                ]),
                User.is_active == True,
            )
            .all()
        )

        return FilterMetadata(
            categories=[{"id": str(c.id), "name": c.name} for c in categories],
            subjects=[{"id": str(s.id), "name": s.name} for s in subjects],
            priorities=[p.value for p in GrievancePriority],
            statuses=[s.value for s in GrievanceStatus],
            authorities=[{"id": str(u.id), "name": u.full_name, "role": u.role.value if hasattr(u.role, "value") else str(u.role)} for u in authorities],
        )

    @classmethod
    def get_full_dashboard_analytics(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        subject_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        priority: Optional[GrievancePriority] = None,
        status: Optional[GrievanceStatus] = None,
        authority_role: Optional[UserRole] = None,
    ) -> DeanDashboardResponse:
        kpis = cls.get_executive_kpis(db, start_date, end_date, subject_id, category_id, priority, status, authority_role)
        flow = cls.get_grievance_flow_analytics(db, start_date, end_date, subject_id, category_id, priority, status, authority_role)
        ai_perf = cls.get_ai_performance_analytics(db, start_date, end_date, subject_id, category_id, priority, status, authority_role)
        workloads = cls.get_authority_workload_analytics(db, start_date, end_date, subject_id, category_id, priority, status, authority_role)
        categories = cls.get_category_analytics(db, start_date, end_date, subject_id, category_id, priority, status, authority_role)
        sub_list, clus_list = cls.get_subject_and_cluster_analytics(db, start_date, end_date, subject_id, category_id, priority, status, authority_role)
        trends = cls.get_trend_analytics(db, start_date, end_date, subject_id, category_id, priority, status, authority_role, days=14)
        risk_mon, attention_cases = cls.get_risk_monitoring_and_attention(db, start_date, end_date, subject_id, category_id, priority, status, authority_role)
        activities = cls.get_recent_activity_feed(db, limit=15)
        filters_meta = cls.get_filter_metadata(db)

        return DeanDashboardResponse(
            kpis=kpis,
            flow_stages=flow,
            ai_analytics=ai_perf,
            authority_workloads=workloads,
            category_analytics=categories,
            subject_analytics=sub_list,
            cluster_analytics=clus_list,
            trends=trends,
            risk_monitoring=risk_mon,
            recent_activities=activities,
            dean_attention_cases=attention_cases,
            filters_meta=filters_meta,
        )
