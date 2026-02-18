"""
Event management routes
Endpoints for managing events
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.utils.decorators import admin_required
from app.services.event_service import EventService
from app.models.event import Event, get_egypt_time
from app import db

events_bp = Blueprint('events', __name__, url_prefix='/api/events')

@events_bp.route('/refresh-statuses', methods=['POST'])
@login_required
def refresh_event_statuses():
    """
    Refresh all event statuses based on current Egypt time.
    Called periodically by the frontend to keep statuses in sync.
    Returns the updated events list.
    Sends system notifications when events auto-transition (upcoming→ongoing, ongoing→ended).
    """
    try:
        # Detect which events WILL transition before the bulk update
        now = get_egypt_time()
        going_live = Event.query.filter(
            Event.status == 'upcoming',
            Event.start_date <= now,
            Event.end_date > now
        ).all()
        going_ended = Event.query.filter(
            Event.status.in_(['upcoming', 'ongoing']),
            Event.end_date <= now
        ).all()

        # Build lightweight transition info for background notifications
        transition_info = []
        seen_ids = set()
        for ev in going_live:
            transition_info.append({'id': ev.id, 'name': ev.name, 'old': ev.status, 'new': 'ongoing'})
            seen_ids.add(ev.id)
        for ev in going_ended:
            if ev.id not in seen_ids:
                transition_info.append({'id': ev.id, 'name': ev.name, 'old': ev.status, 'new': 'ended'})

        # Now do the actual bulk status update
        ongoing_count, ended_count = Event.update_all_statuses()

        # Send notifications in background thread so response is not blocked
        if transition_info:
            import threading
            from flask import current_app
            app = current_app._get_current_object()
            def _send_notifications(app_obj, info):
                try:
                    with app_obj.app_context():
                        from app.services.notification_service import notify_event_auto_transitions_by_info
                        notify_event_auto_transitions_by_info(info)
                except Exception:
                    pass
            threading.Thread(target=_send_notifications, args=(app, transition_info), daemon=True).start()

        events = EventService.get_events_for_user(current_user)
        
        response_data = {
            'events': [event.to_dict() for event in events],
            'updated': {
                'ongoing': ongoing_count,
                'ended': ended_count
            },
            'server_time': get_egypt_time().isoformat()
        }
        
        response = jsonify(response_data)
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response, 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@events_bp.route('', methods=['GET'])
@login_required
def get_events():
    """Get all events (filtered by role)"""
    events = EventService.get_events_for_user(current_user)
    response = jsonify([event.to_dict() for event in events])
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response, 200

@events_bp.route('/<int:event_id>', methods=['GET'])
@login_required
def get_event(event_id):
    """Get event by ID"""
    event = EventService.get_event_by_id(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    # Check permissions
    if current_user.role != 'admin' and event.status not in ('upcoming', 'ongoing'):
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify(event.to_dict()), 200

@events_bp.route('', methods=['POST'])
@login_required
@admin_required
def create_event():
    """Create a new event"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'start_date', 'end_date']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Get is_all_groups flag
    is_all_groups = data.get('is_all_groups', False)
    
    # Validate that either is_all_groups is True OR inviter_group_ids are provided
    inviter_group_ids = data.get('inviter_group_ids', [])
    if not is_all_groups and not inviter_group_ids:
        return jsonify({'error': 'Either select "All Groups" or choose specific inviter groups'}), 400
    
    event, error = EventService.create_event(
        name=data['name'],
        start_date=data['start_date'],
        end_date=data['end_date'],
        venue=data.get('venue'),
        description=data.get('description'),
        created_by_user_id=current_user.id,
        inviter_group_ids=inviter_group_ids,
        is_all_groups=is_all_groups
    )
    
    if error:
        return jsonify({'error': error}), 400
    
    # Notify assigned group members about the new event
    try:
        from app.services.notification_service import notify_group_assigned_to_event, create_bulk_notifications
        from app.models.user import User
        from app.models.inviter_group import InviterGroup as IG

        if event.is_all_groups:
            groups = IG.query.all()
        else:
            groups = event.inviter_groups

        for group in groups:
            notify_group_assigned_to_event(event, group, exclude_user_id=current_user.id)

        # Also notify other admins about the new event
        admin_ids = {u.id for u in User.query.filter_by(role='admin', is_active=True).all()}
        admin_ids.discard(current_user.id)
        if admin_ids:
            create_bulk_notifications(
                list(admin_ids),
                'New Event Created',
                f'"{event.name}" has been created and assigned to {"all groups" if event.is_all_groups else f"{len(groups)} group(s)"}.',
                type='event_status',
                link='/events',
            )

        db.session.commit()
    except Exception:
        pass
    
    return jsonify(event.to_dict()), 201

