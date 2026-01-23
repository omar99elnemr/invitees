"""
Approval service
Handles invitation approval workflow
"""
from flask import request
from app import db
from app.models.event_invitee import EventInvitee
from app.models.audit_log import AuditLog

class ApprovalService:
    """Service for approval workflow operations"""
    
    @staticmethod
    def get_pending_approvals(filters=None):
        """Get all pending approvals with optional filters"""
        return EventInvitee.get_pending_approvals(filters)
    
    @staticmethod
    def approve_invitations(event_invitee_ids, approver_user_id, approver_role, notes=None):
        """
        Approve one or more invitations
        Returns (success_count, failed_count, errors)
        """
        success_count = 0
        failed_count = 0
        errors = []
        
        for ei_id in event_invitee_ids:
            event_invitee = EventInvitee.query.get(ei_id)
            
            if not event_invitee:
                failed_count += 1
                errors.append(f'Event invitee {ei_id} not found')
                continue
            
            if event_invitee.status != 'waiting_for_approval':
                failed_count += 1
                errors.append(f'Event invitee {ei_id} is not pending approval')
                continue
            
            # Check if approver is not the same as inviter (optional business rule)
            # Uncomment if you want to prevent self-approval
            # if event_invitee.inviter_user_id == approver_user_id:
            #     failed_count += 1
            #     errors.append(f'Cannot approve your own invitation (ID: {ei_id})')
            #     continue
            
            # Approve
            event_invitee.approve(approver_user_id, approver_role, notes)
            success_count += 1
            
            # Log approval
            AuditLog.log(
                user_id=approver_user_id,
                action='approve_invitation',
                table_name='event_invitees',
                record_id=event_invitee.id,
                new_value=f'Approved invitation for {event_invitee.invitee.name} to {event_invitee.event.name}',
                ip_address=request.remote_addr
            )
        
        db.session.commit()
        
        return success_count, failed_count, errors
    
    @staticmethod
    def reject_invitations(event_invitee_ids, approver_user_id, approver_role, notes=None):
        """
        Reject one or more invitations
        Returns (success_count, failed_count, errors)
        """
        success_count = 0
        failed_count = 0
        errors = []
        
        for ei_id in event_invitee_ids:
            event_invitee = EventInvitee.query.get(ei_id)
            
            if not event_invitee:
                failed_count += 1
                errors.append(f'Event invitee {ei_id} not found')
                continue
            
            if event_invitee.status != 'waiting_for_approval':
                failed_count += 1
                errors.append(f'Event invitee {ei_id} is not pending approval')
                continue
            
            # Reject
            event_invitee.reject(approver_user_id, approver_role, notes)
            success_count += 1
            
            # Log rejection
            AuditLog.log(
                user_id=approver_user_id,
                action='reject_invitation',
                table_name='event_invitees',
                record_id=event_invitee.id,
                new_value=f'Rejected invitation for {event_invitee.invitee.name} to {event_invitee.event.name}',
                ip_address=request.remote_addr
            )
        
        db.session.commit()
        
        return success_count, failed_count, errors
    
    @staticmethod
    def get_approval_history(invitee_id):
        """Get approval history for an invitee"""
        return EventInvitee.query.filter_by(invitee_id=invitee_id).order_by(EventInvitee.status_date.desc()).all()
    
    @staticmethod
    def get_approvals_by_approver(approver_user_id, limit=100):
        """Get approvals made by a specific approver"""
        return EventInvitee.query.filter(
            EventInvitee.approved_by_user_id == approver_user_id,
            EventInvitee.status.in_(['approved', 'rejected'])
        ).order_by(EventInvitee.status_date.desc()).limit(limit).all()
