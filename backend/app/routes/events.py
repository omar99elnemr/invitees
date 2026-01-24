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
    
    event, error = EventService.create_event(
        name=data['name'],
        start_date=data['start_date'],
        end_date=data['end_date'],
        venue=data.get('venue'),
        description=data.get('description'),
        created_by_user_id=current_user.id,
        inviter_group_ids=data.get('inviter_group_ids', [])
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
    
    event, error = EventService.update_event(
        event_id=event_id,
        name=data.get('name'),
        start_date=data.get('start_date'),
        end_date=data.get('end_date'),
        venue=data.get('venue'),
        description=data.get('description'),
        updated_by_user_id=current_user.id,
        inviter_group_ids=data.get('inviter_group_ids')
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
