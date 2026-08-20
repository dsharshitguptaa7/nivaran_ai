from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.notification import (
    Notification,
    NotificationType,
)
from app.schemas.notification import NotificationResponse


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


def get_user_notifications(
    db: Session,
    user_id: UUID,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> List[NotificationResponse]:
    """
    Retrieve formatted in-app notifications for a specific user.
    """
    query = (
        select(Notification)
        .options(joinedload(Notification.grievance))
        .where(Notification.user_id == user_id)
    )

    if unread_only:
        query = query.where(Notification.is_read.is_(False))

    query = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)

    notifications = db.scalars(query).all()

    results = []
    for n in notifications:
        tracking_id = None
        title = None
        if n.grievance:
            tracking_id = n.grievance.grievance_id
            title = n.grievance.title

        results.append(
            NotificationResponse(
                id=n.id,
                user_id=n.user_id,
                grievance_id=n.grievance_id,
                grievance_tracking_id=tracking_id,
                grievance_title=title,
                notification_type=n.notification_type,
                title=n.title,
                message=n.message,
                is_read=n.is_read,
                created_at=n.created_at,
                read_at=n.read_at,
            )
        )

    return results


def get_unread_notification_count(
    db: Session,
    user_id: UUID,
) -> int:
    """
    Return the total count of unread notifications for a user.
    """
    count = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    )
    return count or 0


def mark_notification_as_read(
    db: Session,
    notification_id: UUID,
    user_id: UUID,
) -> Optional[NotificationResponse]:
    """
    Mark a specific notification as read if it belongs to the user.
    """
    notification = db.scalar(
        select(Notification)
        .options(joinedload(Notification.grievance))
        .where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )

    if not notification:
        return None

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.add(notification)
        db.commit()
        db.refresh(notification)

    tracking_id = notification.grievance.grievance_id if notification.grievance else None
    title = notification.grievance.title if notification.grievance else None

    return NotificationResponse(
        id=notification.id,
        user_id=notification.user_id,
        grievance_id=notification.grievance_id,
        grievance_tracking_id=tracking_id,
        grievance_title=title,
        notification_type=notification.notification_type,
        title=notification.title,
        message=notification.message,
        is_read=notification.is_read,
        created_at=notification.created_at,
        read_at=notification.read_at,
    )


def mark_all_notifications_as_read(
    db: Session,
    user_id: UUID,
) -> int:
    """
    Mark all unread notifications as read for a specific user.
    """
    notifications = db.scalars(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    ).all()

    count = len(notifications)
    if count > 0:
        now = datetime.now(timezone.utc)
        for n in notifications:
            n.is_read = True
            n.read_at = now
            db.add(n)
        db.commit()

    return count


def delete_notification(
    db: Session,
    notification_id: UUID,
    user_id: UUID,
) -> bool:
    """
    Delete a specific notification if owned by the user.
    """
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )

    if not notification:
        return False

    db.delete(notification)
    db.commit()
    return True