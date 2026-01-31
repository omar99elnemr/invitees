"""
Portal routes
Public API endpoints for attendee portal (no authentication required)
"""
from flask import Blueprint, request, jsonify
from app.services.attendance_service import AttendanceService
from app.models.event_invitee import EventInvitee
from app.models.invitee import Invitee
from app import db

portal_bp = Blueprint('portal', __name__)


@portal_bp.route('/verify', methods=['POST'])
def verify_code():
    """Verify an attendance code or phone number and return attendee details"""
    data = request.get_json()
    
    if not data:
        return jsonify({'valid': False, 'error': 'No data provided'}), 400
    
    code = data.get('code', '').strip()
    phone = data.get('phone', '').strip()
    event_id = data.get('event_id')  # Optional - for phone lookup
    
    if not code and not phone:
        return jsonify({'valid': False, 'error': 'Code or phone number is required'}), 400
    
    # Try code first if provided
    if code:
        result = AttendanceService.verify_attendance_code(code)
        if result['valid']:
            return jsonify(result)
    
    # Try phone lookup if code wasn't provided or didn't work
    if phone:
        result = AttendanceService.verify_by_phone(phone, event_id)
        if result['valid']:
            return jsonify(result)
        if not code:
            # Only return phone error if no code was provided
            return jsonify(result), 404
    
    # Return code error if code was provided but invalid
    return jsonify({'valid': False, 'error': 'Invalid code'}), 404


@portal_bp.route('/confirm', methods=['POST'])
def confirm_attendance():
    """Confirm attendance from the portal"""
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
    
    code = data.get('code', '').strip()
    is_coming = data.get('is_coming')
    guest_count = data.get('guest_count')
    
    if not code:
        return jsonify({'success': False, 'error': 'Code is required'}), 400
    
    if is_coming is None:
        return jsonify({'success': False, 'error': 'Confirmation required'}), 400
    
    # Convert guest_count to int if provided
    if guest_count is not None:
        try:
            guest_count = int(guest_count)
        except (ValueError, TypeError):
            guest_count = 0
    
    result = AttendanceService.confirm_attendance_from_portal(
        code=code,
        is_coming=bool(is_coming),
        guest_count=guest_count
    )
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result)
