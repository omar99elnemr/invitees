"""
UserEventAssignment model
Links check-in attendants to specific events they can manage check-ins for
"""
from app import db
from datetime import datetime
from app.utils.helpers import to_utc_isoformat


class UserEventAssignment(db.Model):
    """Links users (primarily check-in attendants) to events they can access"""
    
    __tablename__ = 'user_event_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), nullable=False, index=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('event_assignments', lazy='dynamic'))
    event = db.relationship('Event', backref=db.backref('user_assignments', lazy='dynamic'))
    created_by = db.relationship('User', foreign_keys=[created_by_user_id])
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('user_id', 'event_id', name='uq_user_event_assignment'),
    )
    
    def __repr__(self):
        return f'<UserEventAssignment User:{self.user_id} Event:{self.event_id}>'
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'event_id': self.event_id,
            'is_active': self.is_active,
            'created_at': to_utc_isoformat(self.created_at),
            'user_name': self.user.full_name or self.user.username if self.user else None,
            'event_name': self.event.name if self.event else None,
        }
    
    @staticmethod
    def get_user_events(user_id):
        """Get all active event IDs for a user"""
        assignments = UserEventAssignment.query.filter_by(
            user_id=user_id,
            is_active=True
        ).all()
        return [a.event_id for a in assignments]
    
    @staticmethod
    def can_user_access_event(user_id, event_id):
        """Check if a user has access to a specific event"""
        return UserEventAssignment.query.filter_by(
            user_id=user_id,
            event_id=event_id,
            is_active=True
        ).first() is not None
    
    @staticmethod
    def assign_user_to_event(user_id, event_id, created_by_user_id=None):
        """Assign a user to an event"""
        existing = UserEventAssignment.query.filter_by(
            user_id=user_id,
            event_id=event_id
        ).first()
        
        if existing:
            existing.is_active = True
            db.session.commit()
            return existing
        
        assignment = UserEventAssignment(
            user_id=user_id,
            event_id=event_id,
            created_by_user_id=created_by_user_id
        )
        db.session.add(assignment)
        db.session.commit()
        return assignment
    
    @staticmethod
    def remove_user_from_event(user_id, event_id):
        """Remove a user's access to an event"""
        assignment = UserEventAssignment.query.filter_by(
            user_id=user_id,
            event_id=event_id
        ).first()
        
        if assignment:
            assignment.is_active = False
            db.session.commit()
            return True
        return False
