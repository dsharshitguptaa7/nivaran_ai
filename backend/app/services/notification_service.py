from uuid import UUID

from sqlalchemy.orm import Session

from app.models.notification import (
    Notification,
    NotificationType,
)


def create_notification(
    db: Session,
    user_id: UUID,
    notification_type: NotificationType,
    title: str,
    message: str,
    grievance_id: UUID | None = None,
) -> Notification:
    """
    Create and persist an in-app notification for a user.
    """

    notification = Notification(
        user_id=user_id,
        grievance_id=grievance_id,
        notification_type=notification_type,
        title=title,
        message=message,
        is_read=False,
    )

    db.add(notification)
    db.flush()

    return notification