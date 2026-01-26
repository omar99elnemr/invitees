"""
Approval workflow routes
Endpoints for managing invitation approvals
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.utils.decorators import director_or_admin_required
from app.services.approval_service import ApprovalService
from app.utils.helpers import get_filters_from_request

approvals_bp = Blueprint('approvals', __name__, url_prefix='/api/approvals')

@approvals_bp.route('/pending', methods=['GET'])
@login_required
@director_or_admin_required
def get_pending_approvals():
    """Get all pending approvals with optional filters"""
    filters = get_filters_from_request()
    
    # Directors only see pending for events assigned to their group
    if current_user.role == 'director' and current_user.inviter_group_id:
        filters['inviter_group_id'] = current_user.inviter_group_id
    
    pending = ApprovalService.get_pending_approvals(filters)
    # Check if contact details should be included
    include_contact_details = request.args.get('include_contact_details', 'false').lower() == 'true'
    return jsonify([p.to_dict(include_relations=True, include_contact_details=include_contact_details) for p in pending]), 200

@approvals_bp.route('/approved', methods=['GET'])
@login_required
@director_or_admin_required
def get_approved_invitees():
    """Get approved invitees per event - for directors to manage"""
    filters = get_filters_from_request()
    
    # Directors only see their group's approved invitees
    if current_user.role == 'director' and current_user.inviter_group_id:
        filters['inviter_group_id'] = current_user.inviter_group_id
    
    approved = ApprovalService.get_approved_invitees(filters)
    # Check if contact details should be included
    include_contact_details = request.args.get('include_contact_details', 'false').lower() == 'true'
    return jsonify([a.to_dict(include_relations=True, include_contact_details=include_contact_details) for a in approved]), 200

@approvals_bp.route('/approve', methods=['POST'])
@login_required
@director_or_admin_required
def approve_invitations():
    """Approve one or more invitations"""
    data = request.get_json()
    
    if not data or not data.get('event_invitee_ids'):
        return jsonify({'error': 'event_invitee_ids is required'}), 400
    
    if not isinstance(data['event_invitee_ids'], list):
        return jsonify({'error': 'event_invitee_ids must be an array'}), 400
    
    success_count, failed_count, errors = ApprovalService.approve_invitations(
        event_invitee_ids=data['event_invitee_ids'],
        approver_user_id=current_user.id,
        approver_role=current_user.role,
        notes=data.get('notes'),
        approver_inviter_group_id=current_user.inviter_group_id
    )
    
    return jsonify({
        'message': f'Approved {success_count} invitation(s)',
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors
    }), 200

@approvals_bp.route('/reject', methods=['POST'])
@login_required
@director_or_admin_required
def reject_invitations():
    """Reject one or more invitations"""
    data = request.get_json()
    
    if not data or not data.get('event_invitee_ids'):
        return jsonify({'error': 'event_invitee_ids is required'}), 400
    
    if not isinstance(data['event_invitee_ids'], list):
        return jsonify({'error': 'event_invitee_ids must be an array'}), 400
    
    success_count, failed_count, errors = ApprovalService.reject_invitations(
        event_invitee_ids=data['event_invitee_ids'],
        approver_user_id=current_user.id,
        approver_role=current_user.role,
        notes=data.get('notes'),
        approver_inviter_group_id=current_user.inviter_group_id
    )
    
    return jsonify({
        'message': f'Rejected {success_count} invitation(s)',
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors
    }), 200

@approvals_bp.route('/cancel-approval', methods=['POST'])
@login_required
@director_or_admin_required
def cancel_approval():
    """Cancel approval for an approved invitee (changes back to rejected)"""
    data = request.get_json()
    
    if not data or not data.get('event_invitee_ids'):
        return jsonify({'error': 'event_invitee_ids is required'}), 400
    
    if not isinstance(data['event_invitee_ids'], list):
        return jsonify({'error': 'event_invitee_ids must be an array'}), 400
    
    # Notes are required for cancel approval (rejection reason)
    if not data.get('notes'):
        return jsonify({'error': 'Rejection notes are required when cancelling approval'}), 400
    
    success_count, failed_count, errors = ApprovalService.cancel_approval(
        event_invitee_ids=data['event_invitee_ids'],
        approver_user_id=current_user.id,
        approver_role=current_user.role,
        notes=data.get('notes'),
        approver_inviter_group_id=current_user.inviter_group_id
    )
    
    return jsonify({
        'message': f'Cancelled approval for {success_count} invitation(s)',
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors
    }), 200

@approvals_bp.route('/history/<int:invitee_id>', methods=['GET'])
@login_required
@director_or_admin_required
def get_approval_history(invitee_id):
    """Get approval history for an invitee"""
    history = ApprovalService.get_approval_history(invitee_id)
    return jsonify([h.to_dict(include_relations=True, include_contact_details=False) for h in history]), 200

@approvals_bp.route('/my-approvals', methods=['GET'])
@login_required
@director_or_admin_required
def get_my_approvals():
    """Get approvals made by current user"""
    limit = request.args.get('limit', 100, type=int)
    approvals = ApprovalService.get_approvals_by_approver(current_user.id, limit)
    return jsonify([a.to_dict(include_relations=True, include_contact_details=False) for a in approvals]), 200
