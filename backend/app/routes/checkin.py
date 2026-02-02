"""Check-in Console Routes
Event-specific check-in console with PIN authentication
No user login required - uses event-specific PIN
"""
from flask import Blueprint, request, jsonify, session
from app.models.event import Event
from app.models.event_invitee import EventInvitee
from app.models.invitee import Invitee
from app.models.inviter import Inviter
from app.services.attendance_service import AttendanceService
from app import db
from functools import wraps

checkin_bp = Blueprint('checkin', __name__, url_prefix='/api/checkin')


def _parse_user_agent(user_agent):
    """Parse User-Agent string to extract device/browser info"""
    if not user_agent or user_agent == 'Unknown':
        return 'Unknown Device'
    
    ua = user_agent.lower()
    
    # Detect OS
    if 'iphone' in ua:
        os_info = 'iPhone'
    elif 'ipad' in ua:
        os_info = 'iPad'
    elif 'android' in ua:
        os_info = 'Android'
    elif 'windows' in ua:
        os_info = 'Windows'
    elif 'macintosh' in ua or 'mac os' in ua:
        os_info = 'Mac'
    elif 'linux' in ua:
        os_info = 'Linux'
    else:
        os_info = 'Unknown OS'
    
    # Detect Browser
    if 'edg/' in ua or 'edge' in ua:
        browser = 'Edge'
    elif 'chrome' in ua and 'safari' in ua:
        browser = 'Chrome'
    elif 'firefox' in ua:
        browser = 'Firefox'
    elif 'safari' in ua and 'chrome' not in ua:
        browser = 'Safari'
    elif 'opera' in ua or 'opr/' in ua:
        browser = 'Opera'
    else:
        browser = 'Unknown Browser'
    
    # Detect if mobile
    is_mobile = any(x in ua for x in ['mobile', 'android', 'iphone', 'ipad'])
    device_type = 'Mobile' if is_mobile else 'Desktop'
    
    return f'{os_info} - {browser} ({device_type})'


def checkin_pin_required(f):
    """Decorator to verify check-in PIN from session"""
    @wraps(f)
    def decorated_function(event_code, *args, **kwargs):
        event = Event.get_by_code(event_code)
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        # Check if PIN is verified in session AND matches current PIN
        session_key = f'checkin_verified_{event_code}'
        session_pin_key = f'checkin_pin_{event_code}'
        stored_pin = session.get(session_pin_key)
        
        if not session.get(session_key) or stored_pin != event.checkin_pin:
            # Clear invalid session
            session.pop(session_key, None)
            session.pop(session_pin_key, None)
            return jsonify({'error': 'PIN verification required', 'requires_pin': True}), 401
        
        # Check if PIN is still active
        if not event.checkin_pin_active:
            session.pop(session_key, None)
            session.pop(session_pin_key, None)
            return jsonify({'error': 'PIN has been deactivated', 'requires_pin': True}), 401
        
        # Check if event allows check-in
        if not event.is_checkin_allowed():
            return jsonify({'error': 'Check-in is not available for this event'}), 403
        
        return f(event_code, event=event, *args, **kwargs)
    return decorated_function


# =========================
# Event Info (Public - just needs event code)
# =========================

@checkin_bp.route('/<event_code>/info', methods=['GET'])
def get_event_info(event_code):
    """Get basic event info for check-in page (public)"""
    event = Event.get_by_code(event_code)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    # Check if PIN is already verified in session
    session_key = f'checkin_verified_{event_code}'
    is_verified = session.get(session_key, False)
    
    return jsonify({
        'success': True,
        'event': {
            'id': event.id,
            'name': event.name,
            'code': event.code,
            'venue': event.venue,
            'status': event.status,
            'start_date': event.start_date.isoformat() + 'Z' if event.start_date else None,
            'end_date': event.end_date.isoformat() + 'Z' if event.end_date else None,
            'checkin_available': event.checkin_pin_active and event.is_checkin_allowed(),
        },
        'is_verified': is_verified
    })


