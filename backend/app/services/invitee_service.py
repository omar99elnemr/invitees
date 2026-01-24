"""
Invitee service
Handles invitee management operations
"""
from flask import request
from app import db
from app.models.invitee import Invitee
from app.models.event_invitee import EventInvitee
from app.models.event import Event
from app.models.audit_log import AuditLog
from datetime import datetime
import re

class InviteeService:
    """Service for invitee management operations"""
    
    @staticmethod
    def validate_email(email):
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_phone(phone):
        """Validate phone format (E.164 international format)"""
        # Remove spaces and dashes
        clean_phone = phone.replace(' ', '').replace('-', '')
        # Check if it matches international format
        pattern = r'^\+?[1-9]\d{1,14}$'
        return re.match(pattern, clean_phone) is not None
    
    @staticmethod
    def create_or_get_invitee(name, email, phone, position=None, company=None, category=None, inviter_group_id=None):
        """
        Create new invitee or get existing one by email within the same inviter group
        Returns (invitee, created, error_message)
        """
        # Validate email
        if not InviteeService.validate_email(email):
            return None, False, 'Invalid email format'
        
        # Validate phone
        if not InviteeService.validate_phone(phone):
            return None, False, 'Invalid phone format. Use international format (e.g., +20 123 456 7890)'
        
        # Clean email
        email = email.lower().strip()
        
        # Check if invitee exists within the same group
        query = Invitee.query.filter_by(email=email)
        if inviter_group_id:
            query = query.filter_by(inviter_group_id=inviter_group_id)
        invitee = query.first()
        
        if invitee:
            # Update existing invitee with new info if provided
            updated = False
            if position and position != invitee.position:
                invitee.position = position
                updated = True
            if company and company != invitee.company:
                invitee.company = company
                updated = True
            if name and name != invitee.name:
                invitee.name = name
                updated = True
            if phone and phone != invitee.phone:
                invitee.phone = phone
                updated = True
            if category and category != invitee.category:
                invitee.category = category
                updated = True
            
            if updated:
                invitee.updated_at = datetime.utcnow()
                db.session.commit()
            
            return invitee, False, None
        
        # Create new invitee
        invitee = Invitee(
            name=name,
            email=email,
            phone=phone,
            position=position,
            company=company,
            category=category,
            inviter_group_id=inviter_group_id
        )
        
        db.session.add(invitee)
        db.session.commit()
        
        return invitee, True, None
    
    @staticmethod
    def add_invitee_to_event(event_id, invitee_data, inviter_user_id, inviter_role, inviter_group_id, inviter_id=None):
        """
        Add an invitee to an event
        Returns (event_invitee, error_message)
        """
        # Check if event exists
        event = Event.query.get(event_id)
        if not event:
            return None, 'Event not found'
        
        # Check if event allows adding invitees
        if not event.can_add_invitees():
            return None, 'Cannot add invitees to this event (event has ended or is cancelled)'
        
        # Create or get invitee - associates with inviter group
        invitee, created, error = InviteeService.create_or_get_invitee(
            name=invitee_data['name'],
            email=invitee_data['email'],
            phone=invitee_data['phone'],
            position=invitee_data.get('position'),
            company=invitee_data.get('company'),
            category=invitee_data.get('category'),
            inviter_group_id=inviter_group_id
        )
        
        if error:
            return None, error
        
        # Check if already invited to this event
        existing = EventInvitee.query.filter_by(event_id=event_id, invitee_id=invitee.id).first()
        if existing:
            return None, f'{invitee.name} is already invited to this event'
        
        # Create event_invitee record
        event_invitee = EventInvitee(
            event_id=event_id,
            invitee_id=invitee.id,
            category=invitee_data.get('category'),
            inviter_id=inviter_id,
            inviter_user_id=inviter_user_id,
            inviter_role=inviter_role,
            status='waiting_for_approval',
            notes=invitee_data.get('notes')
        )
        
        db.session.add(event_invitee)
        db.session.commit()
        
        # Log creation
        AuditLog.log(
            user_id=inviter_user_id,
            action='add_invitee_to_event',
            table_name='event_invitees',
            record_id=event_invitee.id,
            new_value=f'Added {invitee.name} to event {event.name}',
            ip_address=request.remote_addr
        )
        db.session.commit()
        
        return event_invitee, None
    
    @staticmethod
    def update_invitee(invitee_id, name=None, email=None, phone=None, position=None, company=None, updated_by_user_id=None):
        """
        Update invitee information
        Returns (invitee, error_message)
        """
        invitee = Invitee.query.get(invitee_id)
        if not invitee:
            return None, 'Invitee not found'
        
        old_value = invitee.to_dict()
        
        # Update fields
        if name:
            invitee.name = name
        
        if email and email != invitee.email:
            if not InviteeService.validate_email(email):
                return None, 'Invalid email format'
            # Check if new email already exists
            existing = Invitee.find_by_email(email)
            if existing and existing.id != invitee_id:
                return None, 'Email already exists for another invitee'
            invitee.email = email.lower().strip()
        
        if phone:
            if not InviteeService.validate_phone(phone):
                return None, 'Invalid phone format'
            invitee.phone = phone
        
        if position is not None:
            invitee.position = position
        
        if company is not None:
            invitee.company = company
        
        invitee.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log update
        if updated_by_user_id:
            AuditLog.log(
                user_id=updated_by_user_id,
                action='update_invitee',
                table_name='invitees',
                record_id=invitee.id,
                old_value=str(old_value),
                new_value=str(invitee.to_dict()),
                ip_address=request.remote_addr
            )
            db.session.commit()
        
        return invitee, None
    
    @staticmethod
    def update_event_invitee(event_invitee_id, updates, updated_by_user_id):
        """
        Update event invitee record
        Returns (event_invitee, error_message)
        """
        event_invitee = EventInvitee.query.get(event_invitee_id)
        if not event_invitee:
            return None, 'Event invitee not found'
        
        old_value = event_invitee.to_dict()
        
        # Update allowed fields
        if 'category' in updates:
            # Validate category
            if updates['category'] and updates['category'] not in ['White', 'Gold']:
                return None, 'Invalid category. Must be White or Gold'
            event_invitee.category = updates['category']
        
        if 'inviter_id' in updates:
            event_invitee.inviter_id = updates['inviter_id']
        
        if 'is_going' in updates:
            if updates['is_going'] not in ('yes', 'no', 'maybe', None):
                return None, 'Invalid is_going value'
            event_invitee.is_going = updates['is_going']
        
        if 'plus_one' in updates:
            event_invitee.plus_one = updates['plus_one']
        
        if 'notes' in updates:
            event_invitee.notes = updates['notes']
        
        event_invitee.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log update
        AuditLog.log(
            user_id=updated_by_user_id,
            action='update_event_invitee',
            table_name='event_invitees',
            record_id=event_invitee.id,
            old_value=str(old_value),
            new_value=str(event_invitee.to_dict()),
            ip_address=request.remote_addr
        )
        db.session.commit()
        
        return event_invitee, None
    
    @staticmethod
    def delete_invitee(invitee_id, deleted_by_user_id):
        """
        Delete an invitee (admin only)
        Returns (success, error_message)
        """
        invitee = Invitee.query.get(invitee_id)
        if not invitee:
            return False, 'Invitee not found'
        
        invitee_name = invitee.name
        
        # Log deletion
        AuditLog.log(
            user_id=deleted_by_user_id,
            action='delete_invitee',
            table_name='invitees',
            record_id=invitee.id,
            old_value=f'Deleted invitee {invitee_name}',
            ip_address=request.remote_addr
        )
        
        # Delete will cascade to event_invitees
        db.session.delete(invitee)
        db.session.commit()
        
        return True, None
    
    @staticmethod
    def remove_invitee_from_event(event_id, invitee_id, removed_by_user_id):
        """
        Remove invitee from specific event (admin only)
        Returns (success, error_message)
        """
        event_invitee = EventInvitee.query.filter_by(event_id=event_id, invitee_id=invitee_id).first()
        if not event_invitee:
            return False, 'Invitee not found in this event'
        
        # Log removal
        AuditLog.log(
            user_id=removed_by_user_id,
            action='remove_invitee_from_event',
            table_name='event_invitees',
            record_id=event_invitee.id,
            old_value=f'Removed invitee {event_invitee.invitee.name} from event {event_invitee.event.name}',
            ip_address=request.remote_addr
        )
        
        db.session.delete(event_invitee)
        db.session.commit()
        
        return True, None
    
    @staticmethod
    def get_all_invitees():
        """Get all invitees"""
        return Invitee.query.order_by(Invitee.name).all()
    
    @staticmethod
    def get_invitees_for_event(event_id, filters=None):
        """Get invitees for a specific event with optional filters"""
        return EventInvitee.get_for_event(event_id, filters)
    
    @staticmethod
    def search_invitees(query):
        """Search invitees"""
        return Invitee.search(query)
