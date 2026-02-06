"""
Invitee management routes
Endpoints for managing invitees and event invitations
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.utils.decorators import admin_required
from app.services.invitee_service import InviteeService
from app.utils.helpers import get_filters_from_request
from app.models.invitee import INVITEE_CATEGORIES

invitees_bp = Blueprint('invitees', __name__, url_prefix='/api/invitees')


@invitees_bp.route('/categories', methods=['GET'])
@login_required
def get_categories():
    """Get category options"""
    from app.models.category import Category
    categories = Category.query.filter_by(is_active=True).order_by(Category.name).all()
    # Return names for backward compatibility with frontend options
    return jsonify([c.name for c in categories]), 200


@invitees_bp.route('', methods=['GET'])
@login_required
def get_all_invitees():
    """Get all invitees - filtered by inviter group for non-admins"""
    from app.models.invitee import Invitee
    from app.models.event_invitee import EventInvitee
    from sqlalchemy import func
    
    # Base query
    query = Invitee.query
    
    # Admins see all, others see only their group's invitees
    if current_user.role != 'admin':
        if current_user.inviter_group_id:
            query = query.filter_by(inviter_group_id=current_user.inviter_group_id)
        else:
            return jsonify([]), 200  # No group, no invitees
    else:
        # Admin can filter by group
        group_id = request.args.get('inviter_group_id', type=int)
        if group_id:
            query = query.filter_by(inviter_group_id=group_id)
    
    # Check if contact details should be included (default False for privacy)
    include_contact_details = request.args.get('include_contact_details', 'false').lower() == 'true'
    
    invitees = query.order_by(Invitee.created_at.desc()).all()
    
    # Get event counts for each invitee
    event_counts = db.session.query(
        EventInvitee.invitee_id,
        func.count(EventInvitee.id).label('total_events'),
        func.sum(db.case((EventInvitee.status == 'approved', 1), else_=0)).label('approved_count'),
        func.sum(db.case((EventInvitee.status == 'rejected', 1), else_=0)).label('rejected_count'),
        func.sum(db.case((EventInvitee.status == 'waiting_for_approval', 1), else_=0)).label('pending_count')
    ).group_by(EventInvitee.invitee_id).all()
    
    # Create a lookup dictionary
    counts_lookup = {
        c.invitee_id: {
            'total_events': c.total_events,
            'approved_count': c.approved_count or 0,
            'rejected_count': c.rejected_count or 0,
            'pending_count': c.pending_count or 0
        }
        for c in event_counts
    }
    
    # Build response with statistics
    result = []
    for invitee in invitees:
        inv_dict = invitee.to_dict(include_contact_details=include_contact_details)
        counts = counts_lookup.get(invitee.id, {
            'total_events': 0,
            'approved_count': 0,
            'rejected_count': 0,
            'pending_count': 0
        })
        inv_dict.update(counts)
        result.append(inv_dict)
    
    return jsonify(result), 200


@invitees_bp.route('', methods=['POST'])
@login_required
def create_contact():
    """Create a new contact for the inviter group WITHOUT adding to any event"""
    from app.models.invitee import Invitee
    from app.models.inviter import Inviter
    from app.models.category import Category
    from app.models.audit_log import AuditLog
    from datetime import datetime
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'email', 'phone']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Non-admins must select an inviter
    if current_user.role != 'admin' and not data.get('inviter_id'):
        return jsonify({'error': 'Inviter is required'}), 400
    
    # Validate inviter belongs to user's group
    inviter_id = data.get('inviter_id')
    if inviter_id and current_user.role != 'admin':
        inviter = Inviter.get_by_id(inviter_id)
        if not inviter or inviter.inviter_group_id != current_user.inviter_group_id:
            return jsonify({'error': 'Invalid inviter selection'}), 400
    
    # Determine the inviter group
    if current_user.role == 'admin':
        # Admin must provide inviter_id to determine group, or we use the inviter's group
        if inviter_id:
            inviter = Inviter.get_by_id(inviter_id)
            if inviter:
                inviter_group_id = inviter.inviter_group_id
            else:
                return jsonify({'error': 'Invalid inviter'}), 400
        else:
            return jsonify({'error': 'Inviter is required'}), 400
    else:
        inviter_group_id = current_user.inviter_group_id
    
    if not inviter_group_id:
        return jsonify({'error': 'Could not determine inviter group'}), 400
    
    # Validate email format
    if not InviteeService.validate_email(data['email']):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Validate phone format
    if not InviteeService.validate_phone(data['phone']):
        return jsonify({'error': 'Invalid phone format. Use international format (e.g., 201012345678)'}), 400
    
    # Clean email
    email = data['email'].lower().strip()
    
    # Check if phone already exists in this group (phone must be unique)
    phone = data['phone']
    existing_by_phone = Invitee.query.filter_by(phone=phone, inviter_group_id=inviter_group_id).first()
    if existing_by_phone:
        return jsonify({'error': f'Phone number {phone} already exists for contact "{existing_by_phone.name}"'}), 400
    
    # Resolve category
    category_id = None
    if data.get('category'):
        category_id = InviteeService._resolve_category_id(data['category'])
    
    # Create the invitee
    invitee = Invitee(
        name=data['name'],
        email=email,
        phone=data['phone'],
        secondary_phone=data.get('secondary_phone'),
        title=data.get('title'),
        address=data.get('address'),
        position=data.get('position'),
        company=data.get('company'),
        notes=data.get('notes'),
        plus_one=data.get('plus_one', 0),
        category_id=category_id,
        inviter_group_id=inviter_group_id,
        inviter_id=inviter_id
    )
    
    db.session.add(invitee)
    db.session.commit()
    
    # Log creation
    AuditLog.log(
        user_id=current_user.id,
        action='create_contact',
        table_name='invitees',
        record_id=invitee.id,
        new_value=f'Created contact {invitee.name}',
        ip_address=request.remote_addr
    )
    db.session.commit()
    
    return jsonify(invitee.to_dict(include_contact_details=True)), 201


@invitees_bp.route('/search', methods=['GET'])
@login_required
def search_invitees():
    """Search invitees"""
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify([]), 200
    
    invitees = InviteeService.search_invitees(query)
    # Exclude contact details from search results for privacy
    return jsonify([invitee.to_dict(include_contact_details=False) for invitee in invitees]), 200


@invitees_bp.route('/<int:invitee_id>', methods=['GET'])
@login_required
def get_invitee(invitee_id):
    """Get invitee by ID"""
    from app.models.invitee import Invitee
    invitee = Invitee.query.get(invitee_id)
    if not invitee:
        return jsonify({'error': 'Invitee not found'}), 404
    # Check if contact details should be included
    include_contact_details = request.args.get('include_contact_details', 'false').lower() == 'true'
    return jsonify(invitee.to_dict(include_contact_details=include_contact_details)), 200

@invitees_bp.route('/<int:invitee_id>/history', methods=['GET'])
@login_required
def get_invitee_history(invitee_id):
    """Get event history for an invitee"""
    from app.models.invitee import Invitee
    from app.models.event_invitee import EventInvitee
    
    invitee = Invitee.query.get(invitee_id)
    if not invitee:
        return jsonify({'error': 'Invitee not found'}), 404
    
    # Get all event invitations for this invitee
    event_invitees = EventInvitee.query.filter_by(invitee_id=invitee_id)\
        .order_by(EventInvitee.created_at.desc()).all()
    
    return jsonify({
        'invitee': invitee.to_dict(include_contact_details=False),
        'events': [ei.to_dict(include_relations=True, include_contact_details=False) for ei in event_invitees]
    }), 200

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
        secondary_phone=data.get('secondary_phone'),
        title=data.get('title'),
        address=data.get('address'),
        position=data.get('position'),
        company=data.get('company'),
        notes=data.get('notes'),
        plus_one=data.get('plus_one'),
        category=data.get('category'),
        inviter_id=data.get('inviter_id'),
        updated_by_user_id=current_user.id
    )
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify(invitee.to_dict(include_contact_details=True)), 200

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

@invitees_bp.route('/bulk', methods=['DELETE'])
@login_required
@admin_required
def delete_invitees_bulk():
    """Delete multiple invitees (admin only)"""
    data = request.get_json()
    invitee_ids = data.get('invitee_ids', [])
    
    if not invitee_ids:
        return jsonify({'error': 'No invitees provided'}), 400
        
    success_count, failed_count, errors = InviteeService.bulk_delete_invitees(invitee_ids, current_user.id)
    
    return jsonify({
        'message': f'Deleted {success_count} invitees',
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors
    }), 200

# Event-specific invitee routes

@invitees_bp.route('/events/<int:event_id>/invitees', methods=['GET'])
@login_required
def get_event_invitees(event_id):
    """Get all invitees for a specific event - visibility based on role"""
    from app.models.event import Event
    from app.models.event_invitee import EventInvitee
    
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    # Check if user has access to this event
    if current_user.role != 'admin':
        if current_user.inviter_group_id:
            # User has access if event is_all_groups OR their group is explicitly assigned
            has_access = event.is_all_groups or any(g.id == current_user.inviter_group_id for g in event.inviter_groups)
            if not has_access:
                return jsonify({'error': 'Access denied'}), 403
        else:
            return jsonify({'error': 'Access denied'}), 403
    
    filters = get_filters_from_request()
    
    # Check if contact details should be included
    include_contact_details = request.args.get('include_contact_details', 'false').lower() == 'true'
    
    # Directors and organizers only see their own group's invitees (isolation)
    if current_user.role != 'admin' and current_user.inviter_group_id:
        filters['inviter_group_id'] = current_user.inviter_group_id
    
    event_invitees = InviteeService.get_invitees_for_event(event_id, filters)
    return jsonify([ei.to_dict(include_relations=True, include_contact_details=include_contact_details) for ei in event_invitees]), 200

@invitees_bp.route('/events/<int:event_id>/invitees', methods=['POST'])
@login_required
def add_invitee_to_event(event_id):
    """Add an invitee to an event - requires inviter selection for non-admins"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'email', 'phone']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Non-admins must select an inviter
    if current_user.role != 'admin' and not data.get('inviter_id'):
        return jsonify({'error': 'Inviter is required'}), 400
    
    # Validate inviter belongs to user's group
    if data.get('inviter_id') and current_user.role != 'admin':
        from app.models.inviter import Inviter
        inviter = Inviter.get_by_id(data['inviter_id'])
        if not inviter or inviter.inviter_group_id != current_user.inviter_group_id:
            return jsonify({'error': 'Invalid inviter selection'}), 400
    
    # Check if user can add invitees to this event
    from app.models.event import Event
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    # Check event is assigned to user's group (or is_all_groups)
    if current_user.role != 'admin':
        if current_user.inviter_group_id:
            has_access = event.is_all_groups or any(g.id == current_user.inviter_group_id for g in event.inviter_groups)
            if not has_access:
                return jsonify({'error': 'Event not assigned to your group'}), 403
        else:
            return jsonify({'error': 'You are not assigned to an inviter group'}), 403
    
    if current_user.role != 'admin' and not event.can_add_invitees():
        return jsonify({'error': 'Cannot add invitees to this event'}), 403
    
    # Cross-group duplicate phone check for event submissions
    from app.models.event_invitee import EventInvitee
    from app.models.invitee import Invitee
    
    phone = data.get('phone')
    if phone and current_user.role != 'admin':
        # Find if any invitee with this phone number is already submitted to this event by ANOTHER group
        # Only block if status is 'waiting_for_approval' or 'approved'
        # Rejected/cancelled submissions free the phone for everyone to submit again
        existing_submission = db.session.query(EventInvitee, Invitee).join(
            Invitee, EventInvitee.invitee_id == Invitee.id
        ).filter(
            EventInvitee.event_id == event_id,
            Invitee.phone == phone,
            Invitee.inviter_group_id != current_user.inviter_group_id,
            EventInvitee.status.in_(['waiting_for_approval', 'approved'])
        ).first()
        
        if existing_submission:
            ei, other_invitee = existing_submission
            from app.models.inviter import Inviter as InviterModel
            inviter_info = InviterModel.query.get(ei.inviter_id) if ei.inviter_id else None
            from app.models.inviter_group import InviterGroup
            group_info = InviterGroup.query.get(other_invitee.inviter_group_id) if other_invitee.inviter_group_id else None
            
            inviter_name = inviter_info.name if inviter_info else 'Unknown Inviter'
            group_name = group_info.name if group_info else 'Another Group'
            
            return jsonify({
                'error': f'"{other_invitee.name}" is already invited to this event by "{inviter_name}" from "{group_name}"'
            }), 409
    
    event_invitee, error = InviteeService.add_invitee_to_event(
        event_id=event_id,
        invitee_data=data,
        inviter_user_id=current_user.id,
        inviter_role=current_user.role,
        inviter_group_id=current_user.inviter_group_id,
        inviter_id=data.get('inviter_id')
    )
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify(event_invitee.to_dict(include_relations=True, include_contact_details=False)), 201

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
    
    return jsonify(updated_ei.to_dict(include_relations=True, include_contact_details=False)), 200

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