@checkin_bp.route('/<event_code>/verify-pin', methods=['POST'])
def verify_pin(event_code):
    """Verify the check-in PIN for an event"""
    event = Event.get_by_code(event_code)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    data = request.get_json()
    if not data or not data.get('pin'):
        return jsonify({'error': 'PIN is required'}), 400
    
    pin = data.get('pin')
    
    if event.verify_checkin_pin(pin):
        # Store verification and the verified PIN in session
        session_key = f'checkin_verified_{event_code}'
        session_pin_key = f'checkin_pin_{event_code}'
        session[session_key] = True
        session[session_pin_key] = pin  # Store PIN to detect regeneration
        
        # Log successful login with device info
        from app.models.audit_log import AuditLog
        user_agent = request.headers.get('User-Agent', 'Unknown')
        device_info = _parse_user_agent(user_agent)
        AuditLog.log(
            user_id=None,
            action='checkin_portal_login',
            table_name='events',
            record_id=event.id,
            new_value=f'Event: {event.name}, Device: {device_info}',
            ip_address=request.remote_addr
        )
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'PIN verified'})
    else:
        # Log failed login attempt
        from app.models.audit_log import AuditLog
        user_agent = request.headers.get('User-Agent', 'Unknown')
        device_info = _parse_user_agent(user_agent)
        AuditLog.log(
            user_id=None,
            action='checkin_portal_login_failed',
            table_name='events',
            record_id=event.id,
            new_value=f'Event: {event.name}, Device: {device_info}',
            ip_address=request.remote_addr
        )
        db.session.commit()
        
        return jsonify({'error': 'Invalid or inactive PIN'}), 401


@checkin_bp.route('/<event_code>/logout', methods=['POST'])
def logout_checkin(event_code):
    """Clear the check-in session for an event"""
    event = Event.get_by_code(event_code)
    
    session_key = f'checkin_verified_{event_code}'
    session_pin_key = f'checkin_pin_{event_code}'
    was_verified = session.get(session_key)
    session.pop(session_key, None)
    session.pop(session_pin_key, None)
    
    # Log logout if was verified
    if was_verified and event:
        from app.models.audit_log import AuditLog
        user_agent = request.headers.get('User-Agent', 'Unknown')
        device_info = _parse_user_agent(user_agent)
        AuditLog.log(
            user_id=None,
            action='checkin_portal_logout',
            table_name='events',
            record_id=event.id,
            new_value=f'Event: {event.name}, Device: {device_info}',
            ip_address=request.remote_addr
        )
        db.session.commit()
    
    return jsonify({'success': True})


# =========================
# PIN-Protected Routes
# =========================

@checkin_bp.route('/<event_code>/stats', methods=['GET'])
@checkin_pin_required
def get_event_stats(event_code, event=None):
    """Get check-in statistics for the event"""
    stats = AttendanceService.get_event_attendance_stats(event.id)
    return jsonify({
        'success': True,
        'event': event.to_dict(),
        'stats': stats
    })


@checkin_bp.route('/<event_code>/attendees', methods=['GET'])
@checkin_pin_required
def get_all_attendees(event_code, event=None):
    """
    Get all approved attendees for the event.
    Used for client-side real-time filtering.
    """
    attendees = EventInvitee.query.filter_by(
        event_id=event.id,
        status='approved'
    ).join(Invitee).outerjoin(
        Inviter, EventInvitee.inviter_id == Inviter.id
    ).order_by(Invitee.name).all()
    
    return jsonify({
        'success': True,
        'attendees': [a.to_dict(include_relations=True) for a in attendees],
        'total': len(attendees)
    })


