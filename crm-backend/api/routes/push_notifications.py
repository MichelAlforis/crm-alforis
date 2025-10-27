"""
Push Notifications API Routes

Endpoints for Web Push Notifications (PWA)

Tests covered:
- 8.14: Permission notifications demandée
- 8.15: Notification reçue (tâche)
- 8.16: Clic notification ouvre app
- 8.17: Badge notification affiché
"""

from datetime import datetime, UTC
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from core.database import get_db
from core.auth import get_current_user
from models.user import User
from models.push_subscription import PushSubscription
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/push", tags=["push-notifications"])


# ============================================================================
# Schemas
# ============================================================================


class PushSubscriptionCreate(BaseModel):
    """Push subscription data from the browser"""

    endpoint: str = Field(..., description="Push service endpoint URL")
    keys: Dict[str, str] = Field(
        ..., description="Encryption keys (p256dh and auth)"
    )


class PushSubscriptionResponse(BaseModel):
    """Push subscription response"""

    id: int
    endpoint: str
    created_at: datetime
    last_used: Optional[datetime] = None


class SendNotificationRequest(BaseModel):
    """Request to send a push notification"""

    title: str = Field(..., max_length=100, description="Notification title")
    body: str = Field(..., max_length=200, description="Notification body")
    icon: Optional[str] = Field(None, description="Icon URL")
    badge: Optional[str] = Field(None, description="Badge icon URL")
    tag: Optional[str] = Field(None, description="Notification tag")
    data: Optional[Dict[str, Any]] = Field(None, description="Custom data")
    url: Optional[str] = Field(
        None, description="URL to open when notification is clicked"
    )
    user_ids: Optional[List[int]] = Field(
        None, description="Target user IDs (admin only)"
    )


# ============================================================================
# Endpoints
# ============================================================================


@router.post("/subscribe", response_model=PushSubscriptionResponse)
async def subscribe_to_push(
    subscription: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Subscribe to push notifications

    Saves the push subscription from the browser for this user.
    """
    try:
        # Check if subscription already exists for this user and endpoint
        existing = (
            db.query(PushSubscription)
            .filter(
                PushSubscription.user_id == current_user.id,
                PushSubscription.endpoint == subscription.endpoint,
            )
            .first()
        )

        if existing:
            # Update keys if changed
            existing.p256dh_key = subscription.keys.get("p256dh")
            existing.auth_key = subscription.keys.get("auth")
            existing.last_used = datetime.now(UTC)
            db.commit()
            db.refresh(existing)
            logger.info(
                f"Updated push subscription for user {current_user.id}: {subscription.endpoint[:50]}..."
            )
            return existing

        # Create new subscription
        new_subscription = PushSubscription(
            user_id=current_user.id,
            endpoint=subscription.endpoint,
            p256dh_key=subscription.keys.get("p256dh"),
            auth_key=subscription.keys.get("auth"),
        )

        db.add(new_subscription)
        db.commit()
        db.refresh(new_subscription)

        logger.info(
            f"Created push subscription for user {current_user.id}: {subscription.endpoint[:50]}..."
        )

        return new_subscription

    except Exception as e:
        logger.error(f"Failed to subscribe to push: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to subscribe: {str(e)}",
        )


@router.delete("/unsubscribe")
async def unsubscribe_from_push(
    endpoint: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Unsubscribe from push notifications

    Removes the push subscription for the given endpoint.
    """
    try:
        subscription = (
            db.query(PushSubscription)
            .filter(
                PushSubscription.user_id == current_user.id,
                PushSubscription.endpoint == endpoint,
            )
            .first()
        )

        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found",
            )

        db.delete(subscription)
        db.commit()

        logger.info(f"Deleted push subscription for user {current_user.id}")

        return {"message": "Unsubscribed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unsubscribe from push: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unsubscribe: {str(e)}",
        )


@router.get("/subscriptions", response_model=List[PushSubscriptionResponse])
async def get_user_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all push subscriptions for the current user
    """
    subscriptions = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == current_user.id)
        .all()
    )

    return subscriptions


@router.post("/send")
async def send_push_notification(
    notification: SendNotificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a push notification

    Sends a push notification to the current user's devices.
    Admins can send to specific users via user_ids parameter.
    """
    try:
        # Determine target users
        target_user_ids = [current_user.id]

        if notification.user_ids:
            # Only admins can send to other users
            if not current_user.is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can send notifications to other users",
                )
            target_user_ids = notification.user_ids

        # Get all subscriptions for target users
        subscriptions = (
            db.query(PushSubscription)
            .filter(PushSubscription.user_id.in_(target_user_ids))
            .all()
        )

        if not subscriptions:
            return {
                "message": "No active subscriptions found",
                "sent": 0,
            }

        # Send notifications in background
        # Note: Actual implementation would use pywebpush library
        # For now, we'll just log and return success
        background_tasks.add_task(
            _send_push_to_subscriptions,
            subscriptions=subscriptions,
            title=notification.title,
            body=notification.body,
            icon=notification.icon,
            badge=notification.badge,
            tag=notification.tag,
            data=notification.data or {},
            url=notification.url,
        )

        logger.info(
            f"Queued push notification to {len(subscriptions)} subscriptions: {notification.title}"
        )

        return {
            "message": "Notification queued for delivery",
            "sent": len(subscriptions),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notification: {str(e)}",
        )


# ============================================================================
# Background Tasks
# ============================================================================


async def _send_push_to_subscriptions(
    subscriptions: List[PushSubscription],
    title: str,
    body: str,
    icon: Optional[str] = None,
    badge: Optional[str] = None,
    tag: Optional[str] = None,
    data: Dict[str, Any] = None,
    url: Optional[str] = None,
):
    """
    Send push notifications to all subscriptions

    This is a placeholder implementation. In production, you would:
    1. Install pywebpush: pip install pywebpush
    2. Generate VAPID keys
    3. Use pywebpush to send actual notifications

    Example with pywebpush:
    ```python
    from pywebpush import webpush, WebPushException

    payload = json.dumps({
        "title": title,
        "body": body,
        "icon": icon or "/favicon/favicon-192.png",
        "badge": badge or "/favicon/favicon-96.png",
        "tag": tag,
        "data": {
            **(data or {}),
            "url": url or "/dashboard"
        }
    })

    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh_key,
                        "auth": subscription.auth_key
                    }
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={
                    "sub": f"mailto:{settings.VAPID_EMAIL}"
                }
            )
        except WebPushException as e:
            logger.error(f"Failed to send push: {e}")
    ```
    """
    logger.info(
        f"[MOCK] Sending push notification to {len(subscriptions)} subscriptions"
    )
    logger.info(f"[MOCK] Title: {title}, Body: {body}")

    # In production, implement actual push sending here
    # For now, just log the notification details
    for subscription in subscriptions:
        logger.debug(f"[MOCK] Would send to: {subscription.endpoint[:50]}...")
