"""
User model
Represents application users with role-based access
"""
from app import db
from flask_login import UserMixin
from datetime import datetime
from app.utils.helpers import to_utc_isoformat


class User(UserMixin, db.Model):
    """User model with role-based access control"""
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(100), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, index=True)  # admin, director, organizer, check_in_attendant
    inviter_group_id = db.Column(db.Integer, db.ForeignKey('inviter_groups.id'), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    inviter_group = db.relationship('InviterGroup', backref='users', lazy='joined')
    created_events = db.relationship('Event', backref='creator', lazy='dynamic', foreign_keys='Event.created_by_user_id')
    event_invitees = db.relationship('EventInvitee', backref='submitter', lazy='dynamic', foreign_keys='EventInvitee.inviter_user_id')
    approved_invitations = db.relationship('EventInvitee', backref='approver', lazy='dynamic', foreign_keys='EventInvitee.approved_by_user_id')
    # audit_logs relationship defined in AuditLog model
    
    # Constraints
    __table_args__ = (
        db.CheckConstraint("role IN ('admin', 'director', 'organizer', 'check_in_attendant')", name='check_user_role'),
    )
    
    def __repr__(self):
        return f'<User {self.username} ({self.role})>'
    
    def to_dict(self, include_sensitive=False):
        """Convert user to dictionary"""
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'inviter_group_id': self.inviter_group_id,
            'inviter_group_name': self.inviter_group.name if self.inviter_group else None,
            'is_active': self.is_active,
            'created_at': to_utc_isoformat(self.created_at),
            'updated_at': to_utc_isoformat(self.updated_at),
            'last_login': to_utc_isoformat(self.last_login),
        }
        
        if include_sensitive:
            data['password_hash'] = self.password_hash
        
        return data
    
    def has_role(self, *roles):
        """Check if user has one of the specified roles"""
        return self.role in roles
    
    def can_approve(self):
        """Check if user can approve invitations"""
        return self.role in ('admin', 'director')
    
    def can_view_reports(self):
        """Check if user can view reports"""
        return self.role in ('admin', 'director')
    
    def can_manage_users(self):
        """Check if user can manage other users"""
        return self.role == 'admin'
    
    def can_manage_events(self):
        """Check if user can create/edit events"""
        return self.role == 'admin'
    
    def is_check_in_attendant(self):
        """Check if user is a check-in attendant"""
        return self.role == 'check_in_attendant'
    
    def can_check_in(self):
        """Check if user can perform check-ins"""
        return self.role in ('admin', 'check_in_attendant')
