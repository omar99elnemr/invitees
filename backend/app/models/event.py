"""
Event model
Represents events that can have invitees
"""
from app import db
from datetime import datetime

class Event(db.Model):
    """Event model for managing events"""
    
    __tablename__ = 'events'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False, index=True)
    end_date = db.Column(db.DateTime, nullable=False, index=True)
    venue = db.Column(db.String(200), nullable=True)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='upcoming', index=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    event_invitees = db.relationship('EventInvitee', backref='event', lazy='dynamic', cascade='all, delete-orphan')
    
    # Constraints
    __table_args__ = (
        db.CheckConstraint("status IN ('upcoming', 'ongoing', 'ended', 'cancelled', 'on_hold')", name='check_event_status'),
        db.CheckConstraint('start_date < end_date', name='check_event_dates'),
    )
    
    def __repr__(self):
        return f'<Event {self.name} ({self.status})>'
    
    def to_dict(self):
        """Convert event to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'venue': self.venue,
            'description': self.description,
            'status': self.status,
            'created_by_user_id': self.created_by_user_id,
            'creator_name': self.creator.username if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'invitee_count': self.event_invitees.count() if hasattr(self, 'event_invitees') else 0
        }
    
    def update_status(self):
        """Automatically update event status based on current date"""
        now = datetime.utcnow()
        
        # Don't auto-update if manually set to cancelled or on_hold
        if self.status in ('cancelled', 'on_hold'):
            return
        
        if now < self.start_date:
            self.status = 'upcoming'
        elif self.start_date <= now <= self.end_date:
            self.status = 'ongoing'
        elif now > self.end_date:
            self.status = 'ended'
    
    def can_add_invitees(self):
        """Check if invitees can be added to this event"""
        return self.status in ('upcoming', 'ongoing')
    
    @staticmethod
    def get_active_events():
        """Get all upcoming and ongoing events"""
        return Event.query.filter(Event.status.in_(['upcoming', 'ongoing'])).order_by(Event.start_date).all()
    
    @staticmethod
    def get_all_for_user(user):
        """Get events visible to user based on role"""
        if user.role == 'admin':
            return Event.query.order_by(Event.start_date.desc()).all()
        else:
            # Organizers and directors only see active events
            return Event.get_active_events()
