"""
Category model
Represents categories for invitees (e.g., White, Gold)
"""
from app import db
from datetime import datetime


def to_utc_isoformat(dt):
    """Convert datetime to ISO format with UTC indicator"""
    return dt.isoformat() + 'Z' if dt else None


class Category(db.Model):
    """Category model"""
    
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    invitees = db.relationship('Invitee', backref='category_rel', lazy='dynamic')
    
    def __repr__(self):
        return f'<Category {self.name}>'
    
    def to_dict(self):
        """Convert category to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'is_active': self.is_active,
            'invitee_count': self.invitees.count(), 
            'created_at': to_utc_isoformat(self.created_at),
            'updated_at': to_utc_isoformat(self.updated_at),
        }
