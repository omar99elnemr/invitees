"""
Inviter model
Represents individual inviters within an inviter group
These are the people who can be selected when submitting invitees
"""
from app import db
from datetime import datetime


def to_utc_isoformat(dt):
    """Convert datetime to ISO format with UTC indicator"""
    return dt.isoformat() + 'Z' if dt else None


class Inviter(db.Model):
    """Inviter model - members of inviter groups who can invite people to events"""
    
    __tablename__ = 'inviters'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    email = db.Column(db.String(150), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    position = db.Column(db.String(100), nullable=True)
    inviter_group_id = db.Column(db.Integer, db.ForeignKey('inviter_groups.id', ondelete='SET NULL'), nullable=True, index=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    inviter_group = db.relationship('InviterGroup', backref=db.backref('inviters', lazy='dynamic'))
    
    def __repr__(self):
        return f'<Inviter {self.name} (Group: {self.inviter_group_id})>'
    
    def to_dict(self):
        """Convert inviter to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'position': self.position,
            'inviter_group_id': self.inviter_group_id,
            'inviter_group_name': self.inviter_group.name if self.inviter_group else None,
            'is_active': self.is_active,
            'created_at': to_utc_isoformat(self.created_at),
            'updated_at': to_utc_isoformat(self.updated_at),
        }
    
    @staticmethod
    def get_by_group(group_id, active_only=True):
        """Get all inviters for a specific group"""
        query = Inviter.query.filter_by(inviter_group_id=group_id)
        if active_only:
            query = query.filter_by(is_active=True)
        return query.order_by(Inviter.name).all()
    
    @staticmethod
    def get_by_id(inviter_id):
        """Get inviter by ID"""
        return Inviter.query.get(inviter_id)
