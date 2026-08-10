import enum


class Permission(str, enum.Enum):
    # Grievance
    CREATE_GRIEVANCE = "CREATE_GRIEVANCE"
    VIEW_GRIEVANCE = "VIEW_GRIEVANCE"
    UPDATE_GRIEVANCE = "UPDATE_GRIEVANCE"
    RESOLVE_GRIEVANCE = "RESOLVE_GRIEVANCE"
    CLOSE_GRIEVANCE = "CLOSE_GRIEVANCE"
    REOPEN_GRIEVANCE = "REOPEN_GRIEVANCE"

    # Assignment
    ASSIGN_GRIEVANCE = "ASSIGN_GRIEVANCE"
    REASSIGN_GRIEVANCE = "REASSIGN_GRIEVANCE"
    VIEW_ASSIGNMENTS = "VIEW_ASSIGNMENTS"

    # Escalation
    INITIATE_ESCALATION = "INITIATE_ESCALATION"
    VIEW_ESCALATION = "VIEW_ESCALATION"

    # AI
    VIEW_AI_RECOMMENDATION = "VIEW_AI_RECOMMENDATION"
    REVIEW_AI_RECOMMENDATION = "REVIEW_AI_RECOMMENDATION"

    # Documents
    UPLOAD_DOCUMENT = "UPLOAD_DOCUMENT"
    VIEW_DOCUMENT = "VIEW_DOCUMENT"
    DOWNLOAD_DOCUMENT = "DOWNLOAD_DOCUMENT"

    # Comments
    ADD_COMMENT = "ADD_COMMENT"
    VIEW_INTERNAL_COMMENT = "VIEW_INTERNAL_COMMENT"

    # Notifications
    VIEW_NOTIFICATIONS = "VIEW_NOTIFICATIONS"

    # Dashboard
    VIEW_OWN_DASHBOARD = "VIEW_OWN_DASHBOARD"
    VIEW_OPERATIONAL_DASHBOARD = "VIEW_OPERATIONAL_DASHBOARD"
    VIEW_MANAGEMENT_DASHBOARD = "VIEW_MANAGEMENT_DASHBOARD"
    VIEW_ORGANIZATION_DASHBOARD = "VIEW_ORGANIZATION_DASHBOARD"

    # Audit
    VIEW_AUDIT = "VIEW_AUDIT"

from app.models.user import UserRole


ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.APPLICANT: {
        Permission.CREATE_GRIEVANCE,
        Permission.VIEW_GRIEVANCE,
        Permission.UPLOAD_DOCUMENT,
        Permission.VIEW_DOCUMENT,
        Permission.DOWNLOAD_DOCUMENT,
        Permission.ADD_COMMENT,
        Permission.VIEW_NOTIFICATIONS,
        Permission.VIEW_OWN_DASHBOARD,
    },

    UserRole.MANAGER: {
        Permission.VIEW_GRIEVANCE,
        Permission.UPDATE_GRIEVANCE,
        Permission.ASSIGN_GRIEVANCE,
        Permission.REASSIGN_GRIEVANCE,
        Permission.VIEW_ASSIGNMENTS,
        Permission.INITIATE_ESCALATION,
        Permission.VIEW_ESCALATION,
        Permission.VIEW_AI_RECOMMENDATION,
        Permission.REVIEW_AI_RECOMMENDATION,
        Permission.UPLOAD_DOCUMENT,
        Permission.VIEW_DOCUMENT,
        Permission.DOWNLOAD_DOCUMENT,
        Permission.ADD_COMMENT,
        Permission.VIEW_INTERNAL_COMMENT,
        Permission.VIEW_NOTIFICATIONS,
        Permission.VIEW_OPERATIONAL_DASHBOARD,
        Permission.VIEW_AUDIT,
    },

    UserRole.ASSISTANT_DEAN: {
        Permission.VIEW_GRIEVANCE,
        Permission.UPDATE_GRIEVANCE,
        Permission.ASSIGN_GRIEVANCE,
        Permission.REASSIGN_GRIEVANCE,
        Permission.VIEW_ASSIGNMENTS,
        Permission.INITIATE_ESCALATION,
        Permission.VIEW_ESCALATION,
        Permission.VIEW_AI_RECOMMENDATION,
        Permission.REVIEW_AI_RECOMMENDATION,
        Permission.UPLOAD_DOCUMENT,
        Permission.VIEW_DOCUMENT,
        Permission.DOWNLOAD_DOCUMENT,
        Permission.ADD_COMMENT,
        Permission.VIEW_INTERNAL_COMMENT,
        Permission.VIEW_NOTIFICATIONS,
        Permission.VIEW_OPERATIONAL_DASHBOARD,
        Permission.VIEW_AUDIT,
    },

    UserRole.ASSOCIATE_DEAN: {
        Permission.VIEW_GRIEVANCE,
        Permission.UPDATE_GRIEVANCE,
        Permission.RESOLVE_GRIEVANCE,
        Permission.ASSIGN_GRIEVANCE,
        Permission.REASSIGN_GRIEVANCE,
        Permission.VIEW_ASSIGNMENTS,
        Permission.INITIATE_ESCALATION,
        Permission.VIEW_ESCALATION,
        Permission.VIEW_AI_RECOMMENDATION,
        Permission.REVIEW_AI_RECOMMENDATION,
        Permission.UPLOAD_DOCUMENT,
        Permission.VIEW_DOCUMENT,
        Permission.DOWNLOAD_DOCUMENT,
        Permission.ADD_COMMENT,
        Permission.VIEW_INTERNAL_COMMENT,
        Permission.VIEW_NOTIFICATIONS,
        Permission.VIEW_MANAGEMENT_DASHBOARD,
        Permission.VIEW_AUDIT,
    },

    UserRole.DEAN: {
        Permission.VIEW_GRIEVANCE,
        Permission.UPDATE_GRIEVANCE,
        Permission.RESOLVE_GRIEVANCE,
        Permission.CLOSE_GRIEVANCE,
        Permission.REOPEN_GRIEVANCE,
        Permission.ASSIGN_GRIEVANCE,
        Permission.REASSIGN_GRIEVANCE,
        Permission.VIEW_ASSIGNMENTS,
        Permission.INITIATE_ESCALATION,
        Permission.VIEW_ESCALATION,
        Permission.VIEW_AI_RECOMMENDATION,
        Permission.REVIEW_AI_RECOMMENDATION,
        Permission.UPLOAD_DOCUMENT,
        Permission.VIEW_DOCUMENT,
        Permission.DOWNLOAD_DOCUMENT,
        Permission.ADD_COMMENT,
        Permission.VIEW_INTERNAL_COMMENT,
        Permission.VIEW_NOTIFICATIONS,
        Permission.VIEW_ORGANIZATION_DASHBOARD,
        Permission.VIEW_AUDIT,
    },
}