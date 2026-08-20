import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ----------------------------------------------------------------------
# 1. EXECUTIVE OVERVIEW KPIS
# ----------------------------------------------------------------------
class ExecutiveKPIs(BaseModel):
    total_grievances: int = 0
    active_grievances: int = 0
    resolved_grievances: int = 0
    closed_grievances: int = 0
    escalated_cases: int = 0
    pending_at_manager: int = 0
    pending_at_assistant_dean: int = 0
    pending_at_associate_dean: int = 0
    pending_at_dean: int = 0
    resolution_rate: float = 0.0  # percentage
    avg_resolution_time_hours: float = 0.0
    ai_prediction_accuracy: float = 0.0  # percentage


# ----------------------------------------------------------------------
# 2. GRIEVANCE FLOW ANALYTICS
# ----------------------------------------------------------------------
class GrievanceFlowStage(BaseModel):
    stage_key: str
    stage_name: str
    order: int
    total_handled: int = 0
    current_pending: int = 0
    escalated_out: int = 0
    avg_dwell_hours: float = 0.0


# ----------------------------------------------------------------------
# 3. AI PERFORMANCE ANALYTICS
# ----------------------------------------------------------------------
class CategoryAIAccuracy(BaseModel):
    category_id: Optional[uuid.UUID] = None
    category_name: str
    total_predictions: int = 0
    correct_predictions: int = 0
    overridden_predictions: int = 0
    accuracy_percentage: float = 0.0


class AIOffsetLog(BaseModel):
    grievance_id: str
    title: str
    ai_predicted_category: Optional[str] = None
    manager_final_category: Optional[str] = None
    confidence_score: Optional[float] = None
    reviewed_at: Optional[datetime] = None


class AIPerformanceAnalytics(BaseModel):
    total_predictions: int = 0
    correct_predictions: int = 0
    overridden_predictions: int = 0
    ai_accuracy_percentage: float = 0.0
    low_confidence_count: int = 0
    avg_confidence_score: float = 0.0
    category_wise_accuracy: List[CategoryAIAccuracy] = []
    recent_overrides: List[AIOffsetLog] = []


# ----------------------------------------------------------------------
# 4. AUTHORITY PERFORMANCE
# ----------------------------------------------------------------------
class AuthorityWorkloadItem(BaseModel):
    user_id: Optional[uuid.UUID] = None
    name: str
    role: str
    department_or_subject: Optional[str] = None
    assigned_count: int = 0
    resolved_count: int = 0
    pending_count: int = 0
    escalated_count: int = 0
    avg_resolution_hours: float = 0.0


# ----------------------------------------------------------------------
# 5. CATEGORY ANALYTICS
# ----------------------------------------------------------------------
class CategoryDistributionItem(BaseModel):
    category_id: Optional[uuid.UUID] = None
    category_name: str
    count: int = 0
    percentage: float = 0.0
    escalated_count: int = 0
    avg_resolution_hours: float = 0.0


# ----------------------------------------------------------------------
# 6. SUBJECT / DEPARTMENT ANALYTICS
# ----------------------------------------------------------------------
class SubjectAnalyticsItem(BaseModel):
    subject_id: Optional[uuid.UUID] = None
    subject_name: str
    cluster_name: Optional[str] = None
    total_grievances: int = 0
    pending_grievances: int = 0
    resolved_grievances: int = 0
    escalated_grievances: int = 0
    assistant_dean_name: Optional[str] = None


class ClusterAnalyticsItem(BaseModel):
    cluster_name: str
    total_grievances: int = 0
    pending_grievances: int = 0
    resolved_grievances: int = 0


# ----------------------------------------------------------------------
# 7. TREND ANALYSIS
# ----------------------------------------------------------------------
class TrendDataPoint(BaseModel):
    period: str  # e.g., "2026-08-10" or "Aug 10"
    submitted_count: int = 0
    resolved_count: int = 0
    escalated_count: int = 0


# ----------------------------------------------------------------------
# 8. PRIORITY & RISK MONITORING
# ----------------------------------------------------------------------
class RiskCaseItem(BaseModel):
    id: uuid.UUID
    grievance_id: str
    title: str
    priority: str
    status: str
    subject_name: Optional[str] = None
    category_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_role: Optional[str] = None
    submitted_at: datetime
    aging_days: int = 0
    risk_factor: str  # "SLA_BREACH", "HIGH_PRIORITY_UNRESOLVED", "REPEATEDLY_ESCALATED"
    escalation_count: int = 0


class RiskMonitoringSummary(BaseModel):
    high_priority_unresolved_count: int = 0
    sla_risk_count: int = 0
    aging_pending_count: int = 0  # > 7 days
    frequently_escalated_count: int = 0
    critical_cases: List[RiskCaseItem] = []


# ----------------------------------------------------------------------
# 9. RECENT ACTIVITY FEED
# ----------------------------------------------------------------------
class ActivityFeedItem(BaseModel):
    id: str
    event_type: str  # "ESCALATED", "RESOLVED", "ASSIGNED", "SUBMITTED", "AI_OVERRIDDEN", "CLOSED", "REOPENED"
    grievance_id: str
    grievance_title: str
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    description: str
    timestamp: datetime


# ----------------------------------------------------------------------
# 10. FILTER METADATA & PARAMS
# ----------------------------------------------------------------------
class FilterMetadata(BaseModel):
    categories: List[dict] = []
    subjects: List[dict] = []
    priorities: List[str] = []
    statuses: List[str] = []
    authorities: List[dict] = []


# ----------------------------------------------------------------------
# 11. DEAN'S ATTENTION REQUIRED
# ----------------------------------------------------------------------
class DeanAttentionItem(BaseModel):
    id: uuid.UUID
    grievance_id: str
    title: str
    description: str
    priority: str
    status: str
    subject_name: Optional[str] = None
    category_name: Optional[str] = None
    referred_by_name: Optional[str] = None
    referred_by_role: Optional[str] = None
    current_assigned_role: Optional[str] = None
    submitted_at: datetime
    aging_days: int = 0
    urgency_reason: str
    escalation_count: int = 0


# ----------------------------------------------------------------------
# AGGREGATE DEAN DASHBOARD RESPONSE
# ----------------------------------------------------------------------
class DeanDashboardResponse(BaseModel):
    kpis: ExecutiveKPIs
    flow_stages: List[GrievanceFlowStage] = []
    ai_analytics: AIPerformanceAnalytics
    authority_workloads: List[AuthorityWorkloadItem] = []
    category_analytics: List[CategoryDistributionItem] = []
    subject_analytics: List[SubjectAnalyticsItem] = []
    cluster_analytics: List[ClusterAnalyticsItem] = []
    trends: List[TrendDataPoint] = []
    risk_monitoring: RiskMonitoringSummary
    recent_activities: List[ActivityFeedItem] = []
    dean_attention_cases: List[DeanAttentionItem] = []
    filters_meta: FilterMetadata
