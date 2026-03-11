"""
Query helper utilities for batch loading and eager loading patterns.
Eliminates N+1 queries in serialization methods like EventInvitee.to_dict().
"""
from app import db


def build_user_cache(event_invitees):
    """Build a {user_id: User} lookup dict from a list of EventInvitee records.
    
    Collects all unique user IDs referenced by inviter_user_id,
    approved_by_user_id, and checked_in_by_user_id, then fetches
    them in a single query.
    
    Args:
        event_invitees: list of EventInvitee model instances
    
    Returns:
        dict mapping user_id -> User instance
    """
    from app.models.user import User

    user_ids = set()
    for ei in event_invitees:
        if ei.inviter_user_id:
            user_ids.add(ei.inviter_user_id)
        if ei.approved_by_user_id:
            user_ids.add(ei.approved_by_user_id)
        if ei.checked_in_by_user_id:
            user_ids.add(ei.checked_in_by_user_id)

    if not user_ids:
        return {}

    users = User.query.filter(User.id.in_(user_ids)).all()
    return {u.id: u for u in users}


def eager_load_event_invitees(query):
    """Apply eager loading options to an EventInvitee query.
    
    Loads invitee, event, inviter (with inviter_group), and category_rel
    in bulk instead of per-row lazy loads.
    """
    from sqlalchemy.orm import selectinload, joinedload
    from app.models.event_invitee import EventInvitee
    from app.models.invitee import Invitee
    from app.models.inviter import Inviter

    return query.options(
        selectinload(EventInvitee.invitee).selectinload(Invitee.inviter_group),
        selectinload(EventInvitee.invitee).selectinload(Invitee.inviter),
        selectinload(EventInvitee.invitee).selectinload(Invitee.category_rel),
        joinedload(EventInvitee.event),
        selectinload(EventInvitee.inviter).selectinload(Inviter.inviter_group),
        selectinload(EventInvitee.category_rel),
    )
