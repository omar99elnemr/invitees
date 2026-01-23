"""
EventInvitee model (Junction Table)
Represents the relationship between events and invitees with additional metadata
This is the core model that tracks invitations, approvals, and attendance
"""
from app import db
from datetime import datetime

class EventInvitee(db.Model):
    """Junction model linking events and invitees with invitation details"""
    
    __tablename__ = 'event_invitees'
    
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), nullable=False, index=True)
    invitee_id = db.Column(db.Integer, db.ForeignKey('invitees.id', ondelete='CASCADE'), nullable=False, index=True)
    category = db.Column(db.String(100), nullable=True)
    invitation_class = db.Column(db.String(50), default='none', nullable=False)
    inviter_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    inviter_role = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(30), nullable=False, default='waiting_for_approval', index=True)
    status_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    approved_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    approver_role = db.Column(db.String(20), nullable=True)
    approval_notes = db.Column(db.Text, nullable=True)
    is_going = db.Column(db.String(10), nullable=True)  # yes, no, maybe
    plus_one = db.Column(db.Boolean, default=False, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('event_id', 'invitee_id', name='uq_event_invitee'),
        db.CheckConstraint("inviter_role IN ('admin', 'director', 'organizer')", name='check_inviter_role'),
        db.CheckConstraint("status IN ('waiting_for_approval', 'approved', 'rejected')", name='check_status'),
        db.CheckConstraint("approver_role IN ('admin', 'director') OR approver_role IS NULL", name='check_approver_role'),
        db.CheckConstraint("is_going IN ('yes', 'no', 'maybe') OR is_going IS NULL", name='check_is_going'),
    )
    
    def __repr__(self):
        return f'<EventInvitee Event:{self.event_id} Invitee:{self.invitee_id} Status:{self.status}>'
    
    def to_dict(self, include_relations=True):
        """Convert event invitee to dictionary"""
        data = {
            'id': self.id,
            'event_id': self.event_id,
            'invitee_id': self.invitee_id,
            'category': self.category,
            'invitation_class': self.invitation_class,
            'inviter_user_id': self.inviter_user_id,
            'inviter_role': self.inviter_role,
            'status': self.status,
            'status_date': self.status_date.isoformat() if self.status_date else None,
            'approved_by_user_id': self.approved_by_user_id,
            'approver_role': self.approver_role,
            'approval_notes': self.approval_notes,
            'is_going': self.is_going,
            'plus_one': self.plus_one,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_relations:
            # Add related entity names
            data['event_name'] = self.event.name if self.event else None
            data['invitee_name'] = self.invitee.name if self.invitee else None
            data['invitee_email'] = self.invitee.email if self.invitee else None
            data['invitee_phone'] = self.invitee.phone if self.invitee else None
            data['invitee_position'] = self.invitee.position if self.invitee else None
            data['invitee_company'] = self.invitee.company if self.invitee else None
            data['inviter_name'] = self.inviter.username if self.inviter else None
            data['inviter_group_name'] = self.inviter.inviter_group.name if self.inviter and self.inviter.inviter_group else None
            data['approved_by_name'] = self.approver.username if self.approver else None
        
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
    
    @staticmethod
    def get_pending_approvals(filters=None):
        """Get all invitations waiting for approval with optional filters"""
        query = EventInvitee.query.filter_by(status='waiting_for_approval')
        
        if filters:
            if 'event_id' in filters and filters['event_id']:
                query = query.filter_by(event_id=filters['event_id'])
            
            if 'inviter_group_id' in filters and filters['inviter_group_id']:
                query = query.join(EventInvitee.inviter).filter(
                    db.text('users.inviter_group_id = :group_id')
                ).params(group_id=filters['inviter_group_id'])
            
            if 'inviter_user_id' in filters and filters['inviter_user_id']:
                query = query.filter_by(inviter_user_id=filters['inviter_user_id'])
        
        return query.order_by(EventInvitee.created_at.desc()).all()
    
    @staticmethod
    def get_for_event(event_id, filters=None):
        """Get all invitations for a specific event with optional filters"""
        query = EventInvitee.query.filter_by(event_id=event_id)
        
        if filters:
            if 'status' in filters and filters['status']:
                query = query.filter_by(status=filters['status'])
            
            if 'inviter_group_id' in filters and filters['inviter_group_id']:
                query = query.join(EventInvitee.inviter).filter(
                    db.text('users.inviter_group_id = :group_id')
                ).params(group_id=filters['inviter_group_id'])
        
        return query.order_by(EventInvitee.created_at.desc()).all()
