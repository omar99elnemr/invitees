"""
EventInvitee model (Junction Table)
Represents the relationship between events and invitees with additional metadata
This is the core model that tracks invitations, approvals, and attendance
"""
from app import db
from datetime import datetime


def to_utc_isoformat(dt):
    """Convert datetime to ISO format with UTC indicator"""
    return dt.isoformat() + 'Z' if dt else None


# Category choices for event invitees
# Category choices for event invitees - LEGACY
EVENT_INVITEE_CATEGORIES = ['White', 'Gold']


class EventInvitee(db.Model):
    """Junction model linking events and invitees with invitation details"""
    
    __tablename__ = 'event_invitees'
    
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), nullable=False, index=True)
    invitee_id = db.Column(db.Integer, db.ForeignKey('invitees.id', ondelete='CASCADE'), nullable=False, index=True)
    # category = db.Column(db.String(20), nullable=True)  # Legacy
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True, index=True)
    inviter_id = db.Column(db.Integer, db.ForeignKey('inviters.id'), nullable=True, index=True)  # The actual inviter from the group
    inviter_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)  # User who submitted
    inviter_role = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(30), nullable=False, default='waiting_for_approval', index=True)
    status_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    approved_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    approver_role = db.Column(db.String(20), nullable=True)
    approval_notes = db.Column(db.Text, nullable=True)
    is_going = db.Column(db.String(10), nullable=True)  # yes, no, maybe
    plus_one = db.Column(db.Integer, default=0, nullable=False)  # Number of guests allowed
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Attendance tracking fields
    attendance_code = db.Column(db.String(12), unique=True, nullable=True, index=True)
    code_generated_at = db.Column(db.DateTime, nullable=True)
    
    # Invitation dispatch tracking
    invitation_sent = db.Column(db.Boolean, default=False, nullable=False)
    invitation_sent_at = db.Column(db.DateTime, nullable=True)
    invitation_method = db.Column(db.String(20), nullable=True)  # email, whatsapp, physical, sms
    
    # Portal confirmation tracking
    portal_accessed_at = db.Column(db.DateTime, nullable=True)
    attendance_confirmed = db.Column(db.Boolean, nullable=True)  # True=coming, False=not coming, None=not responded
    confirmed_at = db.Column(db.DateTime, nullable=True)
    confirmed_guests = db.Column(db.Integer, nullable=True)  # How many guests they're bringing
    
    # Check-in tracking (at event)
    checked_in = db.Column(db.Boolean, default=False, nullable=False)
    checked_in_at = db.Column(db.DateTime, nullable=True)
    checked_in_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    actual_guests = db.Column(db.Integer, default=0, nullable=False)
    check_in_notes = db.Column(db.Text, nullable=True)
    
    # Relationships
    inviter = db.relationship('Inviter', backref=db.backref('event_invitations', lazy='dynamic'), foreign_keys=[inviter_id])
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('event_id', 'invitee_id', name='uq_event_invitee'),
        db.CheckConstraint("inviter_role IN ('admin', 'director', 'organizer')", name='check_inviter_role'),
        db.CheckConstraint("status IN ('waiting_for_approval', 'approved', 'rejected')", name='check_status'),
        db.CheckConstraint("approver_role IN ('admin', 'director') OR approver_role IS NULL", name='check_approver_role'),
        db.CheckConstraint("is_going IN ('yes', 'no', 'maybe') OR is_going IS NULL", name='check_is_going'),
        db.CheckConstraint("invitation_method IN ('email', 'whatsapp', 'physical', 'sms') OR invitation_method IS NULL", name='check_invitation_method'),
    )
    
    # Relationship to Category
    category_rel = db.relationship('Category')
    
    def __repr__(self):
        return f'<EventInvitee Event:{self.event_id} Invitee:{self.invitee_id} Status:{self.status}>'
    
    def to_dict(self, include_relations=True, include_contact_details=True):
        """Convert event invitee to dictionary"""
        from app.models.user import User
        
        # Get the submitter user
        submitter = User.query.get(self.inviter_user_id) if self.inviter_user_id else None
        
        data = {
            'id': self.id,
            'event_id': self.event_id,
            'invitee_id': self.invitee_id,
            'category': self.category_rel.name if self.category_rel else None,
            'category_id': self.category_id,
            'inviter_id': self.inviter_id,
            'inviter_user_id': self.inviter_user_id,
            'inviter_role': self.inviter_role,
            'status': self.status,
            'status_date': to_utc_isoformat(self.status_date),
            'approved_by_user_id': self.approved_by_user_id,
            'approver_role': self.approver_role,
            'approval_notes': self.approval_notes,
            'is_going': self.is_going,
            'plus_one': self.plus_one,
            'notes': self.notes,
            'created_at': to_utc_isoformat(self.created_at),
            'updated_at': to_utc_isoformat(self.updated_at),
            # Attendance tracking fields
            'attendance_code': self.attendance_code,
            'code_generated_at': to_utc_isoformat(self.code_generated_at),
            'invitation_sent': self.invitation_sent,
            'invitation_sent_at': to_utc_isoformat(self.invitation_sent_at),
            'invitation_method': self.invitation_method,
            'portal_accessed_at': to_utc_isoformat(self.portal_accessed_at),
            'attendance_confirmed': self.attendance_confirmed,
            'confirmed_at': to_utc_isoformat(self.confirmed_at),
            'confirmed_guests': self.confirmed_guests,
            'checked_in': self.checked_in,
            'checked_in_at': to_utc_isoformat(self.checked_in_at),
            'checked_in_by_user_id': self.checked_in_by_user_id,
            'actual_guests': self.actual_guests,
            'check_in_notes': self.check_in_notes,
        }
        
        if include_relations:
            # Add related entity names
            data['event_name'] = self.event.name if self.event else None
            data['event_date'] = to_utc_isoformat(self.event.start_date) if self.event else None
            data['event_location'] = self.event.venue if self.event else None
            data['invitee_name'] = self.invitee.name if self.invitee else None
            if include_contact_details:
                data['invitee_email'] = self.invitee.email if self.invitee else None
                data['invitee_phone'] = self.invitee.phone if self.invitee else None
            data['invitee_position'] = self.invitee.position if self.invitee else None
            data['invitee_company'] = self.invitee.company if self.invitee else None
            # Inviter is the actual inviter from the group
            data['inviter_name'] = self.inviter.name if self.inviter else None
            data['inviter_group_name'] = self.inviter.inviter_group.name if self.inviter and self.inviter.inviter_group else (submitter.inviter_group.name if submitter and submitter.inviter_group else None)
            # Submitter is the user who submitted the invitation
            data['submitter_name'] = submitter.username if submitter else None
            data['approved_by_name'] = None
            if self.approved_by_user_id:
                approver = User.query.get(self.approved_by_user_id)
                data['approved_by_name'] = approver.username if approver else None
            # Add checked_in_by name
            if self.checked_in_by_user_id:
                checked_in_by = User.query.get(self.checked_in_by_user_id)
                data['checked_in_by_name'] = checked_in_by.username if checked_in_by else None
            else:
                data['checked_in_by_name'] = None
            # Add invitee title for welcome page
            data['invitee_title'] = self.invitee.title if self.invitee else None
        
        return data
    
    def approve(self, approver_user_id, approver_role, notes=None):
        """Approve this invitation"""
        self.status = 'approved'
        self.approved_by_user_id = approver_user_id
        self.approver_role = approver_role
        self.status_date = datetime.utcnow()
        if notes:
            self.approval_notes = notes
    
    def reject(self, approver_user_id, approver_role, notes=None):
        """Reject this invitation"""
        self.status = 'rejected'
        self.approved_by_user_id = approver_user_id
        self.approver_role = approver_role
        self.status_date = datetime.utcnow()
        if notes:
            self.approval_notes = notes
    
    def generate_attendance_code(self, event_prefix=None):
        """Generate a unique attendance code for this invitation"""
        import secrets
        import string
        
        if self.attendance_code:
            return self.attendance_code  # Already has a code
        
        # Generate format: PREFIX-XXXX (e.g., EVT1-7X9K)
        prefix = event_prefix or f'EVT{self.event_id}'
        # Generate 4-character alphanumeric code (uppercase)
        chars = string.ascii_uppercase + string.digits
        # Remove confusing characters
        chars = chars.replace('O', '').replace('0', '').replace('I', '').replace('1', '').replace('L', '')
        
        max_attempts = 100
        for _ in range(max_attempts):
            code_suffix = ''.join(secrets.choice(chars) for _ in range(4))
            code = f"{prefix}-{code_suffix}"
            # Check if code is unique
            existing = EventInvitee.query.filter_by(attendance_code=code).first()
            if not existing:
                self.attendance_code = code
                self.code_generated_at = datetime.utcnow()
                return code
        
        raise ValueError("Could not generate unique attendance code after maximum attempts")
    
    def mark_invitation_sent(self, method='physical'):
        """Mark the invitation as sent"""
        self.invitation_sent = True
        self.invitation_sent_at = datetime.utcnow()
        self.invitation_method = method
    
    def record_portal_access(self):
        """Record when attendee accesses the portal"""
        if not self.portal_accessed_at:
            self.portal_accessed_at = datetime.utcnow()
    
    def confirm_attendance(self, is_coming, guest_count=None):
        """Record attendee's confirmation from portal"""
        self.attendance_confirmed = is_coming
        self.confirmed_at = datetime.utcnow()
        if guest_count is not None:
            self.confirmed_guests = min(guest_count, self.plus_one)  # Can't exceed allowed guests
    
    def check_in(self, checked_in_by_user_id, actual_guests=0, notes=None):
        """Check in the attendee at the event"""
        self.checked_in = True
        self.checked_in_at = datetime.utcnow()
        self.checked_in_by_user_id = checked_in_by_user_id
        self.actual_guests = actual_guests
        if notes:
            self.check_in_notes = notes
    
    def undo_check_in(self):
        """Undo a check-in (in case of mistake)"""
        self.checked_in = False
        self.checked_in_at = None
        self.checked_in_by_user_id = None
        self.actual_guests = 0
        self.check_in_notes = None
    
    @staticmethod
    def get_by_attendance_code(code):
        """Find an event invitee by their attendance code"""
        if not code:
            return None
        return EventInvitee.query.filter_by(attendance_code=code.upper().strip()).first()
    
    @staticmethod
    def get_pending_approvals(filters=None):
        """Get all invitations waiting for approval with optional filters"""
        from app.models.user import User
        from app.models.inviter import Inviter
        from sqlalchemy import or_
        
        query = EventInvitee.query.filter_by(status='waiting_for_approval')
        
        if filters:
            if 'event_id' in filters and filters['event_id']:
                query = query.filter_by(event_id=filters['event_id'])
            
            if 'inviter_group_id' in filters and filters['inviter_group_id']:
                group_id = filters['inviter_group_id']
                # Filter by inviter's group OR submitter's group (for data isolation)
                # Use outerjoin to handle cases where inviter_id is null
                query = query.outerjoin(Inviter, EventInvitee.inviter_id == Inviter.id)\
                    .outerjoin(User, EventInvitee.inviter_user_id == User.id)\
                    .filter(
                        or_(
                            Inviter.inviter_group_id == group_id,
                            User.inviter_group_id == group_id
                        )
                    )
            
            if 'inviter_user_id' in filters and filters['inviter_user_id']:
                query = query.filter_by(inviter_user_id=filters['inviter_user_id'])
        
        return query.order_by(EventInvitee.created_at.desc()).all()
    
    @staticmethod
    def get_for_event(event_id, filters=None):
        """Get all invitations for a specific event with optional filters"""
        from app.models.user import User
        from app.models.inviter import Inviter
        from sqlalchemy import or_
        
        query = EventInvitee.query.filter_by(event_id=event_id)
        
        if filters:
            if 'status' in filters and filters['status']:
                query = query.filter_by(status=filters['status'])
            
            if 'exclude_status' in filters and filters['exclude_status']:
                # Support exclude_status as a list or single value
                if isinstance(filters['exclude_status'], list):
                    query = query.filter(~EventInvitee.status.in_(filters['exclude_status']))
                else:
                    query = query.filter(EventInvitee.status != filters['exclude_status'])
            
            if 'inviter_group_id' in filters and filters['inviter_group_id']:
                group_id = filters['inviter_group_id']
                # Filter by inviter's group OR submitter's group (for data isolation)
                query = query.outerjoin(Inviter, EventInvitee.inviter_id == Inviter.id)\
                    .outerjoin(User, EventInvitee.inviter_user_id == User.id)\
                    .filter(
                        or_(
                            Inviter.inviter_group_id == group_id,
                            User.inviter_group_id == group_id
                        )
                    )
        
        return query.order_by(EventInvitee.created_at.desc()).all()
