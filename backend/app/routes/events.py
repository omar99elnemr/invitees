"""
Event management routes
Endpoints for managing events
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.utils.decorators import admin_required
from app.services.event_service import EventService
from app.models.event import Event, get_egypt_time

events_bp = Blueprint('events', __name__, url_prefix='/api/events')

@events_bp.route('/refresh-statuses', methods=['POST'])
@login_required
def refresh_event_statuses():
    """
    Refresh all event statuses based on current Egypt time.
    Called periodically by the frontend to keep statuses in sync.
    Returns the updated events list.
    """
    try:
        ongoing_count, ended_count = Event.update_all_statuses()
        events = EventService.get_events_for_user(current_user)
        return jsonify({
            'events': [event.to_dict() for event in events],
            'updated': {
                'ongoing': ongoing_count,
                'ended': ended_count
            },
            'server_time': get_egypt_time().isoformat()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@events_bp.route('', methods=['GET'])
@login_required
def get_events():
    """Get all events (filtered by role)"""
    events = EventService.get_events_for_user(current_user)
    return jsonify([event.to_dict() for event in events]), 200

@events_bp.route('/<int:event_id>', methods=['GET'])
@login_required
def get_event(event_id):
    """Get event by ID"""
    event = EventService.get_event_by_id(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    # Check permissions
    if current_user.role != 'admin' and event.status not in ('upcoming', 'ongoing'):
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify(event.to_dict()), 200

@events_bp.route('', methods=['POST'])
@login_required
@admin_required
def create_event():
    """Create a new event"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'start_date', 'end_date']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Get is_all_groups flag
    is_all_groups = data.get('is_all_groups', False)
    
    # Validate that either is_all_groups is True OR inviter_group_ids are provided
    inviter_group_ids = data.get('inviter_group_ids', [])
    if not is_all_groups and not inviter_group_ids:
        return jsonify({'error': 'Either select "All Groups" or choose specific inviter groups'}), 400
    
    event, error = EventService.create_event(
        name=data['name'],
        start_date=data['start_date'],
        end_date=data['end_date'],
        venue=data.get('venue'),
        description=data.get('description'),
        created_by_user_id=current_user.id,
        inviter_group_ids=inviter_group_ids,
        is_all_groups=is_all_groups
    )
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify(event.to_dict()), 201

@events_bp.route('/<int:event_id>', methods=['PUT'])
@login_required
@admin_required
def update_event(event_id):
    """Update event information"""
    data = request.get_json()
    
    # Get is_all_groups flag
    is_all_groups = data.get('is_all_groups')
    inviter_group_ids = data.get('inviter_group_ids')
    
    event, error = EventService.update_event(
        event_id=event_id,
        name=data.get('name'),
        start_date=data.get('start_date'),
        end_date=data.get('end_date'),
        venue=data.get('venue'),
        description=data.get('description'),
        updated_by_user_id=current_user.id,
        inviter_group_ids=inviter_group_ids,
        is_all_groups=is_all_groups
    )
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify(event.to_dict()), 200

@events_bp.route('/<int:event_id>/status', methods=['PATCH'])
@login_required
@admin_required
def update_event_status(event_id):
    """Manually update event status"""
    data = request.get_json()
    
    if not data or not data.get('status'):
        return jsonify({'error': 'Status is required'}), 400
    
    event, error = EventService.update_event_status(
        event_id=event_id,
        status=data['status'],
        updated_by_user_id=current_user.id
    )
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    # Notify relevant users about event status change
    try:
        from app.services.notification_service import notify_event_status_changed
        from app import db as _db
        notify_event_status_changed(event, exclude_user_id=current_user.id)
        _db.session.commit()
    except Exception:
        pass
    
    return jsonify(event.to_dict()), 200

