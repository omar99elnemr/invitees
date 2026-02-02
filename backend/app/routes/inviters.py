"""
Inviter management routes
Endpoints for managing inviters within inviter groups
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.utils.decorators import admin_required
from app.models.inviter import Inviter
from app.models.inviter_group import InviterGroup

inviters_bp = Blueprint('inviters', __name__, url_prefix='/api/inviters')


@inviters_bp.route('', methods=['GET'])
@login_required
@admin_required
def get_all_inviters():
    """Get all inviters in the system (admin only)"""
    active_only = request.args.get('active_only', 'false').lower() == 'true'
    
    query = Inviter.query
    if active_only:
        query = query.filter_by(is_active=True)
    
    inviters = query.order_by(Inviter.name).all()
    return jsonify([inviter.to_dict() for inviter in inviters]), 200


@inviters_bp.route('/group/<int:group_id>', methods=['GET'])
@login_required
def get_inviters_by_group(group_id):
    """Get all inviters for a specific inviter group"""
    # Check if user has access to this group
    if current_user.role != 'admin' and current_user.inviter_group_id != group_id:
        return jsonify({'error': 'Access denied'}), 403
    
    group = InviterGroup.get_by_id(group_id)
    if not group:
        return jsonify({'error': 'Inviter group not found'}), 404
    
    active_only = request.args.get('active_only', 'true').lower() == 'true'
    inviters = Inviter.get_by_group(group_id, active_only=active_only)
    
    return jsonify([inviter.to_dict() for inviter in inviters]), 200


@inviters_bp.route('/my-group', methods=['GET'])
@login_required
def get_my_group_inviters():
    """Get inviters for current user's group"""
    if not current_user.inviter_group_id:
        return jsonify({'error': 'You are not assigned to an inviter group'}), 400
    
    active_only = request.args.get('active_only', 'true').lower() == 'true'
    inviters = Inviter.get_by_group(current_user.inviter_group_id, active_only=active_only)
    
    return jsonify([inviter.to_dict() for inviter in inviters]), 200


@inviters_bp.route('/<int:inviter_id>', methods=['GET'])
@login_required
def get_inviter(inviter_id):
    """Get inviter by ID"""
    inviter = Inviter.get_by_id(inviter_id)
    if not inviter:
        return jsonify({'error': 'Inviter not found'}), 404
    
    # Check access
    if current_user.role != 'admin' and current_user.inviter_group_id != inviter.inviter_group_id:
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify(inviter.to_dict()), 200


@inviters_bp.route('', methods=['POST'])
@login_required
@admin_required
def create_inviter():
    """Create a new inviter"""
    data = request.get_json()
    
    # Validate required fields
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    
    # inviter_group_id is optional - inviters can be created without a group
    inviter_group_id = data.get('inviter_group_id')
    if inviter_group_id:
        # Verify group exists if provided
        group = InviterGroup.get_by_id(inviter_group_id)
        if not group:
            return jsonify({'error': 'Inviter group not found'}), 404
    
    inviter = Inviter(
        name=data['name'],
        email=data.get('email'),
        phone=data.get('phone'),
        position=data.get('position'),
        inviter_group_id=inviter_group_id,
        is_active=data.get('is_active', True)
    )
    
    db.session.add(inviter)
    db.session.commit()
    
    return jsonify(inviter.to_dict()), 201


@inviters_bp.route('/bulk', methods=['POST'])
@login_required
@admin_required
def create_inviters_bulk():
    """Create multiple inviters at once"""
    data = request.get_json()
    
    if not data or not data.get('inviters'):
        return jsonify({'error': 'Inviters list is required'}), 400
    
    if not data.get('inviter_group_id'):
        return jsonify({'error': 'Inviter group is required'}), 400
    
    # Verify group exists
    group = InviterGroup.get_by_id(data['inviter_group_id'])
    if not group:
        return jsonify({'error': 'Inviter group not found'}), 404
    
    created = []
    errors = []
    
    for idx, inviter_data in enumerate(data['inviters']):
        if not inviter_data.get('name'):
            errors.append(f"Row {idx + 1}: Name is required")
            continue
        
        inviter = Inviter(
            name=inviter_data['name'],
            email=inviter_data.get('email'),
            phone=inviter_data.get('phone'),
            position=inviter_data.get('position'),
            inviter_group_id=data['inviter_group_id'],
            is_active=True
        )
        db.session.add(inviter)
        created.append(inviter)
    
    db.session.commit()
    
    return jsonify({
        'message': f'Created {len(created)} inviters',
        'created': [inv.to_dict() for inv in created],
        'errors': errors
    }), 201


