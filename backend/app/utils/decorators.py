"""
Decorators for route protection and access control
"""
from functools import wraps
from flask import jsonify
from flask_login import current_user

def login_required(f):
    """Require user to be logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def role_required(*roles):
    """
    Require user to have one of the specified roles
    Usage: @role_required('admin', 'director')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({'error': 'Authentication required'}), 401
            
            if current_user.role not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def admin_required(f):
    """Require user to be an admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

def director_or_admin_required(f):
    """Require user to be a director or admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        
        if current_user.role not in ('admin', 'director'):
            return jsonify({'error': 'Director or Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function


def check_in_access_required(f):
    """Require user to have check-in access (admin or check_in_attendant)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        
        if current_user.role not in ('admin', 'check_in_attendant'):
            return jsonify({'error': 'Check-in access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function


def check_in_event_access_required(f):
    """Require user to have access to the specific event for check-in
    Works with event_id from URL parameter or request body
    Admins have access to all events, attendants only to assigned events
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import request
        from app.models.user_event_assignment import UserEventAssignment
        
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        
        if current_user.role not in ('admin', 'check_in_attendant'):
            return jsonify({'error': 'Check-in access required'}), 403
        
        # Admins have access to all events
        if current_user.role == 'admin':
            return f(*args, **kwargs)
        
        # For check-in attendants, verify event access
        event_id = kwargs.get('event_id')
        if not event_id:
            # Try to get from request body
            data = request.get_json(silent=True) or {}
            event_id = data.get('event_id')
        
        if not event_id:
            return jsonify({'error': 'Event ID required'}), 400
        
        if not UserEventAssignment.can_user_access_event(current_user.id, event_id):
            return jsonify({'error': 'You do not have access to this event'}), 403
        
        return f(*args, **kwargs)
    return decorated_function
