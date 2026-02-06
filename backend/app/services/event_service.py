"""
Event service
Handles event management operations
"""
from flask import request
from app import db
from app.models.event import Event
from app.models.inviter_group import InviterGroup
from app.models.audit_log import AuditLog
from datetime import datetime

class EventService:
    """Service for event management operations"""
    
    @staticmethod
    def create_event(name, start_date, end_date, venue, description, created_by_user_id, inviter_group_ids=None, is_all_groups=False):
        """
        Create a new event
        Returns (event, error_message)
        """
        # Parse dates
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            return None, 'Invalid date format'
        
        # Validate dates
        if start_dt >= end_dt:
            return None, 'Start date must be before end date'
        
        # Create event
        event = Event(
            name=name,
            start_date=start_dt,
            end_date=end_dt,
            venue=venue,
            description=description,
            created_by_user_id=created_by_user_id,
            is_all_groups=is_all_groups
        )
        
        # Assign inviter groups only if not is_all_groups
        if not is_all_groups and inviter_group_ids:
            groups = InviterGroup.query.filter(InviterGroup.id.in_(inviter_group_ids)).all()
            event.inviter_groups = groups
        elif is_all_groups:
            # Clear any specific group assignments when is_all_groups is True
            event.inviter_groups = []
        
        # Set initial status based on dates
        event.update_status()
        
        db.session.add(event)
        db.session.commit()
        
        # Log creation
        AuditLog.log(
            user_id=created_by_user_id,
            action='create_event',
            table_name='events',
            record_id=event.id,
            new_value=f'Created event {name}',
            ip_address=request.remote_addr
        )
        db.session.commit()
        
        return event, None
    
    @staticmethod
    def update_event(event_id, name=None, start_date=None, end_date=None, venue=None, description=None, updated_by_user_id=None, inviter_group_ids=None, is_all_groups=None):
        """
        Update event information
        Returns (event, error_message)
        """
        event = Event.query.get(event_id)
        if not event:
            return None, 'Event not found'
        
        old_value = event.to_dict()
        
        # Update fields
        if name:
            event.name = name
        
        if start_date:
            try:
                event.start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                return None, 'Invalid start date format'
        
        if end_date:
            try:
                event.end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                return None, 'Invalid end date format'
        
        # Validate dates
        if event.start_date >= event.end_date:
            return None, 'Start date must be before end date'
        
        if venue is not None:
            event.venue = venue
        
        if description is not None:
            event.description = description
        
        # Update is_all_groups flag if provided
        if is_all_groups is not None:
            event.is_all_groups = is_all_groups
            if is_all_groups:
                # Clear specific group assignments when is_all_groups is True
                event.inviter_groups = []
        
        # Update inviter groups if provided and not is_all_groups
        if inviter_group_ids is not None and not event.is_all_groups:
            groups = InviterGroup.query.filter(InviterGroup.id.in_(inviter_group_ids)).all()
            event.inviter_groups = groups
        
        # Update status based on new dates
        event.update_status()
        event.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # Log update
        if updated_by_user_id:
            AuditLog.log(
                user_id=updated_by_user_id,
                action='update_event',
                table_name='events',
                record_id=event.id,
                old_value=str(old_value),
                new_value=str(event.to_dict()),
                ip_address=request.remote_addr
            )
            db.session.commit()
        
        return event, None
    
    @staticmethod
    def update_event_status(event_id, status, updated_by_user_id):
        """
        Manually update event status (admin only)
        Returns (event, error_message)
        """
        event = Event.query.get(event_id)
        if not event:
            return None, 'Event not found'
        
        if status not in ('upcoming', 'ongoing', 'ended', 'cancelled', 'on_hold'):
            return None, 'Invalid status'
        
        old_status = event.status
        event.status = status
        event.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # Log status change
        AuditLog.log(
            user_id=updated_by_user_id,
            action='update_event_status',
            table_name='events',
            record_id=event.id,
            old_value=f'Status: {old_status}',
            new_value=f'Status: {status}',
            ip_address=request.remote_addr
        )
        db.session.commit()
        
        return event, None
    
    @staticmethod
    def delete_event(event_id, deleted_by_user_id):
        """
        Delete an event
        Returns (success, error_message)
        """
        event = Event.query.get(event_id)
        if not event:
            return False, 'Event not found'
        
        # Check if event has invitees
        if event.event_invitees.count() > 0:
            return False, 'Cannot delete event with invitees'
        
        event_name = event.name
        
        # Log deletion before deleting
        AuditLog.log(
            user_id=deleted_by_user_id,
            action='delete_event',
            table_name='events',
            record_id=event.id,
            old_value=f'Deleted event {event_name}',
            ip_address=request.remote_addr
        )
        
        db.session.delete(event)
        db.session.commit()
        
        return True, None
    
    @staticmethod
    def get_events_for_user(user):
        """Get events visible to user based on role"""
        return Event.get_all_for_user(user)
    
    @staticmethod
    def get_event_by_id(event_id):
        """Get event by ID"""
        return Event.query.get(event_id)
    
    @staticmethod
    def update_all_event_statuses():
        """Background task to update all event statuses based on current date"""
        events = Event.query.filter(Event.status.in_(['upcoming', 'ongoing'])).all()
        
        for event in events:
            event.update_status()
        
        db.session.commit()
        
        return len(events)
