"""
Live Dashboard routes
Public API endpoints for real-time event statistics (no authentication required)
"""
from flask import Blueprint, request, jsonify
from app.services.attendance_service import AttendanceService
from app.models.event import Event
from app.models.event_invitee import EventInvitee
from app import db
from sqlalchemy import func
from datetime import datetime

live_dashboard_bp = Blueprint('live_dashboard', __name__)


def to_utc_isoformat(dt):
    """Convert datetime to ISO format with UTC indicator"""
    return dt.isoformat() + 'Z' if dt else None


@live_dashboard_bp.route('/<event_code>', methods=['GET'])
def get_event_info(event_code):
    """Get event info for the public live dashboard"""
    event = Event.get_by_code(event_code)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    return jsonify({
        'success': True,
        'event': {
            'id': event.id,
            'name': event.name,
            'code': event.code,
            'start_date': to_utc_isoformat(event.start_date),
            'end_date': to_utc_isoformat(event.end_date),
            'venue': event.venue,
            'status': event.status
        }
    })


@live_dashboard_bp.route('/<event_code>/stats', methods=['GET'])
def get_event_live_stats(event_code):
    """Get real-time statistics for an event - public access"""
    event = Event.get_by_code(event_code)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    event_id = event.id
    
    # Get base query for approved invitees
    base_query = EventInvitee.query.filter_by(event_id=event_id, status='approved')
    
    # Core statistics
    total_approved = base_query.count()
    
    # Confirmation stats
    confirmed_coming = base_query.filter_by(attendance_confirmed=True).count()
    confirmed_not_coming = base_query.filter_by(attendance_confirmed=False).count()
    not_responded = base_query.filter(EventInvitee.attendance_confirmed.is_(None)).count()
    
    # Check-in stats
    checked_in_count = base_query.filter_by(checked_in=True).count()
    not_yet_arrived = base_query.filter_by(checked_in=False, attendance_confirmed=True).count()
    
    # Guest counts
    total_plus_one_allowed = db.session.query(func.sum(EventInvitee.plus_one)).filter(
        EventInvitee.event_id == event_id,
        EventInvitee.status == 'approved'
    ).scalar() or 0
    
    total_confirmed_guests = db.session.query(func.sum(EventInvitee.confirmed_guests)).filter(
        EventInvitee.event_id == event_id,
        EventInvitee.status == 'approved',
        EventInvitee.confirmed_guests.isnot(None)
    ).scalar() or 0
    
    total_actual_guests = db.session.query(func.sum(EventInvitee.actual_guests)).filter(
        EventInvitee.event_id == event_id,
        EventInvitee.status == 'approved',
        EventInvitee.checked_in == True
    ).scalar() or 0
    
    # Calculate totals
    expected_attendees = confirmed_coming  # People who confirmed they're coming
    expected_with_guests = expected_attendees + total_confirmed_guests  # Including their guests
    
    actual_arrived = checked_in_count  # Invitees who checked in
    total_arrived = checked_in_count + total_actual_guests  # Including actual guests
    
    return jsonify({
        'success': True,
        'event': {
            'id': event.id,
            'name': event.name,
            'start_date': to_utc_isoformat(event.start_date),
            'end_date': to_utc_isoformat(event.end_date),
            'venue': event.venue,
            'status': event.status
        },
        'stats': {
            # Invitation stats
            'total_approved': total_approved,
            'total_capacity': total_approved + total_plus_one_allowed,
            
            # Confirmation stats
            'confirmed_coming': confirmed_coming,
            'confirmed_not_coming': confirmed_not_coming,
            'not_responded': not_responded,
            'confirmation_rate': round((confirmed_coming + confirmed_not_coming) / total_approved * 100, 1) if total_approved > 0 else 0,
            
            # Expected attendance
            'expected_attendees': expected_attendees,
            'expected_guests': total_confirmed_guests,
            'expected_total': expected_with_guests,
            
            # Actual attendance (check-ins)
            'checked_in': checked_in_count,
            'not_yet_arrived': not_yet_arrived,
            'actual_guests': total_actual_guests,
            'total_arrived': total_arrived,
            
            # Attendance rate
            'attendance_rate': round(checked_in_count / confirmed_coming * 100, 1) if confirmed_coming > 0 else 0,
        },
        'timestamp': to_utc_isoformat(datetime.utcnow())
    })


@live_dashboard_bp.route('/<event_code>/recent', methods=['GET'])
def get_recent_activity(event_code):
    """Get recent check-in activity for live display"""
    event = Event.get_by_code(event_code)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    # Get last 5 check-ins (public-safe info only)
    recent = EventInvitee.query.filter_by(
        event_id=event.id,
        checked_in=True
    ).order_by(EventInvitee.checked_in_at.desc()).limit(5).all()
    
    return jsonify({
        'success': True,
        'recent_checkins': [{
            'name': r.invitee.name if r.invitee else 'Guest',
            'company': r.invitee.company if r.invitee else None,
            'guests': r.actual_guests,
            'checked_in_at': to_utc_isoformat(r.checked_in_at)
        } for r in recent]
    })
