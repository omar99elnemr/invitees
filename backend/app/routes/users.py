"""
User management routes
Admin-only endpoints for managing users
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.utils.decorators import admin_required
from app.services.user_service import UserService
from app.services.auth_service import AuthService
from app.utils.helpers import get_filters_from_request

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('', methods=['GET'])
@login_required
@admin_required
def get_users():
    """Get all users with optional filters"""
    filters = get_filters_from_request()
    users = UserService.get_all_users(filters)
    return jsonify([user.to_dict() for user in users]), 200

@users_bp.route('/<int:user_id>', methods=['GET'])
@login_required
@admin_required
def get_user(user_id):
    """Get user by ID"""
    user = UserService.get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200

@users_bp.route('', methods=['POST'])
@login_required
@admin_required
def create_user():
    """Create a new user"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'password', 'role', 'email']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Validate password
    is_valid, error_msg = AuthService.validate_password(data['password'])
    if not is_valid:
        return jsonify({'error': error_msg}), 400
    
    user, error = UserService.create_user(
        username=data['username'],
        password=data['password'],
        role=data['role'],
        email=data['email'],
        full_name=data.get('full_name'),
        inviter_group_id=data.get('inviter_group_id'),
        created_by_user_id=current_user.id
    )
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify(user.to_dict()), 201

@users_bp.route('/<int:user_id>', methods=['PUT'])
@login_required
@admin_required
def update_user(user_id):
    """Update user information"""
    data = request.get_json()
    
    user, error = UserService.update_user(
        user_id=user_id,
        username=data.get('username'),
        email=data.get('email'),
        full_name=data.get('full_name'),
        role=data.get('role'),
        inviter_group_id=data.get('inviter_group_id'),
        updated_by_user_id=current_user.id
    )
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify(user.to_dict()), 200

@users_bp.route('/<int:user_id>/activate', methods=['PATCH'])
@login_required
@admin_required
def activate_user(user_id):
    """Activate a user account"""
    user, error = UserService.activate_user(user_id, current_user.id)
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify(user.to_dict()), 200

@users_bp.route('/<int:user_id>/deactivate', methods=['PATCH'])
@login_required
@admin_required
def deactivate_user(user_id):
    """Deactivate a user account"""
    # Prevent deactivating yourself
    if user_id == current_user.id:
        return jsonify({'error': 'Cannot deactivate your own account'}), 400
    
    user, error = UserService.deactivate_user(user_id, current_user.id)
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify(user.to_dict()), 200

@users_bp.route('/<int:user_id>/reset-password', methods=['POST'])
@login_required
@admin_required
def reset_password(user_id):
    """Reset user password (admin function)"""
    data = request.get_json()
    
    if not data or not data.get('new_password'):
        return jsonify({'error': 'New password is required'}), 400
    
    # Validate password
    is_valid, error_msg = AuthService.validate_password(data['new_password'])
    if not is_valid:
        return jsonify({'error': error_msg}), 400
    
    user = UserService.get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    AuthService.reset_password(user, data['new_password'], current_user.id)
    
    return jsonify({'message': 'Password reset successfully'}), 200


# =========================
# Check-in Attendant Event Assignment Routes
# =========================

@users_bp.route('/<int:user_id>/event-assignments', methods=['GET'])
@login_required
@admin_required
def get_user_event_assignments(user_id):
    """Get all event assignments for a user"""
    from app.models.user_event_assignment import UserEventAssignment
    
    user = UserService.get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    assignments = UserEventAssignment.query.filter_by(user_id=user_id).all()
    return jsonify({
        'success': True,
        'assignments': [a.to_dict() for a in assignments]
    }), 200


@users_bp.route('/<int:user_id>/event-assignments', methods=['POST'])
@login_required
@admin_required
def assign_user_to_event(user_id):
    """Assign a user to an event for check-in access"""
    from app.models.user_event_assignment import UserEventAssignment
    from app.models.event import Event
    
    data = request.get_json()
    if not data or not data.get('event_id'):
        return jsonify({'error': 'event_id is required'}), 400
    
    user = UserService.get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    event = Event.query.get(data['event_id'])
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    assignment = UserEventAssignment.assign_user_to_event(
        user_id=user_id,
        event_id=data['event_id'],
        created_by_user_id=current_user.id
    )
    
    return jsonify({
        'success': True,
        'assignment': assignment.to_dict()
    }), 201


@users_bp.route('/<int:user_id>/event-assignments/<int:event_id>', methods=['DELETE'])
@login_required
@admin_required
def remove_user_from_event(user_id, event_id):
    """Remove a user's access to an event"""
    from app.models.user_event_assignment import UserEventAssignment
    
    user = UserService.get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    success = UserEventAssignment.remove_user_from_event(user_id, event_id)
    
    if not success:
        return jsonify({'error': 'Assignment not found'}), 404
    
    return jsonify({'success': True}), 200


@users_bp.route('/check-in-attendants', methods=['GET'])
@login_required
@admin_required
def get_check_in_attendants():
    """Get all check-in attendants with their event assignments"""
    from app.models.user import User
    from app.models.user_event_assignment import UserEventAssignment
    
    attendants = User.query.filter_by(role='check_in_attendant').all()
    
    result = []
    for attendant in attendants:
        attendant_dict = attendant.to_dict()
        assignments = UserEventAssignment.query.filter_by(
            user_id=attendant.id,
            is_active=True
        ).all()
        attendant_dict['event_assignments'] = [a.to_dict() for a in assignments]
        result.append(attendant_dict)
    
    return jsonify({
        'success': True,
        'attendants': result
    }), 200
