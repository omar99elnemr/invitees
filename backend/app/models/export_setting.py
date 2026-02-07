"""
Export Setting model
Stores key-value pairs for export configuration (e.g., logos)
"""
from app import db
from datetime import datetime


def to_utc_isoformat(dt):
    """Convert datetime to ISO format with UTC indicator"""
    return dt.isoformat() + 'Z' if dt else None


class ExportSetting(db.Model):
    """Export settings model for storing export configuration like logos"""
    
    __tablename__ = 'export_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(50), unique=True, nullable=False, index=True)
    setting_value = db.Column(db.Text, nullable=True)  # base64 data or other config
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Relationships
    updated_by = db.relationship('User', backref='export_setting_updates', lazy='joined')
    
    # Valid setting keys
    VALID_KEYS = ['logo_left', 'logo_right']
    
    def __repr__(self):
        return f'<ExportSetting {self.setting_key}>'
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'setting_key': self.setting_key,
            'setting_value': self.setting_value,
            'updated_at': to_utc_isoformat(self.updated_at),
            'updated_by_user_id': self.updated_by_user_id,
            'updated_by_name': self.updated_by.full_name or self.updated_by.username if self.updated_by else None,
        }
    
    @classmethod
    def get_setting(cls, key):
        """Get a setting by key"""
        return cls.query.filter_by(setting_key=key).first()
    
    @classmethod
    def get_all_export_settings(cls):
        """Get all export settings as a dictionary"""
        settings = cls.query.all()
        result = {}
        for s in settings:
            result[s.setting_key] = {
                'value': s.setting_value,
                'updated_at': to_utc_isoformat(s.updated_at),
                'updated_by_name': s.updated_by.full_name or s.updated_by.username if s.updated_by else None,
            }
        return result
    
    @classmethod
    def set_setting(cls, key, value, user_id):
        """Create or update a setting"""
        if key not in cls.VALID_KEYS:
            raise ValueError(f'Invalid setting key: {key}')
        
        setting = cls.query.filter_by(setting_key=key).first()
        if setting:
            setting.setting_value = value
            setting.updated_by_user_id = user_id
            setting.updated_at = datetime.utcnow()
        else:
            setting = cls(
                setting_key=key,
                setting_value=value,
                updated_by_user_id=user_id,
            )
            db.session.add(setting)
        
        db.session.commit()
        return setting
