"""
Inviter groups routes
Endpoints for managing inviter groups
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.utils.decorators import admin_required
from app import db
from app.models.inviter_group import InviterGroup

inviter_groups_bp = Blueprint('inviter_groups', __name__, url_prefix='/api/inviter-groups')

@inviter_groups_bp.route('', methods=['GET'])
@login_required
def get_inviter_groups():
    """Get all inviter groups"""
    groups = InviterGroup.get_all()
    return jsonify([group.to_dict() for group in groups]), 200

@inviter_groups_bp.route('/<int:group_id>', methods=['GET'])
@login_required
def get_inviter_group(group_id):
    """Get inviter group by ID"""
    group = InviterGroup.get_by_id(group_id)
    if not group:
        return jsonify({'error': 'Inviter group not found'}), 404
    return jsonify(group.to_dict()), 200

@inviter_groups_bp.route('', methods=['POST'])
@login_required
@admin_required
def create_inviter_group():
    """Create a new inviter group"""
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
    db.session.commit()
    
    return jsonify(group.to_dict()), 201

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
