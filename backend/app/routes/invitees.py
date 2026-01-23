"""
Invitee management routes
Endpoints for managing invitees and event invitations
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.utils.decorators import admin_required
from app.services.invitee_service import InviteeService
from app.utils.helpers import get_filters_from_request

invitees_bp = Blueprint('invitees', __name__, url_prefix='/api/invitees')

@invitees_bp.route('', methods=['GET'])
@login_required
def get_all_invitees():
    """Get all invitees from global pool"""
    invitees = InviteeService.get_all_invitees()
    return jsonify([invitee.to_dict() for invitee in invitees]), 200

@invitees_bp.route('/search', methods=['GET'])
@login_required
def search_invitees():
    """Search invitees"""
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify([]), 200
    
    invitees = InviteeService.search_invitees(query)
    return jsonify([invitee.to_dict() for invitee in invitees]), 200

@invitees_bp.route('/<int:invitee_id>', methods=['GET'])
@login_required
def get_invitee(invitee_id):
    """Get invitee by ID"""
    from app.models.invitee import Invitee
    invitee = Invitee.query.get(invitee_id)
    if not invitee:
        return jsonify({'error': 'Invitee not found'}), 404
    return jsonify(invitee.to_dict()), 200

@invitees_bp.route('/<int:invitee_id>', methods=['PUT'])
@login_required
def update_invitee(invitee_id):
    """Update invitee information"""
    data = request.get_json()
    
    invitee, error = InviteeService.update_invitee(
        invitee_id=invitee_id,
        name=data.get('name'),
        email=data.get('email'),
        phone=data.get('phone'),
        position=data.get('position'),
        company=data.get('company'),
        updated_by_user_id=current_user.id
    )
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify(invitee.to_dict()), 200

@invitees_bp.route('/<int:invitee_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_invitee(invitee_id):
    """Delete an invitee (admin only)"""
    success, error = InviteeService.delete_invitee(invitee_id, current_user.id)
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify({'message': 'Invitee deleted successfully'}), 200

# Event-specific invitee routes

@invitees_bp.route('/events/<int:event_id>/invitees', methods=['GET'])
@login_required
def get_event_invitees(event_id):
    """Get all invitees for a specific event"""
    filters = get_filters_from_request()
    event_invitees = InviteeService.get_invitees_for_event(event_id, filters)
    return jsonify([ei.to_dict(include_relations=True) for ei in event_invitees]), 200

@invitees_bp.route('/events/<int:event_id>/invitees', methods=['POST'])
@login_required
def add_invitee_to_event(event_id):
    """Add an invitee to an event"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'email', 'phone']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Check if user can add invitees to this event
    from app.models.event import Event
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    if current_user.role != 'admin' and not event.can_add_invitees():
        return jsonify({'error': 'Cannot add invitees to this event'}), 403
    
    event_invitee, error = InviteeService.add_invitee_to_event(
        event_id=event_id,
        invitee_data=data,
        inviter_user_id=current_user.id,
        inviter_role=current_user.role,
        inviter_group_id=current_user.inviter_group_id
    )
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify(event_invitee.to_dict(include_relations=True)), 201

@invitees_bp.route('/events/<int:event_id>/invitees/<int:invitee_id>', methods=['PUT'])
@login_required
def update_event_invitee(event_id, invitee_id):
    """Update event invitee record"""
    from app.models.event_invitee import EventInvitee
    
    # Find the event_invitee record
    event_invitee = EventInvitee.query.filter_by(
        event_id=event_id,
        invitee_id=invitee_id
    ).first()
    
    if not event_invitee:
        return jsonify({'error': 'Event invitee not found'}), 404
    
    data = request.get_json()
    
    updated_ei, error = InviteeService.update_event_invitee(
        event_invitee_id=event_invitee.id,
        updates=data,
        updated_by_user_id=current_user.id
    )
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify(updated_ei.to_dict(include_relations=True)), 200

@invitees_bp.route('/events/<int:event_id>/invitees/<int:invitee_id>', methods=['DELETE'])
@login_required
@admin_required
def remove_invitee_from_event(event_id, invitee_id):
    """Remove invitee from specific event (admin only)"""
    success, error = InviteeService.remove_invitee_from_event(
        event_id, invitee_id, current_user.id
    )
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify({'message': 'Invitee removed from event'}), 200
