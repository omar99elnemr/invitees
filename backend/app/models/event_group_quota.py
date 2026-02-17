"""
EventGroupQuota model
Stores per-event, per-inviter-group invitation quotas.
A NULL quota means unlimited (no cap).
"""
from app import db
from datetime import datetime
from app.utils.helpers import to_utc_isoformat


class EventGroupQuota(db.Model):
    """Quota limiting how many invitees a group can submit for a given event"""

    __tablename__ = 'event_group_quotas'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), nullable=False, index=True)
    inviter_group_id = db.Column(db.Integer, db.ForeignKey('inviter_groups.id', ondelete='CASCADE'), nullable=False, index=True)
    quota = db.Column(db.Integer, nullable=True)  # NULL = unlimited
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    event = db.relationship('Event', backref=db.backref('group_quotas', lazy='dynamic', cascade='all, delete-orphan'))
    inviter_group = db.relationship('InviterGroup', backref=db.backref('event_quotas', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('event_id', 'inviter_group_id', name='uq_event_group_quota'),
    )

    def __repr__(self):
        return f'<EventGroupQuota Event:{self.event_id} Group:{self.inviter_group_id} Quota:{self.quota}>'

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'inviter_group_id': self.inviter_group_id,
            'quota': self.quota,
            'created_at': to_utc_isoformat(self.created_at),
            'updated_at': to_utc_isoformat(self.updated_at),
        }

    # ── Helper class methods ─────────────────────────────────────

    @staticmethod
    def get_quota(event_id, inviter_group_id):
        """Return the quota record for an event+group, or None (unlimited)."""
        return EventGroupQuota.query.filter_by(
            event_id=event_id,
            inviter_group_id=inviter_group_id
        ).first()

    @staticmethod
    def get_usage(event_id, inviter_group_id):
        """
        Count how many non-rejected EventInvitee records exist
        for this event + group.  (waiting_for_approval + approved = used)
        """
        from app.models.event_invitee import EventInvitee
        from app.models.invitee import Invitee

        return db.session.query(db.func.count(EventInvitee.id)).join(
            Invitee, EventInvitee.invitee_id == Invitee.id
        ).filter(
            EventInvitee.event_id == event_id,
            Invitee.inviter_group_id == inviter_group_id,
            EventInvitee.status.in_(['waiting_for_approval', 'approved'])
        ).scalar() or 0

    @staticmethod
    def check_quota(event_id, inviter_group_id, additional=1):
        """
        Return (allowed, remaining, quota_value).
        - allowed: True if adding `additional` invitees is within quota
        - remaining: how many more can be added (None = unlimited)
        - quota_value: the configured quota (None = unlimited)
        """
        record = EventGroupQuota.get_quota(event_id, inviter_group_id)
        if not record or record.quota is None:
            return True, None, None  # unlimited

        used = EventGroupQuota.get_usage(event_id, inviter_group_id)
        remaining = max(record.quota - used, 0)
        allowed = additional <= remaining
        return allowed, remaining, record.quota

    @staticmethod
    def set_quota(event_id, inviter_group_id, quota_value):
        """Create or update a quota record. quota_value=None means unlimited."""
        record = EventGroupQuota.get_quota(event_id, inviter_group_id)
        if record:
            record.quota = quota_value
            record.updated_at = datetime.utcnow()
        else:
            record = EventGroupQuota(
                event_id=event_id,
                inviter_group_id=inviter_group_id,
                quota=quota_value
            )
            db.session.add(record)
        return record
