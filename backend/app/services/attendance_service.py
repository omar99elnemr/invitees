"""
Attendance service
Manages attendance tracking operations for events
"""
from app import db
from app.models.event_invitee import EventInvitee
from app.models.event import Event
from app.models.audit_log import AuditLog
from sqlalchemy import func


class AttendanceService:
    """Service for managing attendance tracking"""
    
    @staticmethod
    def get_event_attendance_stats(event_id):
        """Get attendance statistics for an event"""
        base_query = EventInvitee.query.filter_by(event_id=event_id, status='approved')
        
        total_approved = base_query.count()
        codes_generated = base_query.filter(EventInvitee.attendance_code.isnot(None)).count()
        invitations_sent = base_query.filter_by(invitation_sent=True).count()
        
        # Confirmation stats
        confirmed_coming = base_query.filter_by(attendance_confirmed=True).count()
        confirmed_not_coming = base_query.filter_by(attendance_confirmed=False).count()
        not_responded = base_query.filter(EventInvitee.attendance_confirmed.is_(None)).count()
        
        # Check-in stats
        checked_in = base_query.filter_by(checked_in=True).count()
        not_checked_in = base_query.filter_by(checked_in=False).count()
        
        # Guest counts
        total_plus_one_allowed = db.session.query(func.sum(EventInvitee.plus_one)).filter(
            EventInvitee.event_id == event_id,
            EventInvitee.status == 'approved'
        ).scalar() or 0
        
        total_confirmed_guests = db.session.query(func.sum(EventInvitee.confirmed_guests)).filter(
            EventInvitee.event_id == event_id,
            EventInvitee.status == 'approved',
            EventInvitee.confirmed_guests.isnot(None)
        ).scalar() or 0
        
        total_actual_guests = db.session.query(func.sum(EventInvitee.actual_guests)).filter(
            EventInvitee.event_id == event_id,
            EventInvitee.status == 'approved'
        ).scalar() or 0
        
        return {
            'total_approved': total_approved,
            'codes_generated': codes_generated,
            'invitations_sent': invitations_sent,
            'confirmed_coming': confirmed_coming,
            'confirmed_not_coming': confirmed_not_coming,
            'not_responded': not_responded,
            'checked_in': checked_in,
            'not_checked_in': not_checked_in,
            'total_plus_one_allowed': total_plus_one_allowed,
            'total_confirmed_guests': total_confirmed_guests,
            'total_actual_guests': total_actual_guests,
            'expected_total': total_approved + total_plus_one_allowed,
            'actual_total': checked_in + total_actual_guests,
        }
    
    @staticmethod
    def get_event_attendees(event_id, filters=None):
        """Get all approved attendees for an event with optional filters"""
        query = EventInvitee.query.filter_by(event_id=event_id, status='approved')
        
        if filters:
            if filters.get('has_code') is not None:
                if filters['has_code']:
                    query = query.filter(EventInvitee.attendance_code.isnot(None))
                else:
                    query = query.filter(EventInvitee.attendance_code.is_(None))
            
            if filters.get('invitation_sent') is not None:
                query = query.filter_by(invitation_sent=filters['invitation_sent'])
            
            if filters.get('checked_in') is not None:
                query = query.filter_by(checked_in=filters['checked_in'])
            
            if filters.get('attendance_confirmed') is not None:
                if filters['attendance_confirmed'] == 'yes':
                    query = query.filter_by(attendance_confirmed=True)
                elif filters['attendance_confirmed'] == 'no':
                    query = query.filter_by(attendance_confirmed=False)
                elif filters['attendance_confirmed'] == 'pending':
                    query = query.filter(EventInvitee.attendance_confirmed.is_(None))
            
            if filters.get('search'):
                from app.models.invitee import Invitee
                search_term = f"%{filters['search']}%"
                query = query.join(Invitee).filter(
                    db.or_(
                        Invitee.name.ilike(search_term),
                        Invitee.email.ilike(search_term),
                        Invitee.phone.ilike(search_term),
                        EventInvitee.attendance_code.ilike(search_term)
                    )
                )
        
        return query.order_by(EventInvitee.created_at.desc()).all()
    
    @staticmethod
    def generate_codes_for_event(event_id, user_id, event_prefix=None):
        """Generate attendance codes for all approved invitees without codes"""
        event = Event.query.get(event_id)
        if not event:
            return {'error': 'Event not found', 'success': False}
        
        # Get all approved invitees without codes
        invitees = EventInvitee.query.filter_by(
            event_id=event_id,
            status='approved'
        ).filter(EventInvitee.attendance_code.is_(None)).all()
        
        if not invitees:
            return {'success': True, 'generated': 0, 'message': 'No invitees need codes'}
        
        # Use event name to create prefix if not provided
        if not event_prefix:
            # Create short prefix from event name (first 4 chars uppercase, no spaces)
            clean_name = ''.join(c for c in event.name if c.isalnum())[:4].upper()
            event_prefix = clean_name if clean_name else f'EVT{event_id}'
        
        generated_count = 0
        errors = []
        
        for invitee in invitees:
            try:
                invitee.generate_attendance_code(event_prefix)
                generated_count += 1
            except ValueError as e:
                errors.append(f"Failed for invitee {invitee.id}: {str(e)}")
        
        db.session.commit()
        
        # Log the action
        AuditLog.log(
            user_id=user_id,
            action='generate_attendance_codes',
            table_name='event_invitees',
            record_id=event_id,
            new_value=f'Generated {generated_count} codes for event {event.name}'
        )
        
        return {
            'success': True,
            'generated': generated_count,
            'errors': errors if errors else None
        }
    
    @staticmethod
    def mark_invitations_sent(invitee_ids, method, user_id):
        """Mark multiple invitations as sent"""
        if not invitee_ids:
            return {'error': 'No invitees specified', 'success': False}
        
        invitees = EventInvitee.query.filter(EventInvitee.id.in_(invitee_ids)).all()
        
        updated_count = 0
        for invitee in invitees:
            if invitee.status == 'approved' and invitee.attendance_code:
                invitee.mark_invitation_sent(method)
                updated_count += 1
        
        db.session.commit()
        
        # Log the action
        AuditLog.log(
            user_id=user_id,
            action='mark_invitations_sent',
            table_name='event_invitees',
            new_value=f'Marked {updated_count} invitations as sent via {method}'
        )
        
        return {'success': True, 'updated': updated_count}
    
    @staticmethod
    def check_in_attendee(attendance_code, checked_in_by_user_id, actual_guests=0, notes=None):
        """Check in an attendee by their code"""
        invitee = EventInvitee.get_by_attendance_code(attendance_code)
        
        if not invitee:
            return {'error': 'Invalid attendance code', 'success': False}
        
        if invitee.status != 'approved':
            return {'error': 'Invitation not approved', 'success': False}
        
        if invitee.checked_in:
            return {'error': 'Already checked in', 'success': False, 'already_checked_in': True}
        
        # Validate guest count
        if actual_guests > invitee.plus_one:
            actual_guests = invitee.plus_one
        
        invitee.check_in(checked_in_by_user_id, actual_guests, notes)
        db.session.commit()
        
        # Log the action
        AuditLog.log(
            user_id=checked_in_by_user_id,
            action='check_in_attendee',
            table_name='event_invitees',
            record_id=invitee.id,
            new_value=f'Checked in with {actual_guests} guests'
        )
        
        return {
            'success': True,
            'attendee': invitee.to_dict(include_relations=True)
        }
    
    @staticmethod
    def undo_check_in(invitee_id, user_id):
        """Undo a check-in"""
        invitee = EventInvitee.query.get(invitee_id)
        
        if not invitee:
            return {'error': 'Invitee not found', 'success': False}
        
        if not invitee.checked_in:
            return {'error': 'Not checked in', 'success': False}
        
        invitee.undo_check_in()
        db.session.commit()
        
        # Log the action
        AuditLog.log(
            user_id=user_id,
            action='undo_check_in',
            table_name='event_invitees',
            record_id=invitee.id
        )
        
        return {'success': True}
    
    @staticmethod
    def verify_attendance_code(code):
        """Verify an attendance code and return attendee details for portal"""
        invitee = EventInvitee.get_by_attendance_code(code)
        
        if not invitee:
            return {'valid': False, 'error': 'Invalid code'}
        
        if invitee.status != 'approved':
            return {'valid': False, 'error': 'Invitation not valid'}
        
        # Record portal access
        invitee.record_portal_access()
        db.session.commit()
        
        # Return public-safe data for portal display
        return {
            'valid': True,
            'attendee': {
                'name': invitee.invitee.name if invitee.invitee else None,
                'title': invitee.invitee.title if invitee.invitee else None,
                'company': invitee.invitee.company if invitee.invitee else None,
                'position': invitee.invitee.position if invitee.invitee else None,
                'category': invitee.category_rel.name if invitee.category_rel else None,
                'plus_one': invitee.plus_one,
                'inviter_name': invitee.inviter.name if invitee.inviter else None,
                'event_name': invitee.event.name if invitee.event else None,
                'event_date': invitee.event.start_date.isoformat() if invitee.event and invitee.event.start_date else None,
                'event_end_date': invitee.event.end_date.isoformat() if invitee.event and invitee.event.end_date else None,
                'event_venue': invitee.event.venue if invitee.event else None,
                'attendance_confirmed': invitee.attendance_confirmed,
                'confirmed_guests': invitee.confirmed_guests,
                'checked_in': invitee.checked_in,
            }
        }
    
    @staticmethod
    def verify_by_phone(phone, event_id=None):
        """Verify an attendee by phone number and return details for portal"""
        from app.models.invitee import Invitee
        
        if not phone:
            return {'valid': False, 'error': 'Phone number required'}
        
        # Clean up phone number - remove common formatting
        clean_phone = ''.join(c for c in phone if c.isdigit() or c == '+')
        
        # Build query for approved invitees with matching phone
        query = EventInvitee.query.join(Invitee).filter(
            EventInvitee.status == 'approved',
            db.or_(
                Invitee.phone.like(f'%{clean_phone[-10:]}%'),  # Match last 10 digits
                Invitee.secondary_phone.like(f'%{clean_phone[-10:]}%')
            )
        )
        
        # If event_id is provided, filter by event
        if event_id:
            query = query.filter(EventInvitee.event_id == event_id)
        else:
            # If no event specified, get the most recent upcoming/ongoing event
            query = query.join(Event).filter(
                Event.status.in_(['upcoming', 'ongoing'])
            ).order_by(Event.start_date.asc())
        
        invitee = query.first()
        
        if not invitee:
            return {'valid': False, 'error': 'No invitation found for this phone number'}
        
        # Record portal access
        invitee.record_portal_access()
        db.session.commit()
        
        # Return public-safe data for portal display
        return {
            'valid': True,
            'attendee': {
                'id': invitee.id,
                'name': invitee.invitee.name if invitee.invitee else None,
                'title': invitee.invitee.title if invitee.invitee else None,
                'company': invitee.invitee.company if invitee.invitee else None,
                'position': invitee.invitee.position if invitee.invitee else None,
                'category': invitee.category_rel.name if invitee.category_rel else None,
                'plus_one': invitee.plus_one,
                'inviter_name': invitee.inviter.name if invitee.inviter else None,
                'event_name': invitee.event.name if invitee.event else None,
                'event_date': invitee.event.start_date.isoformat() + 'Z' if invitee.event and invitee.event.start_date else None,
                'event_end_date': invitee.event.end_date.isoformat() + 'Z' if invitee.event and invitee.event.end_date else None,
                'event_venue': invitee.event.venue if invitee.event else None,
                'attendance_code': invitee.attendance_code,
                'attendance_confirmed': invitee.attendance_confirmed,
                'confirmed_guests': invitee.confirmed_guests,
                'checked_in': invitee.checked_in,
            }
        }
    
    @staticmethod
    def confirm_attendance_from_portal(code, is_coming, guest_count=None):
        """Confirm attendance from the public portal"""
        invitee = EventInvitee.get_by_attendance_code(code)
        
        if not invitee:
            return {'success': False, 'error': 'Invalid code'}
        
        if invitee.status != 'approved':
            return {'success': False, 'error': 'Invitation not valid'}
        
        old_confirmed = invitee.attendance_confirmed
        old_guests = invitee.confirmed_guests
        
        invitee.confirm_attendance(is_coming, guest_count)
        db.session.commit()
        
        # Log the action (no user_id for portal actions)
        AuditLog.log(
            user_id=None,
            action='portal_confirm_attendance',
            table_name='event_invitees',
            record_id=invitee.id,
            old_value=f'Coming: {old_confirmed}, Guests: {old_guests}',
            new_value=f'Coming: {is_coming}, Guests: {invitee.confirmed_guests}',
            ip_address=None  # Could add request context if needed
        )
        db.session.commit()
        
        return {
            'success': True,
            'confirmed': is_coming,
            'guests': invitee.confirmed_guests
        }