@invitees_bp.route('/events/<int:event_id>/invitees/<int:invitee_id>/resubmit', methods=['POST'])
@login_required
def resubmit_invitee(event_id, invitee_id):
    """Resubmit a rejected invitee for approval"""
    from app.models.event_invitee import EventInvitee
    from app.models.event import Event
    from app.models.audit_log import AuditLog
    from datetime import datetime
    
    # Find the event_invitee record
    event_invitee = EventInvitee.query.filter_by(
        event_id=event_id,
        invitee_id=invitee_id
    ).first()
    
    if not event_invitee:
        return jsonify({'error': 'Event invitee not found'}), 404
    
    # Check if the invitee is rejected
    if event_invitee.status != 'rejected':
        return jsonify({'error': 'Only rejected invitations can be resubmitted'}), 400
    
    # Check if event allows adding invitees
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    if not event.can_add_invitees() and current_user.role != 'admin':
        return jsonify({'error': 'Cannot resubmit to this event'}), 403
    
    # Check if user can resubmit:
    # 1. Original inviter can always resubmit
    # 2. Admins can always resubmit
    # 3. If the original inviter was an organizer from same group, directors can also resubmit
    can_resubmit = False
    
    if event_invitee.inviter_user_id == current_user.id:
        # Original inviter can always resubmit
        can_resubmit = True
    elif current_user.role == 'admin':
        # Admins can always resubmit
        can_resubmit = True
    elif current_user.role == 'director' and event_invitee.inviter_role == 'organizer':
        # Directors can resubmit if original inviter was an organizer from same group
        from app.models.user import User
        original_submitter = User.query.get(event_invitee.inviter_user_id)
        if original_submitter and original_submitter.inviter_group_id == current_user.inviter_group_id:
            can_resubmit = True
    
    if not can_resubmit:
        return jsonify({'error': 'You do not have permission to resubmit this invitation'}), 403
    
    data = request.get_json() or {}
    
    # Reset status to waiting_for_approval
    event_invitee.status = 'waiting_for_approval'
    event_invitee.status_date = datetime.utcnow()
    event_invitee.approved_by_user_id = None
    event_invitee.approver_role = None
    event_invitee.approval_notes = None
    
    # Update notes if provided
    if data.get('notes'):
        event_invitee.notes = data.get('notes')
    
    event_invitee.updated_at = datetime.utcnow()
    
    # Log the action
    AuditLog.log(
        user_id=current_user.id,
        action='resubmit_invitation',
        table_name='event_invitees',
        record_id=event_invitee.id,
        old_value=f'Status: rejected',
        new_value=f'Status: waiting_for_approval',
        ip_address=request.remote_addr
    )
    
    db.session.commit()
    
    return jsonify(event_invitee.to_dict(include_relations=True, include_contact_details=False)), 200


