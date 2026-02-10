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
    def _check_group_permission(event_invitee, approver_user_id, approver_inviter_group_id):
        """
        Check if approver has permission to approve/reject this invitation.
        Returns True if allowed, False otherwise.
        Admins can approve anything.
        Directors can only approve invitations from their group.
        """
        from app.models.user import User
        
        approver = User.query.get(approver_user_id)
        if not approver:
            return False
        
        # Admins can approve anything
        if approver.role == 'admin':
            return True
        
        # Directors must belong to the same group as the inviter
        if approver.role == 'director':
            # First, check if the invitation has an inviter
            if event_invitee.inviter_id and event_invitee.inviter:
                # The inviter's group must match the director's group
                return event_invitee.inviter.inviter_group_id == approver_inviter_group_id
            
            # Fallback: check the submitter's group
            submitter = User.query.get(event_invitee.inviter_user_id)
            if submitter and submitter.inviter_group_id:
                return submitter.inviter_group_id == approver_inviter_group_id
        
        return False
    
    @staticmethod
    def approve_invitations(event_invitee_ids, approver_user_id, approver_role, notes=None, approver_inviter_group_id=None):
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
            
            # Check group permission for directors
            if approver_role == 'director' and not ApprovalService._check_group_permission(
                event_invitee, approver_user_id, approver_inviter_group_id
            ):
                failed_count += 1
                errors.append(f'No permission to approve invitation {ei_id} - not in your group')
                continue
            
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
            
            # Notify submitter
            try:
                from app.services.notification_service import notify_invitation_approved
                notify_invitation_approved(event_invitee, exclude_user_id=approver_user_id)
            except Exception:
                pass
        
        db.session.commit()
        
        return success_count, failed_count, errors
    
    @staticmethod
    def reject_invitations(event_invitee_ids, approver_user_id, approver_role, notes=None, approver_inviter_group_id=None):
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
            
            # Check group permission for directors
            if approver_role == 'director' and not ApprovalService._check_group_permission(
                event_invitee, approver_user_id, approver_inviter_group_id
            ):
                failed_count += 1
                errors.append(f'No permission to reject invitation {ei_id} - not in your group')
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
            
            # Notify submitter
            try:
                from app.services.notification_service import notify_invitation_rejected
                notify_invitation_rejected(event_invitee, notes, exclude_user_id=approver_user_id)
            except Exception:
                pass
        
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
    
    @staticmethod
    def get_approved_invitees(filters=None):
        """Get all approved invitees with optional filters"""
        from app.models.user import User
        from app.models.inviter import Inviter
        from sqlalchemy import or_
        
        query = EventInvitee.query.filter_by(status='approved')
        
        if filters:
            if 'event_id' in filters and filters['event_id']:
                query = query.filter_by(event_id=filters['event_id'])
            
            if 'inviter_group_id' in filters and filters['inviter_group_id']:
                group_id = filters['inviter_group_id']
                # Filter by inviter's group OR submitter's group (for data isolation)
                query = query.outerjoin(Inviter, EventInvitee.inviter_id == Inviter.id)\
                    .outerjoin(User, EventInvitee.inviter_user_id == User.id)\
                    .filter(
                        or_(
                            Inviter.inviter_group_id == group_id,
                            User.inviter_group_id == group_id
                        )
                    )
        
        return query.order_by(EventInvitee.status_date.desc()).all()
    
    @staticmethod
    def cancel_approval(event_invitee_ids, approver_user_id, approver_role, notes, approver_inviter_group_id=None):
        """
        Cancel approval for approved invitees - changes them back to rejected
        Returns (success_count, failed_count, errors)
        """
        from datetime import datetime
        
        success_count = 0
        failed_count = 0
        errors = []
        
        for ei_id in event_invitee_ids:
            event_invitee = EventInvitee.query.get(ei_id)
            
            if not event_invitee:
                failed_count += 1
                errors.append(f'Event invitee {ei_id} not found')
                continue
            
            if event_invitee.status != 'approved':
                failed_count += 1
                errors.append(f'Event invitee {ei_id} is not approved')
                continue
            
            # Check group permission for directors
            if approver_role == 'director' and not ApprovalService._check_group_permission(
                event_invitee, approver_user_id, approver_inviter_group_id
            ):
                failed_count += 1
                errors.append(f'No permission to cancel approval for {ei_id} - not in your group')
                continue
            
            # Change to rejected with the provided notes
            event_invitee.status = 'rejected'
            event_invitee.approved_by_user_id = approver_user_id
            event_invitee.approver_role = approver_role
            event_invitee.approval_notes = notes
            event_invitee.status_date = datetime.utcnow()
            success_count += 1
            
            # Log cancel approval
            AuditLog.log(
                user_id=approver_user_id,
                action='cancel_approval',
                table_name='event_invitees',
                record_id=event_invitee.id,
                old_value='Status: approved',
                new_value=f'Status: rejected - {notes}',
                ip_address=request.remote_addr
            )
            
            # Notify submitter
            try:
                from app.services.notification_service import notify_invitation_cancelled
                notify_invitation_cancelled(event_invitee, exclude_user_id=approver_user_id)
            except Exception:
                pass
        
        db.session.commit()
        
        return success_count, failed_count, errors
