"""
Notification model
Stores in-app and push notifications for users
"""
from app import db
from datetime import datetime
from app.utils.helpers import to_utc_isoformat


class Notification(db.Model):
    """In-app notification for a user"""

    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False, index=True)
    # Types: event_status, event_reminder, group_assignment, invitation_submitted,
    #        invitation_approved, invitation_rejected, invitation_cancelled, system
    link = db.Column(db.String(500), nullable=True)  # Optional deep-link URL path
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = db.relationship('User', backref=db.backref('notifications', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'link': self.link,
            'is_read': self.is_read,
            'created_at': to_utc_isoformat(self.created_at),
        }


class PushSubscription(db.Model):
    """Web Push subscription for a user's browser/device"""

    __tablename__ = 'push_subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    endpoint = db.Column(db.Text, nullable=False, unique=True)
    p256dh_key = db.Column(db.Text, nullable=False)
    auth_key = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', backref=db.backref('push_subscriptions', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'endpoint': self.endpoint,
            'created_at': to_utc_isoformat(self.created_at),
        }
