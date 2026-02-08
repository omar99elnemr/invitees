"""
Event model
Represents events that can have invitees
"""
from app import db
from datetime import datetime, timezone, timedelta
from app.utils.helpers import to_utc_isoformat

# Egypt timezone is UTC+2
EGYPT_TZ_OFFSET = timedelta(hours=2)

def get_egypt_time():
    """Get current time in Egypt timezone (UTC+2)"""
    utc_now = datetime.now(timezone.utc)
    egypt_now = utc_now + EGYPT_TZ_OFFSET
    # Return naive datetime for comparison with database timestamps
    return egypt_now.replace(tzinfo=None)


# Association table for Event-InviterGroup many-to-many relationship
event_inviter_groups = db.Table('event_inviter_groups',
    db.Column('event_id', db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), primary_key=True),
    db.Column('inviter_group_id', db.Integer, db.ForeignKey('inviter_groups.id', ondelete='CASCADE'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow, nullable=False)
)


class Event(db.Model):
    """Event model for managing events"""
    
    __tablename__ = 'events'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=True, index=True)  # Unique event code for URLs
    start_date = db.Column(db.DateTime, nullable=False, index=True)
    end_date = db.Column(db.DateTime, nullable=False, index=True)
    venue = db.Column(db.String(200), nullable=True)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='upcoming', index=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Check-in attendant fields
    checkin_pin = db.Column(db.String(6), nullable=True)  # 6-digit PIN for attendant
    checkin_pin_active = db.Column(db.Boolean, default=False, nullable=False)
    checkin_pin_auto_deactivate_hours = db.Column(db.Integer, nullable=True)  # Hours after event end to auto-deactivate (null = manual)
    
    # All groups flag - when True, event is assigned to ALL inviter groups
    is_all_groups = db.Column(db.Boolean, default=False, nullable=False)
    
    # Relationships
    event_invitees = db.relationship('EventInvitee', backref='event', lazy='dynamic', cascade='all, delete-orphan')
    inviter_groups = db.relationship('InviterGroup', secondary=event_inviter_groups, 
                                      backref=db.backref('events', lazy='dynamic'),
                                      lazy='joined')
    
    # Constraints
    __table_args__ = (
        db.CheckConstraint("status IN ('upcoming', 'ongoing', 'ended', 'cancelled', 'on_hold')", name='check_event_status'),
        db.CheckConstraint('start_date < end_date', name='check_event_dates'),
    )
    
    def __repr__(self):
        return f'<Event {self.name} ({self.status})>'
    
    def get_computed_status(self):
        """
        Compute what the status should be based on current Egypt time.
        Uses Egypt timezone (UTC+2) for all comparisons.
        """
        now = get_egypt_time()
        
        # Don't auto-compute if manually set to cancelled or on_hold
        if self.status in ('cancelled', 'on_hold'):
            return self.status
        
        # Compare with event dates (stored as Egypt local time)
        if now < self.start_date:
            return 'upcoming'
        elif now >= self.start_date and now < self.end_date:
            return 'ongoing'
        else:  # now >= self.end_date
            return 'ended'
    
    def get_display_status(self):
        """Get status for display: returns stored status (which may be manually set)"""
        # Return the actual stored status - don't auto-compute here
        # The stored status should be kept in sync via update_all_statuses() background task
        # or via explicit calls to update_status()
        return self.status
    
    def to_dict(self):
        """Convert event to dictionary"""
        # Use the actual stored status from database
        # The status is updated by update_all_statuses() which runs on event queries
        # Manual status changes (cancelled, on_hold) are preserved
        
        # Handle inviter groups - if is_all_groups is True, fetch all groups
        if self.is_all_groups:
            from app.models.inviter_group import InviterGroup
            all_groups = InviterGroup.query.all()
            inviter_group_ids = [g.id for g in all_groups]
            inviter_group_names = [g.name for g in all_groups]
        else:
            inviter_group_ids = [g.id for g in self.inviter_groups] if self.inviter_groups else []
            inviter_group_names = [g.name for g in self.inviter_groups] if self.inviter_groups else []
        
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'start_date': to_utc_isoformat(self.start_date),
            'end_date': to_utc_isoformat(self.end_date),
            'venue': self.venue,
            'description': self.description,
            'status': self.status,  # Use actual stored status
            'created_by_user_id': self.created_by_user_id,
            'creator_name': self.creator.username if self.creator else None,
            'created_at': to_utc_isoformat(self.created_at),
            'updated_at': to_utc_isoformat(self.updated_at),
            'invitee_count': self.event_invitees.count() if hasattr(self, 'event_invitees') else 0,
            'is_all_groups': self.is_all_groups,
            'inviter_group_ids': inviter_group_ids,
            'inviter_group_names': inviter_group_names,
            'checkin_pin_active': self.checkin_pin_active,
            'checkin_pin_auto_deactivate_hours': self.checkin_pin_auto_deactivate_hours,
            'has_checkin_pin': self.checkin_pin is not None,
        }
    
    def update_status(self):
        """Update event status in database based on current date"""
        computed = self.get_computed_status()
        if self.status != computed:
            self.status = computed
            return True
        return False
    
    def can_add_invitees(self):
        """Check if invitees can be added to this event"""
        return self.status in ('upcoming', 'ongoing')
    
    @staticmethod
    def get_active_events():
        """Get all upcoming and ongoing events"""
        # First update all event statuses
        Event.update_all_statuses()
        return Event.query.filter(Event.status.in_(['upcoming', 'ongoing'])).order_by(Event.start_date).all()
    
    @staticmethod
    def get_all_for_user(user):
        """Get events visible to user based on role and inviter group"""
        from sqlalchemy import or_
        # First update all event statuses
        Event.update_all_statuses()
        if user.role == 'admin':
            # Admins see all events
            return Event.query.order_by(Event.start_date.desc()).all()
        else:
            # Organizers and directors only see active events assigned to their inviter group
            # OR events where is_all_groups is True
            if user.inviter_group_id:
                return Event.query.filter(
                    Event.status.in_(['upcoming', 'ongoing']),
                    or_(
                        Event.is_all_groups == True,
                        Event.inviter_groups.any(id=user.inviter_group_id)
                    )
                ).order_by(Event.start_date).all()
            else:
                # User has no group - return empty
                return []
    
    def generate_checkin_pin(self):
        """Generate a random 6-digit PIN for check-in attendant"""
        import random
        self.checkin_pin = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        self.checkin_pin_active = True
        return self.checkin_pin
    
    def verify_checkin_pin(self, pin):
        """Verify the check-in PIN and check if it's active"""
        if not self.checkin_pin or not self.checkin_pin_active:
            return False
        
        # Check auto-deactivation
        if self.checkin_pin_auto_deactivate_hours and self.status == 'ended':
            hours_since_end = (get_egypt_time() - self.end_date).total_seconds() / 3600
            if hours_since_end > self.checkin_pin_auto_deactivate_hours:
                self.checkin_pin_active = False
                db.session.commit()
                return False
        
        return self.checkin_pin == pin
    
    def deactivate_checkin_pin(self):
        """Manually deactivate the check-in PIN"""
        self.checkin_pin_active = False
    
    def is_checkin_allowed(self):
        """Check if check-in is allowed for this event"""
        return self.status in ('upcoming', 'ongoing') or (
            self.status == 'ended' and 
            self.checkin_pin_auto_deactivate_hours and
            (get_egypt_time() - self.end_date).total_seconds() / 3600 <= self.checkin_pin_auto_deactivate_hours
        )
    
    @staticmethod
    def get_by_code(code):
        """Get event by its unique code"""
        return Event.query.filter_by(code=code).first()
    
    @staticmethod
    def generate_unique_code(name):
        """Generate a unique event code from name"""
        import re
        import random
        # Create base code from name (first 3-4 letters + random suffix)
        base = re.sub(r'[^A-Za-z0-9]', '', name)[:4].upper()
        if len(base) < 2:
            base = 'EVT'
        
        # Add random suffix until unique
        for _ in range(100):
            suffix = ''.join([str(random.randint(0, 9)) for _ in range(4)])
            code = f"{base}{suffix}"
            if not Event.query.filter_by(code=code).first():
                return code
        
        # Fallback with timestamp
        import time
        return f"{base}{int(time.time())}"[-12:]
    
    @staticmethod
    def update_all_statuses():
        """
        Update status for all events that need updating based on current Egypt time.
        This is called on every events fetch to ensure statuses are always current.
        Returns: tuple (ongoing_count, ended_count) - number of events updated
        """
        from app import db
        import logging
        
        now = get_egypt_time()
        logging.info(f"Updating event statuses at Egypt time: {now}")
        
        # Update events that should be 'ongoing' (started but not ended)
        # Only update if current status is 'upcoming'
        ongoing_count = Event.query.filter(
            Event.status == 'upcoming',
            Event.start_date <= now,
            Event.end_date > now
        ).update({'status': 'ongoing', 'updated_at': now}, synchronize_session=False)
        
        # Update events that should be 'ended' (past end date)
        # Only update if current status is 'upcoming' or 'ongoing'
        ended_count = Event.query.filter(
            Event.status.in_(['upcoming', 'ongoing']),
            Event.end_date <= now
        ).update({'status': 'ended', 'updated_at': now}, synchronize_session=False)
        
        if ongoing_count > 0 or ended_count > 0:
            logging.info(f"Updated {ongoing_count} events to 'ongoing', {ended_count} events to 'ended'")
        
        db.session.commit()
        return (ongoing_count, ended_count)
