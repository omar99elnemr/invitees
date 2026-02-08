"""
Attendance routes
API endpoints for attendance tracking and management
"""
from flask import Blueprint, request, jsonify
from flask_login import current_user
from app.utils.decorators import login_required, admin_required
from app.services.attendance_service import AttendanceService
from app.models.event import Event

attendance_bp = Blueprint('attendance', __name__)


@attendance_bp.route('/events', methods=['GET'])
@login_required
@admin_required
def get_events_for_attendance():
    """Get all events available for attendance management"""
    Event.update_all_statuses()
    events = Event.query.order_by(Event.start_date.desc()).all()
    return jsonify({
        'success': True,
        'events': [e.to_dict() for e in events]
    })


@attendance_bp.route('/event/<int:event_id>/stats', methods=['GET'])
@login_required
@admin_required
def get_event_stats(event_id):
    """Get attendance statistics for an event"""
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    stats = AttendanceService.get_event_attendance_stats(event_id)
    return jsonify({
        'success': True,
        'event': event.to_dict(),
        'stats': stats
    })


@attendance_bp.route('/event/<int:event_id>/attendees', methods=['GET'])
@login_required
@admin_required
def get_event_attendees(event_id):
    """Get all attendees for an event with optional filters"""
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    # Get filter parameters
    filters = {}
    
    if request.args.get('has_code') is not None:
        filters['has_code'] = request.args.get('has_code').lower() == 'true'
    
    if request.args.get('invitation_sent') is not None:
        filters['invitation_sent'] = request.args.get('invitation_sent').lower() == 'true'
    
    if request.args.get('checked_in') is not None:
        filters['checked_in'] = request.args.get('checked_in').lower() == 'true'
    
    if request.args.get('attendance_confirmed'):
        filters['attendance_confirmed'] = request.args.get('attendance_confirmed')
    
    if request.args.get('search'):
        filters['search'] = request.args.get('search')
    
    attendees = AttendanceService.get_event_attendees(event_id, filters if filters else None)
    
    return jsonify({
        'success': True,
        'attendees': [a.to_dict(include_relations=True) for a in attendees],
        'total': len(attendees)
    })


@attendance_bp.route('/event/<int:event_id>/generate-codes', methods=['POST'])
@login_required
@admin_required
def generate_codes(event_id):
    """Generate attendance codes for all approved invitees without codes"""
    data = request.get_json() or {}
    event_prefix = data.get('prefix')
    
    result = AttendanceService.generate_codes_for_event(
        event_id=event_id,
        user_id=current_user.id,
        event_prefix=event_prefix
    )
    
    if result.get('error'):
        return jsonify(result), 400
    
    return jsonify(result)


@attendance_bp.route('/mark-sent', methods=['POST'])
@login_required
@admin_required
def mark_invitations_sent():
    """Mark invitations as sent"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    invitee_ids = data.get('invitee_ids', [])
    method = data.get('method', 'physical')
    
    if not invitee_ids:
        return jsonify({'error': 'No invitees specified'}), 400
    
    if method not in ['email', 'whatsapp', 'physical', 'sms']:
        return jsonify({'error': 'Invalid method'}), 400
    
    result = AttendanceService.mark_invitations_sent(
        invitee_ids=invitee_ids,
        method=method,
        user_id=current_user.id
    )
    
    if result.get('error'):
        return jsonify(result), 400
    
    return jsonify(result)


@attendance_bp.route('/check-in', methods=['POST'])
@login_required
@admin_required
def check_in_attendee():
    """Check in an attendee"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    code = data.get('code')
    actual_guests = data.get('actual_guests', 0)
    notes = data.get('notes')
    
    if not code:
        return jsonify({'error': 'Attendance code required'}), 400
    
    result = AttendanceService.check_in_attendee(
        attendance_code=code,
        checked_in_by_user_id=current_user.id,
        actual_guests=actual_guests,
        notes=notes
    )
    
    if result.get('error'):
        status_code = 400
        if result.get('already_checked_in'):
            status_code = 409  # Conflict
        return jsonify(result), status_code
    
    return jsonify(result)


@attendance_bp.route('/undo-check-in/<int:invitee_id>', methods=['POST'])
@login_required
@admin_required
def undo_check_in(invitee_id):
    """Undo a check-in"""
    result = AttendanceService.undo_check_in(
        invitee_id=invitee_id,
        user_id=current_user.id
    )
    
    if result.get('error'):
        return jsonify(result), 400
    
    return jsonify(result)


@attendance_bp.route('/undo-mark-sent', methods=['POST'])
@login_required
@admin_required
def undo_mark_invitations_sent():
    """Undo marking invitations as sent (mistake correction)"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    invitee_ids = data.get('invitee_ids', [])
    
    if not invitee_ids:
        return jsonify({'error': 'No invitees specified'}), 400
    
    result = AttendanceService.undo_mark_invitations_sent(
        invitee_ids=invitee_ids,
        user_id=current_user.id
    )
    
    if result.get('error'):
        return jsonify(result), 400
    
    return jsonify(result)


@attendance_bp.route('/confirm-attendance', methods=['POST'])
@login_required
@admin_required
def admin_confirm_attendance():
    """Admin manually confirms attendance for selected invitees"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    invitee_ids = data.get('invitee_ids', [])
    is_coming = data.get('is_coming')
    guest_count = data.get('guest_count')
    
    if not invitee_ids:
        return jsonify({'error': 'No invitees specified'}), 400
    
    if is_coming is None:
        return jsonify({'error': 'Confirmation status required'}), 400
    
    # Convert guest_count to int if provided
    if guest_count is not None:
        try:
            guest_count = int(guest_count)
        except (ValueError, TypeError):
            guest_count = None
    
    result = AttendanceService.admin_confirm_attendance(
        invitee_ids=invitee_ids,
        is_coming=bool(is_coming),
        user_id=current_user.id,
        guest_count=guest_count
    )
    
    if result.get('error'):
        return jsonify(result), 400
    
    return jsonify(result)


@attendance_bp.route('/reset-confirmation', methods=['POST'])
@login_required
@admin_required
def reset_attendance_confirmation():
    """Reset attendance confirmation back to pending (mistake correction)"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    invitee_ids = data.get('invitee_ids', [])
    
    if not invitee_ids:
        return jsonify({'error': 'No invitees specified'}), 400
    
    result = AttendanceService.reset_attendance_confirmation(
        invitee_ids=invitee_ids,
        user_id=current_user.id
    )
    
    if result.get('error'):
        return jsonify(result), 400
    
    return jsonify(result)


@attendance_bp.route('/search', methods=['GET'])
@login_required
@admin_required
def search_attendee():
    """Search for an attendee by code or name"""
    query = request.args.get('q', '')
    event_id = request.args.get('event_id')
    
    if not query:
        return jsonify({'error': 'Search query required'}), 400
    
    from app.models.event_invitee import EventInvitee
    from app.models.invitee import Invitee
    from app import db
    
    search_query = EventInvitee.query.filter_by(status='approved')
    
    if event_id:
        search_query = search_query.filter_by(event_id=int(event_id))
    
    # Search by code or invitee name
    search_term = f"%{query}%"
    search_query = search_query.join(Invitee).filter(
        db.or_(
            EventInvitee.attendance_code.ilike(search_term),
            Invitee.name.ilike(search_term),
            Invitee.phone.ilike(search_term)
        )
    )
    
    results = search_query.limit(20).all()
    
    return jsonify({
        'success': True,
        'results': [r.to_dict(include_relations=True) for r in results]
    })
