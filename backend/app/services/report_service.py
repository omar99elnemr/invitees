"""
Report service
Generates various reports for events and invitees
"""
from app import db
from app.models.event_invitee import EventInvitee
from app.models.event import Event
from app.models.user import User
from app.models.inviter import Inviter
from app.models.inviter_group import InviterGroup
from sqlalchemy import func

class ReportService:
    """Service for generating reports"""
    
    @staticmethod
    def get_summary_per_event(filters=None):
        """
        Report 1: Summary - Invitees Per Event
        Groups by Event → Inviter Group → Status
        """
        query = db.session.query(
            Event.id.label('event_id'),
            Event.name.label('event_name'),
            InviterGroup.id.label('inviter_group_id'),
            InviterGroup.name.label('inviter_group_name'),
            EventInvitee.status.label('status'),
            func.count(EventInvitee.id).label('total_invitees')
        ).join(
            EventInvitee, Event.id == EventInvitee.event_id
        ).outerjoin(
            Inviter, EventInvitee.inviter_id == Inviter.id
        ).outerjoin(
            InviterGroup, Inviter.inviter_group_id == InviterGroup.id
        )
        
        # Apply filters
        if filters:
            if 'event_id' in filters and filters['event_id']:
                query = query.filter(Event.id == filters['event_id'])
            
            if 'status' in filters and filters['status']:
                query = query.filter(EventInvitee.status == filters['status'])
            
            if 'start_date' in filters and filters['start_date']:
                query = query.filter(Event.start_date >= filters['start_date'])
            
            if 'end_date' in filters and filters['end_date']:
                query = query.filter(Event.end_date <= filters['end_date'])
            
            if 'inviter_group_id' in filters and filters['inviter_group_id']:
                query = query.filter(InviterGroup.id == filters['inviter_group_id'])
        
        query = query.group_by(
            Event.id,
            Event.name,
            InviterGroup.id,
            InviterGroup.name,
            EventInvitee.status
        ).order_by(
            Event.name,
            InviterGroup.name,
            EventInvitee.status
        )
        
        results = query.all()
        
        return [{
            'event_id': r.event_id,
            'event_name': r.event_name,
            'inviter_group_id': r.inviter_group_id,
            'inviter_group_name': r.inviter_group_name or 'Unassigned',
            'status': r.status,
            'total_invitees': r.total_invitees
        } for r in results]
    
    @staticmethod
    def get_summary_per_inviter(filters=None):
        """
        Report 2: Summary - Invitees Per Inviter
        Groups by Event → Inviter → Status
        """
        query = db.session.query(
            Event.id.label('event_id'),
            Event.name.label('event_name'),
            Inviter.id.label('inviter_id'),
            Inviter.name.label('inviter_name'),
            InviterGroup.name.label('inviter_group_name'),
            EventInvitee.status.label('status'),
            func.count(EventInvitee.id).label('total_invitees')
        ).join(
            EventInvitee, Event.id == EventInvitee.event_id
        ).outerjoin(
            Inviter, EventInvitee.inviter_id == Inviter.id
        ).outerjoin(
            InviterGroup, Inviter.inviter_group_id == InviterGroup.id
        )
        
        # Apply filters
        if filters:
            if 'event_id' in filters and filters['event_id']:
                query = query.filter(Event.id == filters['event_id'])
            
            if 'status' in filters and filters['status']:
                query = query.filter(EventInvitee.status == filters['status'])
            
            if 'inviter_group_id' in filters and filters['inviter_group_id']:
                query = query.filter(InviterGroup.id == filters['inviter_group_id'])
        
        query = query.group_by(
            Event.id,
            Event.name,
            Inviter.id,
            Inviter.name,
            InviterGroup.name,
            EventInvitee.status
        ).order_by(
            Event.name,
            Inviter.name,
            func.count(EventInvitee.id).desc()
        )
        
        results = query.all()
        
        return [{
            'event_id': r.event_id,
            'event_name': r.event_name,
            'inviter_id': r.inviter_id,
            'inviter_name': r.inviter_name or 'Unassigned',
            'inviter_group_name': r.inviter_group_name or 'Unassigned',
            'status': r.status,
            'total_invitees': r.total_invitees
        } for r in results]
    
    @staticmethod
    def get_detail_per_event(filters=None):
        """
        Report 3: Detail - Invitees Per Event
        Complete list of all invitees with all details, grouped by inviter
        """
        query = EventInvitee.query
        
        # Apply filters
        if filters:
            if 'event_id' in filters and filters['event_id']:
                query = query.filter(EventInvitee.event_id == filters['event_id'])
            
            if 'status' in filters and filters['status']:
                query = query.filter(EventInvitee.status == filters['status'])
            
            if 'inviter_group_id' in filters and filters['inviter_group_id']:
                query = query.join(Inviter, EventInvitee.inviter_id == Inviter.id).filter(
                    Inviter.inviter_group_id == filters['inviter_group_id']
                )
            
            if 'search' in filters and filters['search']:
                from app.models.invitee import Invitee
                search_term = f'%{filters["search"]}%'
                query = query.join(Invitee, EventInvitee.invitee_id == Invitee.id).filter(
                    db.or_(
                        Invitee.name.ilike(search_term),
                        Invitee.email.ilike(search_term),
                        Invitee.position.ilike(search_term),
                        Invitee.company.ilike(search_term)
                    )
                )
        
        # Order by inviter, then by created_at
        results = query.outerjoin(
            Inviter, EventInvitee.inviter_id == Inviter.id
        ).order_by(
            Inviter.name,
            EventInvitee.created_at.desc()
        ).all()
        
        return [r.to_dict(include_relations=True) for r in results]
    
    @staticmethod
    def get_detail_going(filters=None):
        """
        Report 4: Detail - Invitees Going
        Final attendee list for approved invitees, grouped by inviter
        """
        query = EventInvitee.query.filter(EventInvitee.status == 'approved')
        
        # Apply filters
        if filters:
            if 'event_id' in filters and filters['event_id']:
                query = query.filter(EventInvitee.event_id == filters['event_id'])
            
            if 'inviter_group_id' in filters and filters['inviter_group_id']:
                query = query.join(Inviter, EventInvitee.inviter_id == Inviter.id).filter(
                    Inviter.inviter_group_id == filters['inviter_group_id']
                )
            
            if 'is_going' in filters and filters['is_going']:
                query = query.filter(EventInvitee.is_going == filters['is_going'])
            
            if 'plus_one' in filters and filters['plus_one'] is not None:
                query = query.filter(EventInvitee.plus_one == filters['plus_one'])
        
        # Order by inviter, then by status_date
        results = query.outerjoin(
            Inviter, EventInvitee.inviter_id == Inviter.id
        ).order_by(
            Inviter.name,
            EventInvitee.status_date.desc()
        ).all()
        
        return [r.to_dict(include_relations=True) for r in results]
    
    @staticmethod
    def get_dashboard_stats(user):
        """Get dashboard statistics based on user role"""
        stats = {}
        
        if user.role == 'organizer':
            # Stats for organizer
            stats['pending_submissions'] = EventInvitee.query.filter_by(
                inviter_user_id=user.id,
                status='waiting_for_approval'
            ).count()
            
            stats['approved_this_month'] = db.session.query(func.count(EventInvitee.id)).filter(
                EventInvitee.inviter_user_id == user.id,
                EventInvitee.status == 'approved',
                func.extract('month', EventInvitee.status_date) == func.extract('month', func.now())
            ).scalar()
            
            stats['rejected_this_month'] = db.session.query(func.count(EventInvitee.id)).filter(
                EventInvitee.inviter_user_id == user.id,
                EventInvitee.status == 'rejected',
                func.extract('month', EventInvitee.status_date) == func.extract('month', func.now())
            ).scalar()
        
        elif user.role == 'director':
            # Stats for director - filtered by their inviter group
            from sqlalchemy import or_
            
            if user.inviter_group_id:
                # Build group-filtered queries
                # Pending approvals from user's group
                pending_query = db.session.query(func.count(EventInvitee.id)).filter(
                    EventInvitee.status == 'waiting_for_approval'
                ).outerjoin(
                    Inviter, EventInvitee.inviter_id == Inviter.id
                ).outerjoin(
                    User, EventInvitee.inviter_user_id == User.id
                ).filter(
                    or_(
                        Inviter.inviter_group_id == user.inviter_group_id,
                        User.inviter_group_id == user.inviter_group_id
                    )
                )
                stats['pending_approvals'] = pending_query.scalar()
            else:
                stats['pending_approvals'] = 0
            
            stats['my_invitations_this_month'] = db.session.query(func.count(EventInvitee.id)).filter(
                EventInvitee.inviter_user_id == user.id,
                func.extract('month', EventInvitee.created_at) == func.extract('month', func.now())
            ).scalar()
            
            stats['total_approved_today'] = db.session.query(func.count(EventInvitee.id)).filter(
                EventInvitee.status == 'approved',
                func.date(EventInvitee.status_date) == func.current_date()
            ).scalar()
        
        elif user.role == 'admin':
            # Stats for admin
            stats['total_users'] = User.query.count()
            stats['active_users'] = User.query.filter_by(is_active=True).count()
            stats['inactive_users'] = User.query.filter_by(is_active=False).count()
            
            stats['total_events'] = Event.query.count()
            stats['upcoming_events'] = Event.query.filter_by(status='upcoming').count()
            stats['ongoing_events'] = Event.query.filter_by(status='ongoing').count()
            stats['ended_events'] = Event.query.filter_by(status='ended').count()
            
            from app.models.invitee import Invitee
            stats['total_invitees'] = Invitee.query.count()
            
            stats['pending_approvals'] = EventInvitee.query.filter_by(
                status='waiting_for_approval'
            ).count()
        
        return stats
