import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.enums import GrievanceStatus, GrievancePriority
from app.schemas.dean_analytics import (
    DeanDashboardResponse,
    DeanAttentionItem,
    ActivityFeedItem,
)
from app.services.dean_analytics_service import DeanAnalyticsService

router = APIRouter(prefix="/dean", tags=["Dean Analytics & Oversight"])


@router.get(
    "/analytics",
    response_model=DeanDashboardResponse,
    summary="Get complete institutional analytics for Dean Dashboard",
)
def get_dean_dashboard_analytics(
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    subject_id: Optional[uuid.UUID] = Query(None, description="Subject/Department ID"),
    category_id: Optional[uuid.UUID] = Query(None, description="Category ID"),
    priority: Optional[GrievancePriority] = Query(None, description="Priority level"),
    status: Optional[GrievanceStatus] = Query(None, description="Grievance status"),
    authority_role: Optional[UserRole] = Query(None, description="Authority role filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DEAN)),
):
    """
    Returns executive KPIs, stage-by-stage grievance flow, AI performance,
    authority workloads, category/subject analytics, trends, risk monitoring,
    recent activity feed, and cases requiring Dean's immediate attention.
    """
    return DeanAnalyticsService.get_full_dashboard_analytics(
        db=db,
        start_date=start_date,
        end_date=end_date,
        subject_id=subject_id,
        category_id=category_id,
        priority=priority,
        status=status,
        authority_role=authority_role,
    )


@router.get(
    "/attention",
    response_model=List[DeanAttentionItem],
    summary="Get cases requiring Dean's immediate attention",
)
def get_dean_attention_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DEAN)),
):
    """
    Returns high-priority, escalated, overdue, or multi-escalated cases
    requiring Dean decision or institutional intervention.
    """
    _, attention_cases = DeanAnalyticsService.get_risk_monitoring_and_attention(db=db)
    return attention_cases


@router.get(
    "/activity-feed",
    response_model=List[ActivityFeedItem],
    summary="Get institutional real-time activity stream",
)
def get_dean_activity_feed(
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DEAN)),
):
    """
    Returns chronological timeline of institutional grievance events.
    """
    return DeanAnalyticsService.get_recent_activity_feed(db=db, limit=limit)