@events_bp.route('/<int:event_id>', methods=['PUT'])
@login_required
@admin_required
def update_event(event_id):
    """Update event information"""
    data = request.get_json()
    
    # Get is_all_groups flag
    is_all_groups = data.get('is_all_groups')
    inviter_group_ids = data.get('inviter_group_ids')
    
    # Snapshot old group IDs before update so we can detect newly added groups
    from app.models.event import Event as EventModel
    old_event = EventModel.query.get(event_id)
    old_group_ids = set()
    if old_event:
        if old_event.is_all_groups:
            from app.models.inviter_group import InviterGroup as IG
            old_group_ids = {g.id for g in IG.query.all()}
        else:
            old_group_ids = {g.id for g in old_event.inviter_groups}
    
    event, error = EventService.update_event(
        event_id=event_id,
        name=data.get('name'),
        start_date=data.get('start_date'),
        end_date=data.get('end_date'),
        venue=data.get('venue'),
        description=data.get('description'),
        updated_by_user_id=current_user.id,
        inviter_group_ids=inviter_group_ids,
        is_all_groups=is_all_groups
    )
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    # Notify only NEWLY assigned group members (avoid re-notifying existing)
    try:
        from app.services.notification_service import notify_group_assigned_to_event, notify_event_details_updated
        from app.models.inviter_group import InviterGroup as IG

        if event.is_all_groups:
            new_group_ids = {g.id for g in IG.query.all()} - old_group_ids
        elif inviter_group_ids is not None:
            new_group_ids = set(inviter_group_ids) - old_group_ids
        else:
            new_group_ids = set()

        if new_group_ids:
            new_groups = IG.query.filter(IG.id.in_(new_group_ids)).all()
            for group in new_groups:
                notify_group_assigned_to_event(event, group, exclude_user_id=current_user.id)

        # Notify existing assigned groups about the detail changes
        notify_event_details_updated(event, exclude_user_id=current_user.id)

        db.session.commit()
    except Exception:
        pass
    
    return jsonify(event.to_dict()), 200

@events_bp.route('/<int:event_id>/status', methods=['PATCH'])
@login_required
@admin_required
def update_event_status(event_id):
    """Manually update event status"""
    data = request.get_json()
    
    if not data or not data.get('status'):
        return jsonify({'error': 'Status is required'}), 400
    
    event, error = EventService.update_event_status(
        event_id=event_id,
        status=data['status'],
        updated_by_user_id=current_user.id
    )
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    # Notify relevant users about event status change
    try:
        from app.services.notification_service import notify_event_status_changed
        from app import db as _db
        notify_event_status_changed(event, exclude_user_id=current_user.id)
        _db.session.commit()
    except Exception:
        pass
    
    return jsonify(event.to_dict()), 200

