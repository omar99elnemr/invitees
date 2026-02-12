"""
Authentication routes
Handles login, logout, password management
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.services.auth_service import AuthService

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login endpoint"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    user = AuthService.authenticate(data['username'], data['password'])
    
    if user:
        remember = data.get('remember', False)
        # PWA standalone mode: always set remember cookie for native-app-like
        # long-lived sessions (30 days via REMEMBER_COOKIE_DURATION).
        # Desktop / phone-browser sessions rely on the 30-min sliding window.
        if request.headers.get('X-PWA-Standalone') == '1':
            remember = True
        AuthService.login(user, remember=remember)
        return jsonify(user.to_dict()), 200
    
    return jsonify({'error': 'Invalid username or password'}), 401

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout endpoint"""
    AuthService.logout(current_user)
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current authenticated user"""
    resp = jsonify(current_user.to_dict())
    resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    resp.headers['Pragma'] = 'no-cache'
    return resp, 200

@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change current user's password"""
    data = request.get_json()
    
    if not data or not data.get('old_password') or not data.get('new_password'):
        return jsonify({'error': 'Old and new passwords are required'}), 400
    
    # Validate new password
    is_valid, error_msg = AuthService.validate_password(data['new_password'])
    if not is_valid:
        return jsonify({'error': error_msg}), 400
    
    success = AuthService.change_password(
        current_user,
        data['old_password'],
        data['new_password']
    )
    
    if success:
        return jsonify({'message': 'Password changed successfully'}), 200
    
    return jsonify({'error': 'Invalid old password'}), 400
