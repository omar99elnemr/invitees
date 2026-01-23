"""
Invitee model
Represents individuals who can be invited to events
"""
from app import db
from datetime import datetime

class Invitee(db.Model):
    """Invitee model for storing invitee information"""
    
    __tablename__ = 'invitees'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    email = db.Column(db.String(150), nullable=False, index=True)
    phone = db.Column(db.String(30), nullable=False)
    position = db.Column(db.String(100), nullable=True)
    company = db.Column(db.String(150), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    event_invitations = db.relationship('EventInvitee', backref='invitee', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Invitee {self.name} ({self.email})>'
    
    def to_dict(self):
        """Convert invitee to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'position': self.position,
            'company': self.company,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    @staticmethod
    def find_by_email(email):
        """Find invitee by email"""
        return Invitee.query.filter_by(email=email.lower().strip()).first()
    
    @staticmethod
    def find_by_phone(phone):
        """Find invitee by phone"""
        clean_phone = phone.replace(' ', '').replace('-', '')
        return Invitee.query.filter(
            db.func.replace(db.func.replace(Invitee.phone, ' ', ''), '-', '') == clean_phone
        ).first()
    
    @staticmethod
    def search(query):
        """Search invitees by name, email, or phone"""
        search_term = f'%{query}%'
        return Invitee.query.filter(
            db.or_(
                Invitee.name.ilike(search_term),
                Invitee.email.ilike(search_term),
                Invitee.phone.ilike(search_term),
                Invitee.company.ilike(search_term)
            )
        ).all()
