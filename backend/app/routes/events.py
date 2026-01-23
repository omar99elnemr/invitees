"""
Event management routes
Endpoints for managing events
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.utils.decorators import admin_required
from app.services.event_service import EventService

events_bp = Blueprint('events', __name__, url_prefix='/api/events')

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
        created_by_user_id=current_user.id
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
        updated_by_user_id=current_user.id
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
