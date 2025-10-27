"""
Push Subscription Model

Stores Web Push subscription data for PWA notifications
"""

from datetime import datetime, UTC
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from core.database import Base


class PushSubscription(Base):
    """
    Push subscription for Web Push notifications

    Stores subscription data from browsers to enable push notifications
    """

    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Push subscription data
    endpoint = Column(Text, nullable=False)  # Push service endpoint URL
    p256dh_key = Column(String(255), nullable=False)  # Public key for encryption
    auth_key = Column(String(255), nullable=False)  # Authentication secret

    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    last_used = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="push_subscriptions")

    def __repr__(self):
        return f"<PushSubscription(id={self.id}, user_id={self.user_id}, endpoint={self.endpoint[:50]}...)>"
