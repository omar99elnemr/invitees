"""
Check-in Console routes
API endpoints for the standalone check-in console
Accessible by admin and check_in_attendant roles
"""
from flask import Blueprint, request, jsonify
from flask_login import current_user
from app.utils.decorators import login_required, check_in_access_required, check_in_event_access_required
from app.services.attendance_service import AttendanceService
from app.models.event import Event
from app.models.event_invitee import EventInvitee
from app.models.invitee import Invitee
from app.models.inviter import Inviter
from app.models.user_event_assignment import UserEventAssignment
from app import db

checkin_bp = Blueprint('checkin', __name__)


@checkin_bp.route('/my-events', methods=['GET'])
@login_required
@check_in_access_required
def get_my_events():
    """Get events the current user can access for check-in"""
    Event.update_all_statuses()
    
    if current_user.role == 'admin':
        # Admins can access all events
        events = Event.query.filter(
            Event.status.in_(['upcoming', 'ongoing'])
        ).order_by(Event.start_date.desc()).all()
    else:
        # Check-in attendants only see assigned events
        assigned_event_ids = UserEventAssignment.get_user_events(current_user.id)
        events = Event.query.filter(
            Event.id.in_(assigned_event_ids),
            Event.status.in_(['upcoming', 'ongoing'])
        ).order_by(Event.start_date.desc()).all()
    
    return jsonify({
        'success': True,
        'events': [e.to_dict() for e in events]
    })


@checkin_bp.route('/event/<int:event_id>/stats', methods=['GET'])
@login_required
@check_in_event_access_required
def get_event_stats(event_id):
    """Get check-in statistics for an event"""
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    stats = AttendanceService.get_event_attendance_stats(event_id)
    return jsonify({
        'success': True,
        'event': event.to_dict(),
        'stats': stats
    })


@checkin_bp.route('/event/<int:event_id>/search', methods=['GET'])
@login_required
@check_in_event_access_required
def search_attendees(event_id):
    """
    Search attendees by phone (priority), code, name, or inviter
    Returns approved invitees matching the search query
    """
    query = request.args.get('q', '').strip()
    
    if not query or len(query) < 2:
        return jsonify({'error': 'Search query must be at least 2 characters'}), 400
    
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    search_term = f"%{query}%"
    
    # Build search query - prioritize phone matches
    base_query = EventInvitee.query.filter_by(
        event_id=event_id,
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


@checkin_bp.route('/event/<int:event_id>/check-in', methods=['POST'])
@login_required
@check_in_event_access_required
def check_in_attendee(event_id):
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
        event_id=event_id
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
    
    event_invitee.check_in(current_user.id, actual_guests, notes)
    db.session.commit()
    
    # Log the action
    from app.models.audit_log import AuditLog
    AuditLog.log(
        user_id=current_user.id,
        action='check_in_attendee',
        table_name='event_invitees',
        record_id=event_invitee.id,
        new_value=f'Checked in with {actual_guests} guests'
    )
    
    return jsonify({
        'success': True,
        'attendee': event_invitee.to_dict(include_relations=True)
    })


@checkin_bp.route('/event/<int:event_id>/undo-check-in/<int:invitee_id>', methods=['POST'])
@login_required
@check_in_event_access_required
def undo_check_in(event_id, invitee_id):
    """Undo a check-in"""
    event_invitee = EventInvitee.query.filter_by(
        id=invitee_id,
        event_id=event_id
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
        user_id=current_user.id,
        action='undo_check_in',
        table_name='event_invitees',
        record_id=event_invitee.id
    )
    
    return jsonify({'success': True})


@checkin_bp.route('/event/<int:event_id>/recent-checkins', methods=['GET'])
@login_required
@check_in_event_access_required
def get_recent_checkins(event_id):
    """Get recent check-ins for an event (last 10)"""
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    recent = EventInvitee.query.filter_by(
        event_id=event_id,
        checked_in=True
    ).order_by(EventInvitee.checked_in_at.desc()).limit(10).all()
    
    return jsonify({
        'success': True,
        'recent_checkins': [r.to_dict(include_relations=True) for r in recent]
    })
