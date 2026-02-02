"""
InviterGroup model
Represents groups/departments that organize invitations
"""
from app import db
from datetime import datetime


def to_utc_isoformat(dt):
    """Convert datetime to ISO format with UTC indicator"""
    return dt.isoformat() + 'Z' if dt else None


class InviterGroup(db.Model):
    """Inviter group model for organizing users by department/team"""
    
    __tablename__ = 'inviter_groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f'<InviterGroup {self.name}>'
    
    def to_dict(self):
        """Convert inviter group to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': to_utc_isoformat(self.created_at),
            'member_count': len(self.users) if hasattr(self, 'users') else 0
        }
    
    @staticmethod
    def get_all():
        """Get all inviter groups"""
        return InviterGroup.query.order_by(InviterGroup.name).all()
    
    @staticmethod
    def get_by_id(group_id):
        """Get inviter group by ID"""
        return InviterGroup.query.get(group_id)
    
    @staticmethod
    def get_by_name(name):
        """Get inviter group by name"""
        return InviterGroup.query.filter_by(name=name).first()
