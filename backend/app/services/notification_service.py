"""
Notification Service
Handles creating in-app notifications and sending web push notifications.
"""
import json
import logging
from app import db
from app.models.notification import Notification, PushSubscription

logger = logging.getLogger(__name__)


def create_notification(user_id, title, message, type='system', link=None):
    """Create an in-app notification for a single user."""
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            link=link,
        )
        db.session.add(notif)
        db.session.flush()  # get id before commit
        _send_push_to_user(user_id, title, message, link)
        return notif
    except Exception as e:
        logger.error(f'Failed to create notification for user {user_id}: {e}')
        return None


def create_bulk_notifications(user_ids, title, message, type='system', link=None):
    """Create the same notification for multiple users."""
    notifications = []
    for uid in set(user_ids):
        notif = Notification(
            user_id=uid,
            title=title,
            message=message,
            type=type,
            link=link,
        )
        db.session.add(notif)
        notifications.append(notif)
    db.session.flush()
    # Send push to each user (best effort)
    for uid in set(user_ids):
        _send_push_to_user(uid, title, message, link)
    return notifications


def get_user_notifications(user_id, unread_only=False, limit=50):
    """Get notifications for a user."""
    q = Notification.query.filter_by(user_id=user_id)
    if unread_only:
        q = q.filter_by(is_read=False)
    return q.order_by(Notification.created_at.desc()).limit(limit).all()


def get_unread_count(user_id):
    """Get unread notification count for a user."""
    return Notification.query.filter_by(user_id=user_id, is_read=False).count()


def mark_as_read(notification_id, user_id):
    """Mark a single notification as read."""
    notif = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if notif:
        notif.is_read = True
        return True
    return False


def mark_all_as_read(user_id):
    """Mark all notifications as read for a user."""
    Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})


def delete_notification(notification_id, user_id):
    """Delete a notification."""
    notif = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if notif:
        db.session.delete(notif)
        return True
    return False


# --- Push Notification Helpers ---

def _send_push_to_user(user_id, title, body, link=None):
    """Send web push notification to all of a user's subscriptions (best effort)."""
    try:
        from pywebpush import webpush, WebPushException
        from flask import current_app
        vapid_private = current_app.config.get('VAPID_PRIVATE_KEY')
        vapid_email = current_app.config.get('VAPID_CONTACT_EMAIL', 'mailto:admin@example.com')
        if not vapid_private:
            return

        subs = PushSubscription.query.filter_by(user_id=user_id).all()
        payload = json.dumps({
            'title': title,
            'body': body,
            'url': link or '/',
            'icon': '/icons/icon-192.png',
            'badge': '/icons/icon-72.png',
        })

        for sub in subs:
            try:
                webpush(
                    subscription_info={
                        'endpoint': sub.endpoint,
                        'keys': {
                            'p256dh': sub.p256dh_key,
                            'auth': sub.auth_key,
                        }
                    },
                    data=payload,
                    vapid_private_key=vapid_private,
                    vapid_claims={'sub': vapid_email},
                )
            except WebPushException as e:
                # 410 Gone or 404 = subscription expired, remove it
                if hasattr(e, 'response') and e.response and e.response.status_code in (404, 410):
                    db.session.delete(sub)
                else:
                    logger.warning(f'Push failed for sub {sub.id}: {e}')
            except Exception as e:
                logger.warning(f'Push failed for sub {sub.id}: {e}')
    except ImportError:
        # pywebpush not installed — skip push, in-app notifications still work
        pass
    except Exception as e:
        logger.warning(f'Push sending error: {e}')


def save_push_subscription(user_id, subscription_info):
    """Save or update a push subscription for a user."""
    endpoint = subscription_info.get('endpoint')
    keys = subscription_info.get('keys', {})
    p256dh = keys.get('p256dh')
    auth = keys.get('auth')

    if not endpoint or not p256dh or not auth:
        return None

    # Upsert by endpoint
    existing = PushSubscription.query.filter_by(endpoint=endpoint).first()
    if existing:
        existing.user_id = user_id
        existing.p256dh_key = p256dh
        existing.auth_key = auth
        return existing

    sub = PushSubscription(
        user_id=user_id,
        endpoint=endpoint,
        p256dh_key=p256dh,
        auth_key=auth,
    )
    db.session.add(sub)
    return sub


def remove_push_subscription(endpoint):
    """Remove a push subscription by endpoint."""
    sub = PushSubscription.query.filter_by(endpoint=endpoint).first()
    if sub:
        db.session.delete(sub)
        return True
    return False


# --- High-level notification creators ---