@events_bp.route('/<int:event_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_event(event_id):
    """Delete an event"""
    success, error = EventService.delete_event(event_id, current_user.id)
    
    if error:
        status_code = 404 if 'not found' in error.lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify({'message': 'Event deleted successfully'}), 200


# =========================
# Check-in PIN Management
# =========================

@events_bp.route('/<int:event_id>/checkin-pin', methods=['POST'])
@login_required
@admin_required
def generate_checkin_pin(event_id):
    """Generate or regenerate check-in PIN for an event"""
    from app import db
    
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    data = request.get_json() or {}
    auto_deactivate_hours = data.get('auto_deactivate_hours')
    
    # Generate unique event code if not exists
    if not event.code:
        event.code = Event.generate_unique_code(event.name)
    
    # Generate new PIN
    pin = event.generate_checkin_pin()
    
    # Set auto-deactivate hours if provided
    if auto_deactivate_hours is not None:
        event.checkin_pin_auto_deactivate_hours = auto_deactivate_hours
    
    db.session.commit()
    
    # Log the action
    from app.models.audit_log import AuditLog
    AuditLog.log(
        user_id=current_user.id,
        action='generate_checkin_pin',
        table_name='events',
        record_id=event.id,
        new_value=f'Event: {event.name}, Code: {event.code}',
        ip_address=request.remote_addr
    )
    db.session.commit()
    
    return jsonify({
        'success': True,
        'code': event.code,
        'pin': pin,
        'active': event.checkin_pin_active,
        'auto_deactivate_hours': event.checkin_pin_auto_deactivate_hours,
        'checkin_url': f'/checkin/{event.code}',
        'live_url': f'/live/{event.code}'
    })


@events_bp.route('/<int:event_id>/checkin-pin', methods=['GET'])
@login_required
@admin_required
def get_checkin_pin(event_id):
    """Get check-in PIN info for an event (admin only)"""
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    if not event.checkin_pin:
        return jsonify({'error': 'No PIN generated for this event'}), 404
    
    return jsonify({
        'success': True,
        'code': event.code,
        'pin': event.checkin_pin,
        'active': event.checkin_pin_active,
        'auto_deactivate_hours': event.checkin_pin_auto_deactivate_hours,
        'checkin_url': f'/checkin/{event.code}',
        'live_url': f'/live/{event.code}'
    })


@events_bp.route('/<int:event_id>/checkin-pin/toggle', methods=['PATCH'])
@login_required
@admin_required
def toggle_checkin_pin(event_id):
    """Activate or deactivate check-in PIN"""
    from app import db
    
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    if not event.checkin_pin:
        return jsonify({'error': 'No PIN generated for this event'}), 400
    
    data = request.get_json() or {}
    active = data.get('active')
    
    old_status = event.checkin_pin_active
    
    if active is not None:
        event.checkin_pin_active = active
    else:
        # Toggle
        event.checkin_pin_active = not event.checkin_pin_active
    
    db.session.commit()
    
    # Log the action
    from app.models.audit_log import AuditLog
    AuditLog.log(
        user_id=current_user.id,
        action='toggle_checkin_pin',
        table_name='events',
        record_id=event.id,
        old_value=f'Active: {old_status}',
        new_value=f'Active: {event.checkin_pin_active}',
        ip_address=request.remote_addr
    )
    db.session.commit()
    
    return jsonify({
        'success': True,
        'checkin_pin_active': event.checkin_pin_active
    })


@events_bp.route('/<int:event_id>/checkin-pin/settings', methods=['PATCH'])
@login_required
@admin_required
def update_checkin_settings(event_id):
    """Update check-in settings (auto-deactivate hours)"""
    from app import db
    
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    data = request.get_json() or {}
    
    old_hours = event.checkin_pin_auto_deactivate_hours
    
    if 'auto_deactivate_hours' in data:
        event.checkin_pin_auto_deactivate_hours = data['auto_deactivate_hours']
    
    db.session.commit()
    
    # Log the action
    from app.models.audit_log import AuditLog
    AuditLog.log(
        user_id=current_user.id,
        action='update_checkin_settings',
        table_name='events',
        record_id=event.id,
        old_value=f'Auto-deactivate hours: {old_hours}',
        new_value=f'Auto-deactivate hours: {event.checkin_pin_auto_deactivate_hours}',
        ip_address=request.remote_addr
    )
    db.session.commit()
    
    return jsonify({
        'success': True,
        'auto_deactivate_hours': event.checkin_pin_auto_deactivate_hours
    })


# =========================
# Group Quota Management
# =========================

@events_bp.route('/<int:event_id>/quotas', methods=['GET'])
@login_required
def get_event_quotas(event_id):
    """
    Get quota info for every assigned group of an event.
    Returns list of {inviter_group_id, inviter_group_name, quota, used, remaining}.
    Accessible by any logged-in user (directors/organizers see only their own group).
    """
    if not current_user.is_authenticated:
        return jsonify({'error': 'Authentication required'}), 401

    from app.models.event_group_quota import EventGroupQuota
    from app.models.inviter_group import InviterGroup

    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Determine which groups to report on
    if event.is_all_groups:
        groups = InviterGroup.query.order_by(InviterGroup.name).all()
    else:
        groups = sorted(event.inviter_groups, key=lambda g: g.name)

    # Non-admins only see their own group
    if getattr(current_user, 'role', None) != 'admin':
        groups = [g for g in groups if g.id == getattr(current_user, 'inviter_group_id', None)]

    result = []
    for group in groups:
        record = EventGroupQuota.get_quota(event_id, group.id)
        quota_val = record.quota if record else None
        used = EventGroupQuota.get_usage(event_id, group.id)
        remaining = (quota_val - used) if quota_val is not None else None

        result.append({
            'inviter_group_id': group.id,
            'inviter_group_name': group.name,
            'quota': quota_val,
            'used': used,
            'remaining': max(remaining, 0) if remaining is not None else None,
        })

    return jsonify(result), 200


@events_bp.route('/<int:event_id>/quotas', methods=['PUT'])
@login_required
@admin_required
def set_event_quotas(event_id):
    """
    Set quotas for one or more groups.
    Body: { "quotas": [ { "inviter_group_id": 1, "quota": 50 }, ... ] }
    quota=null means unlimited.
    """
    from app.models.event_group_quota import EventGroupQuota
    from app.models.audit_log import AuditLog
    from app.models.inviter_group import InviterGroup

    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    quotas = data.get('quotas', [])

    if not isinstance(quotas, list):
        return jsonify({'error': 'quotas must be an array'}), 400

    # Build set of valid group IDs for this event
    if event.is_all_groups:
        valid_group_ids = {g.id for g in InviterGroup.query.all()}
    else:
        valid_group_ids = {g.id for g in event.inviter_groups}

    updated = []
    for item in quotas:
        group_id = item.get('inviter_group_id')
        quota_val = item.get('quota')  # int or null

        if group_id is None:
            continue

        # Skip groups not assigned to this event
        if int(group_id) not in valid_group_ids:
            continue

        # Validate quota value
        if quota_val is not None:
            try:
                quota_val = int(quota_val)
                if quota_val < 0:
                    return jsonify({'error': f'Quota for group {group_id} cannot be negative'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': f'Invalid quota value for group {group_id}'}), 400

        EventGroupQuota.set_quota(event_id, int(group_id), quota_val)
        updated.append({'inviter_group_id': int(group_id), 'quota': quota_val})

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to save quotas: {str(e)}'}), 500

    # Audit log (non-fatal)
    try:
        AuditLog.log(
            user_id=getattr(current_user, 'id', None),
            action='set_event_quotas',
            table_name='event_group_quotas',
            record_id=event_id,
            new_value=str(updated),
            ip_address=request.remote_addr
        )
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({'message': f'Updated quotas for {len(updated)} group(s)', 'updated': updated}), 200
