"""
Notification routes
Handles notification CRUD and push subscription management
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.services.notification_service import (
    get_user_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
    delete_notification,
    save_push_subscription,
    remove_push_subscription,
)

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('', methods=['GET'])
@login_required
def list_notifications():
    """Get notifications for the current user."""
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    limit = min(int(request.args.get('limit', 50)), 100)
    notifications = get_user_notifications(current_user.id, unread_only=unread_only, limit=limit)
    unread = get_unread_count(current_user.id)
    return jsonify({
        'notifications': [n.to_dict() for n in notifications],
        'unread_count': unread,
    }), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@login_required
def unread_count():
    """Get unread notification count."""
    count = get_unread_count(current_user.id)
    return jsonify({'unread_count': count}), 200


@notifications_bp.route('/<int:notification_id>/read', methods=['POST'])
@login_required
def read_notification(notification_id):
    """Mark a single notification as read."""
    success = mark_as_read(notification_id, current_user.id)
    if success:
        db.session.commit()
        return jsonify({'success': True}), 200
    return jsonify({'error': 'Notification not found'}), 404


@notifications_bp.route('/read-all', methods=['POST'])
@login_required
def read_all_notifications():
    """Mark all notifications as read."""
    mark_all_as_read(current_user.id)
    db.session.commit()
    return jsonify({'success': True}), 200


@notifications_bp.route('/<int:notification_id>', methods=['DELETE'])
@login_required
def remove_notification(notification_id):
    """Delete a notification."""
    success = delete_notification(notification_id, current_user.id)
    if success:
        db.session.commit()
        return jsonify({'success': True}), 200
    return jsonify({'error': 'Notification not found'}), 404


# --- Push Subscription endpoints ---

@notifications_bp.route('/push/subscribe', methods=['POST'])
@login_required
def subscribe_push():
    """Save a push subscription for the current user."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Subscription data required'}), 400

    sub = save_push_subscription(current_user.id, data)
    if sub:
        db.session.commit()
        return jsonify({'success': True}), 200
    return jsonify({'error': 'Invalid subscription data'}), 400


@notifications_bp.route('/push/unsubscribe', methods=['POST'])
@login_required
def unsubscribe_push():
    """Remove a push subscription."""
    data = request.get_json()
    endpoint = data.get('endpoint') if data else None
    if not endpoint:
        return jsonify({'error': 'Endpoint required'}), 400

    remove_push_subscription(endpoint)
    db.session.commit()
    return jsonify({'success': True}), 200


@notifications_bp.route('/push/vapid-key', methods=['GET'])
@login_required
def get_vapid_key():
    """Return the VAPID public key for the client."""
    from flask import current_app
    key = current_app.config.get('VAPID_PUBLIC_KEY', '')
    return jsonify({'vapid_public_key': key}), 200
