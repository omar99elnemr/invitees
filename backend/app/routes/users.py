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
    required_fields = ['username', 'password', 'role']
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
