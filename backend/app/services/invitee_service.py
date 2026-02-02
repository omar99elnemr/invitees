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
from app.models.category import Category
import re

class InviteeService:
    """Service for invitee management operations"""
    
    @staticmethod
    def _resolve_category_id(category_input):
        """Resolve category input (id or name) to category_id"""
        if not category_input:
            return None
            
        if isinstance(category_input, int):
            # Verify it exists
            if Category.query.get(category_input):
                return category_input
            return None
            
        if isinstance(category_input, str):
            # Lookup by name
            category = Category.query.filter(Category.name.ilike(category_input)).first()
            return category.id if category else None
            
        return None
    
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
        
        # Check if phone already exists in the group (phone must be unique within group)
        if phone:
            phone_query = Invitee.query.filter_by(phone=phone)
            if inviter_group_id:
                phone_query = phone_query.filter_by(inviter_group_id=inviter_group_id)
            existing_by_phone = phone_query.first()
            if existing_by_phone:
                return None, False, f'Phone number {phone} already exists for contact "{existing_by_phone.name}"'
        
        # Check if invitee exists by email within the same group (for updating existing)
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
            if category:
                cat_id = InviteeService._resolve_category_id(category)
                if cat_id and cat_id != invitee.category_id:
                    invitee.category_id = cat_id
                    updated = True
                elif not cat_id and category: 
                     # Provided category but couldn't resolve - ignore or error? 
                     # Original implementation just set the string. 
                     # For now, if invalid category name provided, we ignore it to avoid breaking data or raise error?
                     # Let's ignore to be safe but ideally should error?
                     # Req says "Validation... Prevent duplicate". 
                     # If I ignore, it keeps old value.
                     pass
            
            if updated:
                invitee.updated_at = datetime.utcnow()
                db.session.commit()
            
            return invitee, False, None
        
        # Create new invitee
        invitee = Invitee(
            name=name,
            email=email,
            phone=phone,
            category_id=InviteeService._resolve_category_id(category),
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
            category_id=InviteeService._resolve_category_id(invitee_data.get('category')),
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
    def update_invitee(invitee_id, name=None, email=None, phone=None, secondary_phone=None, 
                       title=None, address=None, position=None, company=None, notes=None,
                       plus_one=None, category=None, inviter_id=None, updated_by_user_id=None):
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
        
        # Handle new fields
        if secondary_phone is not None:
            invitee.secondary_phone = secondary_phone if secondary_phone else None
        
        if title is not None:
            invitee.title = title if title else None
        
        if address is not None:
            invitee.address = address if address else None
        
        if position is not None:
            invitee.position = position
        
        if company is not None:
            invitee.company = company
        
        if notes is not None:
            invitee.notes = notes if notes else None
        
        if plus_one is not None:
            invitee.plus_one = plus_one if plus_one else 0
        
        # Handle category update
        if category is not None:
            if category == '' or category is None:
                invitee.category_id = None
            else:
                cat_id = InviteeService._resolve_category_id(category)
                invitee.category_id = cat_id
        
        # Handle inviter_id update
        if inviter_id is not None:
            invitee.inviter_id = inviter_id if inviter_id else None
        
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
            cat_id = InviteeService._resolve_category_id(updates['category'])
            if updates['category'] and not cat_id:
                return None, 'Invalid category'
            event_invitee.category_id = cat_id
        
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
        - Removes from non-ended events (upcoming/ongoing/onhold)
        - Preserves records for ended events (for reporting)
        - Only deletes invitee record if no event records remain
        Returns (success, error_message)
        """
        from app.models.event import Event
        
        invitee = Invitee.query.get(invitee_id)
        if not invitee:
            return False, 'Invitee not found'
        
        invitee_name = invitee.name
        
        # Get all event_invitee records for this invitee
        event_invitees = EventInvitee.query.filter_by(invitee_id=invitee_id).all()
        
        # Separate into ended vs active events
        ended_count = 0
        removed_count = 0
        
        for ei in event_invitees:
            event = Event.query.get(ei.event_id)
            if event and event.status == 'ended':
                # Preserve record for ended events (reporting)
                ended_count += 1
            else:
                # Remove from active events
                db.session.delete(ei)
                removed_count += 1
        
        # Log the action
        AuditLog.log(
            user_id=deleted_by_user_id,
            action='delete_invitee',
            table_name='invitees',
            record_id=invitee.id,
            old_value=f'Deleted invitee {invitee_name} (removed from {removed_count} active events, preserved in {ended_count} ended events)',
            ip_address=request.remote_addr
        )
        
        # Only delete invitee record if no event records remain
        if ended_count == 0:
            db.session.delete(invitee)
        
        db.session.commit()
        
        return True, None
    
    @staticmethod
    def bulk_delete_invitees(invitee_ids, deleted_by_user_id):
        """
        Delete multiple invitees (admin only)
        - Removes from non-ended events (upcoming/ongoing/onhold)
        - Preserves records for ended events (for reporting)
        - Only deletes invitee record if no event records remain
        Returns (success_count, failed_count, errors)
        """
        from app.models.event import Event
        
        success_count = 0
        failed_count = 0
        errors = []
        
        for invitee_id in invitee_ids:
            invitee = Invitee.query.get(invitee_id)
            if not invitee:
                failed_count += 1
                errors.append(f'Invitee {invitee_id} not found')
                continue
            
            try:
                invitee_name = invitee.name
                
                # Get all event_invitee records for this invitee
                event_invitees = EventInvitee.query.filter_by(invitee_id=invitee_id).all()
                
                # Separate into ended vs active events
                ended_count = 0
                removed_count = 0
                
                for ei in event_invitees:
                    event = Event.query.get(ei.event_id)
                    if event and event.status == 'ended':
                        ended_count += 1
                    else:
                        db.session.delete(ei)
                        removed_count += 1
                
                # Log deletion
                AuditLog.log(
                    user_id=deleted_by_user_id,
                    action='delete_invitee_bulk',
                    table_name='invitees',
                    record_id=invitee.id,
                    old_value=f'Deleted invitee {invitee_name} (Bulk) - removed from {removed_count} active events, preserved in {ended_count} ended events',
                    ip_address=request.remote_addr
                )
                
                # Only delete invitee record if no event records remain
                if ended_count == 0:
                    db.session.delete(invitee)
                
                success_count += 1
            except Exception as e:
                failed_count += 1
                errors.append(f'Failed to delete {invitee_name}: {str(e)}')
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return 0, len(invitee_ids), [f'Database error: {str(e)}']
            
        return success_count, failed_count, errors
    
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
