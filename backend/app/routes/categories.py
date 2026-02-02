"""
Category management routes
Endpoints for managing categories
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.utils.decorators import admin_required
from app.models.category import Category
from app.models.invitee import Invitee
from app.models.event_invitee import EventInvitee

categories_bp = Blueprint('categories', __name__, url_prefix='/api/categories')

@categories_bp.route('', methods=['GET'])
@login_required
def get_categories():
    """Get all categories (with optional active_only filter)"""
    active_only = request.args.get('active_only', 'false').lower() == 'true'
    
    query = Category.query
    if active_only:
        query = query.filter_by(is_active=True)
        
    categories = query.order_by(Category.name).all()
    return jsonify([c.to_dict() for c in categories]), 200

@categories_bp.route('', methods=['POST'])
@login_required
@admin_required
def create_category():
    """Create a new category (admin only)"""
    data = request.get_json()
    name = data.get('name')
    
    if not name:
        return jsonify({'error': 'Name is required'}), 400
        
    name = name.strip()
    if Category.query.filter(Category.name.ilike(name)).first():
        return jsonify({'error': 'Category with this name already exists'}), 400
        
    category = Category(name=name)
    db.session.add(category)
    db.session.commit()
    
    return jsonify(category.to_dict()), 201

@categories_bp.route('/<int:category_id>', methods=['PUT'])
@login_required
@admin_required
def update_category(category_id):
    """Update category name (admin only)"""
    category = Category.query.get_or_404(category_id)
    data = request.get_json()
    name = data.get('name')
    
    if not name:
        return jsonify({'error': 'Name is required'}), 400
        
    name = name.strip()
    existing = Category.query.filter(Category.name.ilike(name)).first()
    if existing and existing.id != category_id:
        return jsonify({'error': 'Category with this name already exists'}), 400
        
    category.name = name
    db.session.commit()
    return jsonify(category.to_dict()), 200

@categories_bp.route('/<int:category_id>/toggle', methods=['PATCH'])
@login_required
@admin_required
def toggle_category(category_id):
    """Toggle category active status (admin only)"""
    category = Category.query.get_or_404(category_id)
    category.is_active = not category.is_active
    db.session.commit()
    return jsonify(category.to_dict()), 200

@categories_bp.route('/<int:category_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_category(category_id):
    """Delete category (admin only) - only if unused"""
    category = Category.query.get_or_404(category_id)
    
    # Check usage
    invitee_count = Invitee.query.filter_by(category_id=category_id).count()
    event_invitee_count = EventInvitee.query.filter_by(category_id=category_id).count()
    
    if invitee_count > 0 or event_invitee_count > 0:
        return jsonify({
            'error': 'Cannot delete category that is in use',
            'usage': {
                'contacts': invitee_count,
                'event_invitations': event_invitee_count
            }
        }), 400
        
    db.session.delete(category)
    db.session.commit()
    return jsonify({'message': 'Category deleted successfully'}), 200

@categories_bp.route('/<int:category_id>/usage', methods=['GET'])
@login_required
@admin_required
def get_category_usage(category_id):
    """Get category usage statistics"""
    invitee_count = Invitee.query.filter_by(category_id=category_id).count()
    event_invitee_count = EventInvitee.query.filter_by(category_id=category_id).count()
    
    return jsonify({
        'contacts': invitee_count,
        'event_invitations': event_invitee_count
    }), 200
