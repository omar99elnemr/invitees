"""
AuditLog model
Tracks all critical system actions for security and compliance
"""
from app import db
from datetime import datetime


def to_utc_isoformat(dt):
    """Convert datetime to ISO format with UTC indicator"""
    return dt.isoformat() + 'Z' if dt else None


class AuditLog(db.Model):
    """Audit log model for tracking system actions"""
    
    __tablename__ = 'audit_log'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    action = db.Column(db.String(50), nullable=False, index=True)
    table_name = db.Column(db.String(50), nullable=False)
    record_id = db.Column(db.Integer, nullable=True)
    old_value = db.Column(db.Text, nullable=True)
    new_value = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f'<AuditLog {self.action} on {self.table_name} by User:{self.user_id}>'
    
    def to_dict(self):
        """Convert audit log to dictionary"""
        from app.models.user import User
        username = 'System'
        user_role = None
        inviter_group_name = None
        if self.user_id:
            user = User.query.get(self.user_id)
            if user:
                username = user.full_name or user.username
                user_role = user.role
                if user.inviter_group:
                    inviter_group_name = user.inviter_group.name
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': username,
            'user_role': user_role,
            'inviter_group_name': inviter_group_name,
            'action': self.action,
            'table_name': self.table_name,
            'record_id': self.record_id,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'ip_address': self.ip_address,
            'timestamp': to_utc_isoformat(self.timestamp),
        }
    
    @staticmethod
    def log(user_id, action, table_name, record_id=None, old_value=None, new_value=None, ip_address=None):
        """Create a new audit log entry"""
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_value=str(old_value) if old_value else None,
            new_value=str(new_value) if new_value else None,
            ip_address=ip_address
        )
        db.session.add(log_entry)
        return log_entry
    
    @staticmethod
    def get_recent(limit=100):
        """Get recent audit logs"""
        return AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    @staticmethod
    def get_for_user(user_id, limit=100):
        """Get audit logs for a specific user"""
        return AuditLog.query.filter_by(user_id=user_id).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    @staticmethod
    def get_for_record(table_name, record_id):
        """Get audit logs for a specific record"""
        return AuditLog.query.filter_by(table_name=table_name, record_id=record_id).order_by(AuditLog.timestamp.desc()).all()
