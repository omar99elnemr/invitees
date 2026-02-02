"""
Inviter groups routes
Endpoints for managing inviter groups
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.utils.decorators import admin_required
from app import db
from app.models.inviter_group import InviterGroup
from app.models.inviter import Inviter

inviter_groups_bp = Blueprint('inviter_groups', __name__, url_prefix='/api/inviter-groups')

@inviter_groups_bp.route('', methods=['GET'])
@login_required
def get_inviter_groups():
    """Get all inviter groups"""
    groups = InviterGroup.get_all()
    result = []
    for group in groups:
        group_dict = group.to_dict()
        # Add inviter count
        group_dict['inviter_count'] = Inviter.query.filter_by(inviter_group_id=group.id, is_active=True).count()
        # Add invitee count
        from app.models.invitee import Invitee
        group_dict['invitee_count'] = Invitee.query.filter_by(inviter_group_id=group.id).count()
        result.append(group_dict)
    return jsonify(result), 200

@inviter_groups_bp.route('/<int:group_id>', methods=['GET'])
@login_required
def get_inviter_group(group_id):
    """Get inviter group by ID with details"""
    group = InviterGroup.get_by_id(group_id)
    if not group:
        return jsonify({'error': 'Inviter group not found'}), 404
    
    group_dict = group.to_dict()
    
    # Add inviters list
    inviters = Inviter.get_by_group(group_id, active_only=False)
    group_dict['inviters'] = [inv.to_dict() for inv in inviters]
    
    # Add invitee count
    from app.models.invitee import Invitee
    group_dict['invitee_count'] = Invitee.query.filter_by(inviter_group_id=group.id).count()
    
    return jsonify(group_dict), 200

@inviter_groups_bp.route('', methods=['POST'])
@login_required
@admin_required
def create_inviter_group():
    """Create a new inviter group with optional inviters"""
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Group name is required'}), 400
    
    # Check if group name already exists
    if InviterGroup.get_by_name(data['name']):
        return jsonify({'error': 'Group name already exists'}), 400
    
    group = InviterGroup(
        name=data['name'],
        description=data.get('description')
    )
    
    db.session.add(group)
    db.session.flush()  # Get the group ID
    
    # Create inviters if provided
    created_inviters = []
    if data.get('inviters'):
        for inviter_data in data['inviters']:
            if inviter_data.get('name'):
                inviter = Inviter(
                    name=inviter_data['name'],
                    email=inviter_data.get('email'),
                    phone=inviter_data.get('phone'),
                    position=inviter_data.get('position'),
                    inviter_group_id=group.id,
                    is_active=True
                )
                db.session.add(inviter)
                created_inviters.append(inviter)
    
    db.session.commit()
    
    result = group.to_dict()
    result['inviters'] = [inv.to_dict() for inv in created_inviters]
    
    return jsonify(result), 201

@inviter_groups_bp.route('/<int:group_id>', methods=['PUT'])
@login_required
@admin_required
def update_inviter_group(group_id):
    """Update inviter group"""
    group = InviterGroup.get_by_id(group_id)
    if not group:
        return jsonify({'error': 'Inviter group not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data and data['name'] != group.name:
        # Check if new name already exists
        if InviterGroup.get_by_name(data['name']):
            return jsonify({'error': 'Group name already exists'}), 400
        group.name = data['name']
    
    if 'description' in data:
        group.description = data['description']
    
    db.session.commit()
    
    return jsonify(group.to_dict()), 200

@inviter_groups_bp.route('/<int:group_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_inviter_group(group_id):
    """Delete inviter group (admin only)"""
    from app.models.user import User
    
    group = InviterGroup.get_by_id(group_id)
    if not group:
        return jsonify({'error': 'Inviter group not found'}), 404
    
    # Check if there are users in this group
    users_in_group = User.query.filter_by(inviter_group_id=group_id).count()
    if users_in_group > 0:
        return jsonify({'error': f'Cannot delete group. {users_in_group} users are assigned to this group.'}), 400
    
    db.session.delete(group)
    db.session.commit()
    
    return jsonify({'message': 'Inviter group deleted successfully'}), 200