@events_bp.route('/<int:event_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_event(event_id):
    """Delete an event"""
    success, error = EventService.delete_event(event_id, current_user.id)
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify({'message': 'Event deleted successfully'}), 200


# =========================
# Check-in PIN Management
# =========================

@events_bp.route('/<int:event_id>/checkin-pin', methods=['POST'])
@login_required
@admin_required
def generate_checkin_pin(event_id):
    """Generate or regenerate check-in PIN for an event"""
    from app import db
    
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    data = request.get_json() or {}
    auto_deactivate_hours = data.get('auto_deactivate_hours')
    
    # Generate unique event code if not exists
    if not event.code:
        event.code = Event.generate_unique_code(event.name)
    
    # Generate new PIN
    pin = event.generate_checkin_pin()
    
    # Set auto-deactivate hours if provided
    if auto_deactivate_hours is not None:
        event.checkin_pin_auto_deactivate_hours = auto_deactivate_hours
    
    db.session.commit()
    
    # Log the action
    from app.models.audit_log import AuditLog
    AuditLog.log(
        user_id=current_user.id,
        action='generate_checkin_pin',
        table_name='events',
        record_id=event.id,
        new_value=f'Event: {event.name}, Code: {event.code}',
        ip_address=request.remote_addr
    )
    db.session.commit()
    
    return jsonify({
        'success': True,
        'code': event.code,
        'pin': pin,
        'active': event.checkin_pin_active,
        'auto_deactivate_hours': event.checkin_pin_auto_deactivate_hours,
        'checkin_url': f'/checkin/{event.code}',
        'live_url': f'/live/{event.code}'
    })


@events_bp.route('/<int:event_id>/checkin-pin', methods=['GET'])
@login_required
@admin_required
def get_checkin_pin(event_id):
    """Get check-in PIN info for an event (admin only)"""
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    if not event.checkin_pin:
        return jsonify({'error': 'No PIN generated for this event'}), 404
    
    return jsonify({
        'success': True,
        'code': event.code,
        'pin': event.checkin_pin,
        'active': event.checkin_pin_active,
        'auto_deactivate_hours': event.checkin_pin_auto_deactivate_hours,
        'checkin_url': f'/checkin/{event.code}',
        'live_url': f'/live/{event.code}'
    })


@events_bp.route('/<int:event_id>/checkin-pin/toggle', methods=['PATCH'])
@login_required
@admin_required
def toggle_checkin_pin(event_id):
    """Activate or deactivate check-in PIN"""
    from app import db
    
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    if not event.checkin_pin:
        return jsonify({'error': 'No PIN generated for this event'}), 400
    
    data = request.get_json() or {}
    active = data.get('active')
    
    old_status = event.checkin_pin_active
    
    if active is not None:
        event.checkin_pin_active = active
    else:
        # Toggle
        event.checkin_pin_active = not event.checkin_pin_active
    
    db.session.commit()
    
    # Log the action
    from app.models.audit_log import AuditLog
    AuditLog.log(
        user_id=current_user.id,
        action='toggle_checkin_pin',
        table_name='events',
        record_id=event.id,
        old_value=f'Active: {old_status}',
        new_value=f'Active: {event.checkin_pin_active}',
        ip_address=request.remote_addr
    )
    db.session.commit()
    
    return jsonify({
        'success': True,
        'checkin_pin_active': event.checkin_pin_active
    })


@events_bp.route('/<int:event_id>/checkin-pin/settings', methods=['PATCH'])
@login_required
@admin_required
def update_checkin_settings(event_id):
    """Update check-in settings (auto-deactivate hours)"""
    from app import db
    
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    data = request.get_json() or {}
    
    old_hours = event.checkin_pin_auto_deactivate_hours
    
    if 'auto_deactivate_hours' in data:
        event.checkin_pin_auto_deactivate_hours = data['auto_deactivate_hours']
    
    db.session.commit()
    
    # Log the action
    from app.models.audit_log import AuditLog
    AuditLog.log(
        user_id=current_user.id,
        action='update_checkin_settings',
        table_name='events',
        record_id=event.id,
        old_value=f'Auto-deactivate hours: {old_hours}',
        new_value=f'Auto-deactivate hours: {event.checkin_pin_auto_deactivate_hours}',
        ip_address=request.remote_addr
    )
    db.session.commit()
    
    return jsonify({
        'success': True,
        'auto_deactivate_hours': event.checkin_pin_auto_deactivate_hours
    })