def notify_event_status_changed(event, exclude_user_id=None):
    """Notify relevant users when an event status changes."""
    from app.models.user import User
    from app.models.inviter_group import InviterGroup

    status_labels = {
        'upcoming': 'Upcoming',
        'ongoing': 'Started',
        'ended': 'Ended',
        'cancelled': 'Cancelled',
        'on_hold': 'On Hold',
    }
    label = status_labels.get(event.status, event.status)
    title = f'Event {label}'
    message = f'"{event.name}" is now {label.lower()}.'
    link = '/events'

    # Notify all directors and organizers in assigned groups + all admins
    user_ids = set()

    # Admins always get notified
    admins = User.query.filter_by(role='admin', is_active=True).all()
    user_ids.update(u.id for u in admins)

    # Get users in assigned groups
    if event.is_all_groups:
        groups = InviterGroup.query.all()
    else:
        groups = event.inviter_groups

    for group in groups:
        group_users = User.query.filter_by(inviter_group_id=group.id, is_active=True).all()
        user_ids.update(u.id for u in group_users)

    # Exclude the user who performed the action
    if exclude_user_id:
        user_ids.discard(exclude_user_id)

    if user_ids:
        create_bulk_notifications(list(user_ids), title, message, type='event_status', link=link)


def notify_event_reminder(event, minutes_before):
    """Notify users about an upcoming event."""
    from app.models.user import User
    from app.models.inviter_group import InviterGroup

    if minutes_before >= 60:
        time_str = f'{minutes_before // 60} hour{"s" if minutes_before >= 120 else ""}'
    else:
        time_str = f'{minutes_before} minutes'

    title = 'Event Starting Soon'
    message = f'"{event.name}" starts in {time_str}.'
    link = '/events'

    user_ids = set()
    admins = User.query.filter_by(role='admin', is_active=True).all()
    user_ids.update(u.id for u in admins)

    if event.is_all_groups:
        groups = InviterGroup.query.all()
    else:
        groups = event.inviter_groups

    for group in groups:
        group_users = User.query.filter_by(inviter_group_id=group.id, is_active=True).all()
        user_ids.update(u.id for u in group_users)

    if user_ids:
        create_bulk_notifications(list(user_ids), title, message, type='event_reminder', link=link)


def notify_group_assigned_to_event(event, group, exclude_user_id=None):
    """Notify group members when their group is assigned to an event."""
    from app.models.user import User

    title = 'New Event Assignment'
    message = f'Your group "{group.name}" has been assigned to event "{event.name}".'
    link = '/invitees?tab=events'

    group_users = User.query.filter(
        User.inviter_group_id == group.id,
        User.is_active == True,
        User.role.in_(['director', 'organizer']),
    ).all()

    user_ids = [u.id for u in group_users]
    if exclude_user_id and exclude_user_id in user_ids:
        user_ids.remove(exclude_user_id)

    if user_ids:
        create_bulk_notifications(
            user_ids, title, message,
            type='group_assignment', link=link,
        )


def notify_invitation_submitted(event_name, count, submitter_user):
    """Notify directors in the same group when an organizer submits invitations.
    Directors/admins submitting do NOT trigger this (they manage approvals)."""
    from app.models.user import User

    # Only organizer submissions trigger notifications
    if submitter_user.role != 'organizer':
        return

    if not submitter_user.inviter_group_id:
        return

    title = 'New Invitations Submitted'
    plural = 's' if count > 1 else ''
    message = f'{count} invitee{plural} submitted for "{event_name}" by {submitter_user.username} — awaiting approval.'
    link = '/approvals'

    # Only directors in the SAME group
    directors = User.query.filter_by(
        inviter_group_id=submitter_user.inviter_group_id,
        role='director',
        is_active=True,
    ).all()
    user_ids = {u.id for u in directors}
    user_ids.discard(submitter_user.id)

    if user_ids:
        create_bulk_notifications(list(user_ids), title, message, type='invitation_submitted', link=link)


def notify_invitation_resubmitted(event_name, count, submitter_user):
    """Notify directors in the same group when an organizer resubmits rejected invitations."""
    from app.models.user import User

    if submitter_user.role != 'organizer':
        return

    if not submitter_user.inviter_group_id:
        return

    title = 'Invitations Resubmitted'
    plural = 's' if count > 1 else ''
    message = f'{count} previously rejected invitee{plural} resubmitted for "{event_name}" by {submitter_user.username}.'
    link = '/approvals'

    directors = User.query.filter_by(
        inviter_group_id=submitter_user.inviter_group_id,
        role='director',
        is_active=True,
    ).all()
    user_ids = {u.id for u in directors}
    user_ids.discard(submitter_user.id)

    if user_ids:
        create_bulk_notifications(list(user_ids), title, message, type='invitation_submitted', link=link)


