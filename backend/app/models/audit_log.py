"""
AuditLog model
Tracks all critical system actions for security and compliance
"""
import ast
from app import db
from datetime import datetime
from app.utils.helpers import to_utc_isoformat


# Human-readable field labels for audit log formatting
_FIELD_LABELS = {
    'name': 'Name', 'full_name': 'Full Name', 'username': 'Username',
    'email': 'Email', 'phone': 'Phone', 'secondary_phone': 'Secondary Phone',
    'title': 'Title', 'position': 'Position', 'company': 'Company',
    'address': 'Address', 'role': 'Role', 'is_active': 'Active',
    'invitee_name': 'Name', 'invitee_phone': 'Phone', 'invitee_email': 'Email',
    'invitee_position': 'Position', 'invitee_company': 'Company',
    'status': 'Status', 'plus_one': 'Plus One', 'is_going': 'Going',
    'notes': 'Notes', 'category': 'Category', 'category_name': 'Category',
    'inviter_name': 'Inviter', 'inviter_group_name': 'Group',
    'event_name': 'Event', 'event_date': 'Event Date',
    'attendance_confirmed': 'Confirmed', 'confirmed_guests': 'Confirmed Guests',
    'checked_in': 'Checked In', 'actual_guests': 'Actual Guests',
    'invitation_sent': 'Invitation Sent', 'invitation_method': 'Sent Via',
    'attendance_code': 'Attendance Code', 'approval_notes': 'Approval Notes',
    'start_date': 'Start Date', 'end_date': 'End Date', 'location': 'Location',
    'description': 'Description', 'max_attendees': 'Max Attendees',
}

# Fields to skip in diff output (internal/technical fields)
_SKIP_FIELDS = {
    'id', 'created_at', 'updated_at', 'event_id', 'invitee_id',
    'category_id', 'inviter_id', 'inviter_user_id', 'inviter_role',
    'approved_by_user_id', 'approver_role', 'status_date', 'code_generated_at',
    'invitation_sent_at', 'portal_accessed_at', 'confirmed_at',
    'checked_in_at', 'checked_in_by_user_id', 'check_in_notes',
    'inviter_group_id', 'password_hash', 'password', 'events',
    'inviter_group', 'last_login', 'checkin_pin_hash',
}

# Actions where old/new values are full dict snapshots that need diff formatting
_DIFF_ACTIONS = {
    'update_invitee', 'update_user', 'update_event_invitee', 'update_event',
}

# Fields used to identify the entity name per table
_NAME_FIELDS = {
    'invitees': ['name'],
    'users': ['full_name', 'username'],
    'events': ['name'],
    'event_invitees': ['invitee_name', 'name'],
}


def _format_val(val):
    """Format a single value for human display"""
    if val is None:
        return '—'
    if isinstance(val, bool):
        return 'Yes' if val else 'No'
    if isinstance(val, str) and val.strip() == '':
        return '—'
    return str(val)


def _parse_dict(raw_str):
    """Safely parse a Python dict string, return dict or None"""
    try:
        result = ast.literal_eval(raw_str)
        return result if isinstance(result, dict) else None
    except (ValueError, SyntaxError, TypeError):
        return None


def _extract_entity_name(raw_str, table_name):
    """Extract the entity name from a dict string based on the table"""
    d = _parse_dict(raw_str)
    if not d:
        return None
    for field in _NAME_FIELDS.get(table_name, ['name']):
        val = d.get(field)
        if val:
            return str(val)
    return None


def _compute_diff(old_str, new_str):
    """Parse two Python dict strings and return (change_lines_list, entity_name_or_None)"""
    old_dict = _parse_dict(old_str)
    new_dict = _parse_dict(new_str)
    if not old_dict or not new_dict:
        return None, None

    changes = []
    all_keys = set(old_dict.keys()) | set(new_dict.keys())
    for key in sorted(all_keys):
        if key in _SKIP_FIELDS:
            continue
        old_val = old_dict.get(key)
        new_val = new_dict.get(key)
        if old_val != new_val:
            label = _FIELD_LABELS.get(key, key.replace('_', ' ').title())
            changes.append(f'{label}: {_format_val(old_val)} → {_format_val(new_val)}')

    if not changes:
        changes = ['No visible changes']
    return changes, None


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
    
    def _get_entity_name(self):
        """Extract entity name from stored dict values based on table"""
        for raw in (self.new_value, self.old_value):
            if raw:
                name = _extract_entity_name(raw, self.table_name)
                if name:
                    return name
        return None

    def _build_formatted(self):
        """Build formatted details string + detail lines for modal"""
        if self.action in _DIFF_ACTIONS and self.old_value and self.new_value:
            lines, _ = _compute_diff(self.old_value, self.new_value)
            if lines:
                entity = self._get_entity_name()
                prefix = f'[{entity}] ' if entity else ''
                summary = prefix + ' | '.join(lines)
                return summary, lines, entity
        # For non-diff actions, new_value is already human-readable
        val = self.new_value or self.old_value
        return val, [val] if val else [], None

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
        summary, lines, entity = self._build_formatted()
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
            'formatted_details': summary,
            'detail_lines': lines,
            'entity_name': entity,
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