@checkin_bp.route('/<event_code>/search', methods=['GET'])
@checkin_pin_required
def search_attendees(event_code, event=None):
    """
    Search attendees by phone (priority), code, name, or inviter
    Returns approved invitees matching the search query
    """
    query = request.args.get('q', '').strip()
    
    if not query or len(query) < 2:
        return jsonify({'error': 'Search query must be at least 2 characters'}), 400
    
    search_term = f"%{query}%"
    
    # Build search query - prioritize phone matches
    base_query = EventInvitee.query.filter_by(
        event_id=event.id,
        status='approved'
    ).join(Invitee)
    
    # Search across phone (priority), code, name, inviter
    results = base_query.outerjoin(Inviter, EventInvitee.inviter_id == Inviter.id).filter(
        db.or_(
            Invitee.phone.ilike(search_term),
            Invitee.secondary_phone.ilike(search_term),
            EventInvitee.attendance_code.ilike(search_term),
            Invitee.name.ilike(search_term),
            Inviter.name.ilike(search_term)
        )
    ).order_by(
        # Prioritize phone matches by putting them first
        db.case(
            (Invitee.phone.ilike(search_term), 1),
            (Invitee.secondary_phone.ilike(search_term), 2),
            (EventInvitee.attendance_code.ilike(search_term), 3),
            else_=4
        )
    ).limit(20).all()
    
    return jsonify({
        'success': True,
        'results': [r.to_dict(include_relations=True) for r in results],
        'total': len(results)
    })


@checkin_bp.route('/<event_code>/check-in', methods=['POST'])
@checkin_pin_required
def check_in_attendee(event_code, event=None):
    """Check in an attendee"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    invitee_id = data.get('invitee_id')
    actual_guests = data.get('actual_guests', 0)
    notes = data.get('notes')
    
    if not invitee_id:
        return jsonify({'error': 'Invitee ID required'}), 400
    
    # Get the event invitee
    event_invitee = EventInvitee.query.filter_by(
        id=invitee_id,
        event_id=event.id
    ).first()
    
    if not event_invitee:
        return jsonify({'error': 'Attendee not found for this event'}), 404
    
    if event_invitee.status != 'approved':
        return jsonify({'error': 'Invitation not approved'}), 400
    
    if event_invitee.checked_in:
        return jsonify({
            'error': 'Already checked in',
            'success': False,
            'already_checked_in': True,
            'checked_in_at': event_invitee.checked_in_at.isoformat() + 'Z' if event_invitee.checked_in_at else None
        }), 409
    
    # Validate guest count
    if actual_guests > event_invitee.plus_one:
        actual_guests = event_invitee.plus_one
    
    # Check-in without user_id (PIN-based auth doesn't have a user)
    event_invitee.check_in(None, actual_guests, notes)
    db.session.commit()
    
    # Log the action (without user_id for PIN-based check-in)
    from app.models.audit_log import AuditLog
    AuditLog.log(
        user_id=None,
        action='check_in_attendee',
        table_name='event_invitees',
        record_id=event_invitee.id,
        new_value=f'Checked in via PIN with {actual_guests} guests'
    )
    
    return jsonify({
        'success': True,
        'attendee': event_invitee.to_dict(include_relations=True)
    })


@checkin_bp.route('/<event_code>/undo-check-in/<int:invitee_id>', methods=['POST'])
@checkin_pin_required
def undo_check_in(event_code, invitee_id, event=None):
    """Undo a check-in"""
    event_invitee = EventInvitee.query.filter_by(
        id=invitee_id,
        event_id=event.id
    ).first()
    
    if not event_invitee:
        return jsonify({'error': 'Attendee not found for this event'}), 404
    
    if not event_invitee.checked_in:
        return jsonify({'error': 'Not checked in'}), 400
    
    event_invitee.undo_check_in()
    db.session.commit()
    
    # Log the action
    from app.models.audit_log import AuditLog
    AuditLog.log(
        user_id=None,
        action='undo_check_in',
        table_name='event_invitees',
        record_id=event_invitee.id
    )
    
    return jsonify({'success': True})


@checkin_bp.route('/<event_code>/recent-checkins', methods=['GET'])
@checkin_pin_required
def get_recent_checkins(event_code, event=None):
    """Get recent check-ins for an event (last 10)"""
    recent = EventInvitee.query.filter_by(
        event_id=event.id,
        checked_in=True
    ).order_by(EventInvitee.checked_in_at.desc()).limit(10).all()
    
    return jsonify({
        'success': True,
        'recent_checkins': [r.to_dict(include_relations=True) for r in recent]
    })