def notify_event_auto_transitions(transitioned_events):
    """Notify all relevant users when events auto-transition status (system-triggered).
    transitioned_events: list of (event, old_status, new_status) tuples.
    System actions notify ALL relevant users (no exclusion)."""
    from app.models.user import User
    from app.models.inviter_group import InviterGroup

    status_labels = {
        'upcoming': 'Upcoming',
        'ongoing': 'Now Live',
        'ended': 'Ended',
    }

    for event, old_status, new_status in transitioned_events:
        label = status_labels.get(new_status, new_status)
        if new_status == 'ongoing':
            title = 'Event Now Live'
            message = f'"{event.name}" has started and is now live.'
        elif new_status == 'ended':
            title = 'Event Ended'
            message = f'"{event.name}" has ended.'
        else:
            title = f'Event {label}'
            message = f'"{event.name}" is now {label.lower()}.'

        link = '/events'

        # System action → notify ALL relevant users (admins + assigned groups)
        user_ids = set()
        admins = User.query.filter_by(role='admin', is_active=True).all()
        user_ids.update(u.id for u in admins)

        if event.is_all_groups:
            groups = InviterGroup.query.all()
        else:
            groups = event.inviter_groups

        for group in groups:
            group_users = User.query.filter_by(inviter_group_id=group.id, is_active=True).all()
            user_ids.update(u.id for u in group_users)

        if user_ids:
            create_bulk_notifications(list(user_ids), title, message, type='event_status', link=link)


def notify_event_details_updated(event, exclude_user_id=None):
    """Notify assigned group members when event details are updated by admin."""
    from app.models.user import User
    from app.models.inviter_group import InviterGroup

    title = 'Event Updated'
    message = f'Details for "{event.name}" have been updated.'
    link = '/events'

    user_ids = set()

    if event.is_all_groups:
        groups = InviterGroup.query.all()
    else:
        groups = event.inviter_groups

    for group in groups:
        group_users = User.query.filter(
            User.inviter_group_id == group.id,
            User.is_active == True,
            User.role.in_(['director', 'organizer']),
        ).all()
        user_ids.update(u.id for u in group_users)

    # Also notify other admins
    admins = User.query.filter_by(role='admin', is_active=True).all()
    user_ids.update(u.id for u in admins)

    if exclude_user_id:
        user_ids.discard(exclude_user_id)

    if user_ids:
        create_bulk_notifications(list(user_ids), title, message, type='event_status', link=link)


def notify_invitation_approved(event_invitee, exclude_user_id=None):
    """Notify the submitter when their invitation is approved."""
    if not event_invitee.inviter_user_id:
        return
    # Don't notify if the approver is the same as the submitter
    if exclude_user_id and event_invitee.inviter_user_id == exclude_user_id:
        return

    title = 'Invitation Approved'
    invitee_name = event_invitee.invitee.name if event_invitee.invitee else 'Unknown'
    event_name = event_invitee.event.name if event_invitee.event else 'Unknown'
    message = f'"{invitee_name}" has been approved for "{event_name}".'
    link = '/invitees?tab=events'

    create_notification(
        event_invitee.inviter_user_id, title, message,
        type='invitation_approved', link=link,
    )


def notify_invitation_rejected(event_invitee, reason=None, exclude_user_id=None):
    """Notify the organizer when their invitation is rejected."""
    if not event_invitee.inviter_user_id:
        return
    if exclude_user_id and event_invitee.inviter_user_id == exclude_user_id:
        return

    title = 'Invitation Rejected'
    invitee_name = event_invitee.invitee.name if event_invitee.invitee else 'Unknown'
    event_name = event_invitee.event.name if event_invitee.event else 'Unknown'
    reason_text = f' Reason: {reason}' if reason else ''
    message = f'"{invitee_name}" was rejected for "{event_name}".{reason_text}'
    link = '/invitees?tab=events'

    create_notification(
        event_invitee.inviter_user_id, title, message,
        type='invitation_rejected', link=link,
    )


def notify_invitation_cancelled(event_invitee, exclude_user_id=None):
    """Notify the organizer when an approved invitation is cancelled."""
    if not event_invitee.inviter_user_id:
        return
    if exclude_user_id and event_invitee.inviter_user_id == exclude_user_id:
        return

    title = 'Approval Cancelled'
    invitee_name = event_invitee.invitee.name if event_invitee.invitee else 'Unknown'
    event_name = event_invitee.event.name if event_invitee.event else 'Unknown'
    message = f'Approval for "{invitee_name}" in "{event_name}" has been cancelled.'
    link = '/invitees?tab=events'

    create_notification(
        event_invitee.inviter_user_id, title, message,
        type='invitation_cancelled', link=link,
    )