@invitees_bp.route('/events/<int:event_id>/invite-existing', methods=['POST'])
@login_required
def invite_existing_to_event(event_id):
    """Invite existing invitees to an event (bulk invite)"""
    from app.models.event import Event
    from app.models.invitee import Invitee
    from app.models.inviter import Inviter
    from app.models.event_invitee import EventInvitee
    from app.models.audit_log import AuditLog
    from app.models.inviter_group import InviterGroup
    from datetime import datetime
    
    data = request.get_json()
    invitee_ids = data.get('invitee_ids', [])
    invitation_data = data.get('invitation_data', {})  # category, inviter_id, notes
    
    if not invitee_ids:
        return jsonify({'error': 'No invitees selected'}), 400
    
    # Check if event exists
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    # Check if user can add invitees to this event
    if current_user.role != 'admin' and not event.can_add_invitees():
        return jsonify({'error': 'Cannot add invitees to this event'}), 403
    
    # Non-admins must select an inviter
    inviter_id = invitation_data.get('inviter_id')
    # We don't enforce inviter_id here globally, as we can use the invitee's existing inviter_id
    
    # Validate inviter belongs to user's group IF PROVIDED
    if inviter_id and current_user.role != 'admin':
        inviter = Inviter.get_by_id(inviter_id)
        if not inviter or inviter.inviter_group_id != current_user.inviter_group_id:
            return jsonify({'error': 'Invalid inviter selection'}), 400
    
    # Check event is assigned to user's group (or is_all_groups)
    if current_user.role != 'admin':
        if current_user.inviter_group_id:
            has_access = event.is_all_groups or any(g.id == current_user.inviter_group_id for g in event.inviter_groups)
            if not has_access:
                return jsonify({'error': 'Event not assigned to your group'}), 403
        else:
            return jsonify({'error': 'You are not assigned to an inviter group'}), 403
    
    results = {
        'successful': [],
        'failed': [],
        'already_invited': [],
        'cross_group_duplicates': []
    }
    
    for invitee_id in invitee_ids:
        # Get the invitee
        invitee = Invitee.query.get(invitee_id)
        if not invitee:
            results['failed'].append({
                'invitee_id': invitee_id,
                'reason': 'Invitee not found'
            })
            continue
        
        # Verify invitee belongs to user's group (isolation check)
        if current_user.role != 'admin':
            if invitee.inviter_group_id != current_user.inviter_group_id:
                results['failed'].append({
                    'invitee_id': invitee_id,
                    'reason': 'Invitee not in your group'
                })
                continue

        # Cross-group duplicate phone check MUST happen FIRST before any submission/resubmission
        # This ensures that even when resubmitting a rejected contact, we check if another group
        # has already submitted the same phone number
        if invitee.phone and current_user.role != 'admin':
            cross_group_existing = db.session.query(EventInvitee, Invitee).join(
                Invitee, EventInvitee.invitee_id == Invitee.id
            ).filter(
                EventInvitee.event_id == event_id,
                Invitee.phone == invitee.phone,
                Invitee.inviter_group_id != current_user.inviter_group_id,
                EventInvitee.status.in_(['waiting_for_approval', 'approved'])
            ).first()
            
            if cross_group_existing:
                ei, other_invitee = cross_group_existing
                inviter_info = Inviter.query.get(ei.inviter_id) if ei.inviter_id else None
                group_info = InviterGroup.query.get(other_invitee.inviter_group_id) if other_invitee.inviter_group_id else None
                
                inviter_name = inviter_info.name if inviter_info else 'Unknown Inviter'
                group_name = group_info.name if group_info else 'Another Group'
                
                results['cross_group_duplicates'].append({
                    'invitee_id': invitee_id,
                    'name': invitee.name,
                    'phone': invitee.phone,
                    'reason': f'Already invited by "{inviter_name}" from "{group_name}"'
                })
                continue

        # Check if already invited to this event (by same invitee record)
        existing = EventInvitee.query.filter_by(event_id=event_id, invitee_id=invitee_id).first()
        if existing:
            # If rejected, allow resubmission by updating status back to pending
            # (cross-group check already passed above)
            if existing.status == 'rejected':
                existing.status = 'waiting_for_approval'
                existing.notes = invitation_data.get('notes', 'Resubmitted after rejection')
                existing.status_date = datetime.utcnow()
                existing.approved_by = None
                existing.approval_notes = None
                results['successful'].append({
                    'invitee_id': invitee_id,
                    'name': invitee.name,
                    'event_invitee_id': existing.id,
                    'resubmitted': True
                })
                continue
            else:
                results['already_invited'].append({
                    'invitee_id': invitee_id,
                    'name': invitee.name,
                    'status': existing.status
                })
                continue

        # New submission - cross-group check already passed above

        # Use stored data from invitee if not provided
        final_inviter_id = inviter_id or invitee.inviter_id
        
        # Resolve category
        final_category_id = None
        if invitation_data.get('category'):
            final_category_id = InviteeService._resolve_category_id(invitation_data.get('category'))
        else:
            final_category_id = invitee.category_id

        final_plus_one = invitation_data.get('plus_one', invitee.plus_one) if invitation_data.get('plus_one') is not None else invitee.plus_one

        # Create event_invitee record
        event_invitee = EventInvitee(
            event_id=event_id,
            invitee_id=invitee.id,
            category_id=final_category_id,
            inviter_id=final_inviter_id,
            inviter_user_id=current_user.id,
            inviter_role=current_user.role,
            status='waiting_for_approval',
            plus_one=final_plus_one,
            notes=invitation_data.get('notes')
        )

        db.session.add(event_invitee)

        results['successful'].append({
            'invitee_id': invitee_id,
            'name': invitee.name,
            'event_invitee_id': None  # Will be set after commit
        })
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    
    # Log the bulk invite action
    if results['successful']:
        AuditLog.log(
            user_id=current_user.id,
            action='bulk_invite_to_event',
            table_name='event_invitees',
            record_id=event_id,
            new_value=f'Added {len(results["successful"])} invitees to event {event.name}',
            ip_address=request.remote_addr
        )
        db.session.commit()
    
    return jsonify({
        'message': f'Invited {len(results["successful"])} invitees',
        'results': results
    }), 201
