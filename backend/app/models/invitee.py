"""
Invitee model
Represents individuals who can be invited to events
"""
from app import db
from datetime import datetime


def to_utc_isoformat(dt):
    """Convert datetime to ISO format with UTC indicator"""
    return dt.isoformat() + 'Z' if dt else None


# Category choices
# Category choices - LEGACY, will be removed after migration
INVITEE_CATEGORIES = ['White', 'Gold']


class Invitee(db.Model):
    """Invitee model for storing invitee information"""
    
    __tablename__ = 'invitees'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    email = db.Column(db.String(150), nullable=False, index=True)
    phone = db.Column(db.String(30), nullable=False)
    secondary_phone = db.Column(db.String(30), nullable=True)
    title = db.Column(db.String(50), nullable=True)  # e.g. Dr., Mr., Ms.
    address = db.Column(db.String(255), nullable=True)
    position = db.Column(db.String(100), nullable=True)
    company = db.Column(db.String(150), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    plus_one = db.Column(db.Integer, default=0, nullable=False)  # Default guests allowed
    # category = db.Column(db.String(20), nullable=True)  # Legacy field
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True, index=True)
    inviter_group_id = db.Column(db.Integer, db.ForeignKey('inviter_groups.id'), nullable=True, index=True)
    inviter_id = db.Column(db.Integer, db.ForeignKey('inviters.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    event_invitations = db.relationship('EventInvitee', backref='invitee', lazy='dynamic', cascade='all, delete-orphan')
    inviter_group = db.relationship('InviterGroup', backref=db.backref('invitees', lazy='dynamic'))
    inviter = db.relationship('Inviter', backref=db.backref('invitees', lazy='dynamic'))
    
    # Constraints
    # __table_args__ = (
    #     db.CheckConstraint("category IN ('White', 'Gold') OR category IS NULL", name='check_invitee_category'),
    # )
    
    def __repr__(self):
        return f'<Invitee {self.name} ({self.email})>'
    
    def to_dict(self, include_contact_details=True):
        """Convert invitee to dictionary"""
        data = {
            'id': self.id,
            'name': self.name,
            'title': self.title,
            'position': self.position,
            'company': self.company,
            'address': self.address,
            'notes': self.notes,
            'plus_one': self.plus_one,
            'category': self.category_rel.name if self.category_rel else None,
            'category_id': self.category_id,
            'inviter_group_id': self.inviter_group_id,
            'inviter_group_name': self.inviter_group.name if self.inviter_group else None,
            'inviter_id': self.inviter_id,
            'inviter_name': self.inviter.name if self.inviter else None,
            'created_at': to_utc_isoformat(self.created_at),
            'updated_at': to_utc_isoformat(self.updated_at),
        }
        
        if include_contact_details:
            data['email'] = self.email
            data['phone'] = self.phone
            data['secondary_phone'] = self.secondary_phone
            
        return data
    
    @staticmethod
    def find_by_email(email):
        """Find invitee by email"""
        return Invitee.query.filter_by(email=email.lower().strip()).first()
    
    @staticmethod
    def find_by_phone(phone):
        """Find invitee by phone (global search)"""
        clean_phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        return Invitee.query.filter(
            db.func.replace(db.func.replace(db.func.replace(db.func.replace(Invitee.phone, ' ', ''), '-', ''), '(', ''), ')', '') == clean_phone
        ).first()
    
    @staticmethod
    def find_by_phone_in_group(phone, inviter_group_id):
        """Find invitee by phone within a specific inviter group"""
        clean_phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        return Invitee.query.filter(
            db.func.replace(db.func.replace(db.func.replace(db.func.replace(Invitee.phone, ' ', ''), '-', ''), '(', ''), ')', '') == clean_phone,
            Invitee.inviter_group_id == inviter_group_id
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