@inviters_bp.route('/<int:inviter_id>', methods=['PUT'])
@login_required
@admin_required
def update_inviter(inviter_id):
    """Update inviter information"""
    inviter = Inviter.get_by_id(inviter_id)
    if not inviter:
        return jsonify({'error': 'Inviter not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        inviter.name = data['name']
    if 'email' in data:
        inviter.email = data['email']
    if 'phone' in data:
        inviter.phone = data['phone']
    if 'position' in data:
        inviter.position = data['position']
    if 'is_active' in data:
        inviter.is_active = data['is_active']
    if 'inviter_group_id' in data:
        # Allow null to unassign from group
        if data['inviter_group_id'] is None:
            inviter.inviter_group_id = None
        else:
            # Verify new group exists
            group = InviterGroup.get_by_id(data['inviter_group_id'])
            if not group:
                return jsonify({'error': 'Inviter group not found'}), 404
            inviter.inviter_group_id = data['inviter_group_id']
    
    db.session.commit()
    
    return jsonify(inviter.to_dict()), 200


@inviters_bp.route('/<int:inviter_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_inviter(inviter_id):
    """Delete an inviter"""
    from app.models.event_invitee import EventInvitee
    
    inviter = Inviter.get_by_id(inviter_id)
    if not inviter:
        return jsonify({'error': 'Inviter not found'}), 404
    
    # Check if inviter has been used in any invitations
    invitations_count = EventInvitee.query.filter_by(inviter_id=inviter_id).count()
    if invitations_count > 0:
        return jsonify({
            'error': f'Cannot delete inviter. {invitations_count} invitations are linked to this inviter. Deactivate instead.'
        }), 400
    
    db.session.delete(inviter)
    db.session.commit()
    
    return jsonify({'message': 'Inviter deleted successfully'}), 200


@inviters_bp.route('/bulk-delete', methods=['POST'])
@login_required
@admin_required
def bulk_delete_inviters():
    """Bulk delete inviters - removes invitations from active events, preserves ended event records"""
    from app.models.event_invitee import EventInvitee
    from app.models.event import Event
    from datetime import datetime
    
    data = request.get_json()
    if not data or not data.get('inviter_ids'):
        return jsonify({'error': 'Inviter IDs are required'}), 400
    
    inviter_ids = data['inviter_ids']
    deleted_count = 0
    errors = []
    
    for inviter_id in inviter_ids:
        inviter = Inviter.get_by_id(inviter_id)
        if not inviter:
            errors.append(f'Inviter {inviter_id} not found')
            continue
        
        # Get all event invitees linked to this inviter
        event_invitees = EventInvitee.query.filter_by(inviter_id=inviter_id).all()
        
        for ei in event_invitees:
            event = Event.query.get(ei.event_id)
            if event:
                # Check if event has ended
                is_ended = event.status == 'ended' or (event.end_date and event.end_date < datetime.utcnow())
                
                if is_ended:
                    # Preserve the record but set inviter_id to null
                    ei.inviter_id = None
                else:
                    # Delete invitations from active events (ongoing/upcoming/onhold)
                    db.session.delete(ei)
        
        # Delete the inviter
        db.session.delete(inviter)
        deleted_count += 1
    
    db.session.commit()
    
    return jsonify({
        'message': f'Deleted {deleted_count} inviter(s)',
        'deleted': deleted_count,
        'errors': errors
    }), 200
