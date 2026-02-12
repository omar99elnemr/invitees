"""
Settings routes
Admin endpoints for managing export settings (logos, etc.) and data backup
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.utils.decorators import admin_required
from app.services.settings_service import SettingsService
from datetime import datetime

settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')


@settings_bp.route('/export', methods=['GET'])
@login_required
def get_export_settings():
    """Get export settings (logos). Available to any authenticated user for PDF exports."""
    try:
        settings = SettingsService.get_export_settings()
        return jsonify({'success': True, 'settings': settings}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/export', methods=['PUT'])
@login_required
@admin_required
def update_export_settings():
    """Update export settings (logos). Admin only."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        logo_left = data.get('logo_left')
        logo_right = data.get('logo_right')
        remove_left = data.get('remove_left', False)
        remove_right = data.get('remove_right', False)
        
        SettingsService.update_export_logos(
            logo_left=logo_left,
            logo_right=logo_right,
            remove_left=remove_left,
            remove_right=remove_right,
            user_id=current_user.id,
        )
        
        # Handle logo sizing settings
        from app.models.export_setting import ExportSetting
        for key in ['logo_scale', 'logo_padding_top', 'logo_padding_bottom']:
            if key in data:
                ExportSetting.set_setting(key, str(data[key]) if data[key] is not None else None, current_user.id)
        
        # Re-fetch ALL settings after all saves so response includes sizing
        settings = SettingsService.get_export_settings()
        return jsonify({'success': True, 'settings': settings}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --------------- Data Backup ---------------

ALL_TABLES = ['users', 'inviter_groups', 'inviters', 'contacts', 'events', 'event_invitees', 'categories']

@settings_bp.route('/backup', methods=['GET'])
@login_required
@admin_required
def backup_data():
    """Full system data backup. Admin only.
    Query params:
      tables  – comma-separated list of tables (default: all)
      include_passwords – 'true' to include password hashes (default: false)
    Returns JSON with each requested table as a key."""
    from app.models.user import User
    from app.models.inviter_group import InviterGroup
    from app.models.inviter import Inviter
    from app.models.invitee import Invitee
    from app.models.event import Event
    from app.models.event_invitee import EventInvitee
    from app.models.category import Category
    from app.utils.helpers import to_utc_isoformat

    requested = request.args.get('tables', '')
    tables = [t.strip() for t in requested.split(',') if t.strip()] if requested else ALL_TABLES
    include_pw = request.args.get('include_passwords', 'false').lower() == 'true'

    result = {}

    # ---- Users: identity → role → group → status → activity → IDs → timestamps ----
    if 'users' in tables:
        users = User.query.order_by(User.id).all()
        result['users'] = []
        for u in users:
            d = {
                'id': u.id,
                'full_name': u.full_name,
                'username': u.username,
                'email': u.email,
                'role': u.role,
                'inviter_group_name': u.inviter_group.name if u.inviter_group else None,
                'is_active': u.is_active,
                'last_login': to_utc_isoformat(u.last_login),
                'inviter_group_id': u.inviter_group_id,
                'created_at': to_utc_isoformat(u.created_at),
                'updated_at': to_utc_isoformat(u.updated_at),
            }
            if include_pw:
                d['password_hash'] = u.password_hash
            result['users'].append(d)

    # ---- Inviter Groups: name → description → timestamps ----
    if 'inviter_groups' in tables:
        groups = InviterGroup.query.order_by(InviterGroup.id).all()
        result['inviter_groups'] = [{
            'id': g.id,
            'name': g.name,
            'description': g.description,
            'created_at': to_utc_isoformat(g.created_at),
        } for g in groups]

    # ---- Inviters: name → contact → role → group → status → IDs → timestamps ----
    if 'inviters' in tables:
        inviters = Inviter.query.order_by(Inviter.id).all()
        result['inviters'] = [{
            'id': i.id,
            'name': i.name,
            'phone': i.phone,
            'email': i.email,
            'position': i.position,
            'inviter_group_name': i.inviter_group.name if i.inviter_group else None,
            'is_active': i.is_active,
            'inviter_group_id': i.inviter_group_id,
            'created_at': to_utc_isoformat(i.created_at),
            'updated_at': to_utc_isoformat(i.updated_at),
        } for i in inviters]

    # ---- Contacts: name → phones → email → inviter → group → category →
    #      title/position/company → address → guests → notes → IDs → timestamps ----
    if 'contacts' in tables:
        contacts = Invitee.query.order_by(Invitee.id).all()
        result['contacts'] = []
        for c in contacts:
            result['contacts'].append({
                'id': c.id,
                'name': c.name,
                'phone': c.phone,
                'secondary_phone': c.secondary_phone,
                'email': c.email,
                'inviter_name': c.inviter.name if c.inviter else None,
                'inviter_group_name': c.inviter_group.name if c.inviter_group else None,
                'category': c.category_rel.name if c.category_rel else None,
                'title': c.title,
                'position': c.position,
                'company': c.company,
                'address': c.address,
                'plus_one': c.plus_one,
                'notes': c.notes,
                'inviter_id': c.inviter_id,
                'inviter_group_id': c.inviter_group_id,
                'category_id': c.category_id,
                'created_at': to_utc_isoformat(c.created_at),
                'updated_at': to_utc_isoformat(c.updated_at),
            })

    # ---- Events: name → code → status → dates → venue → description →
    #      groups → creator → check-in → IDs → timestamps ----
    if 'events' in tables:
        events = Event.query.order_by(Event.id).all()
        result['events'] = []
        for e in events:
            if e.is_all_groups:
                from app.models.inviter_group import InviterGroup as IG
                all_g = IG.query.all()
                g_ids = [g.id for g in all_g]
                g_names = [g.name for g in all_g]
            else:
                g_ids = [g.id for g in e.inviter_groups] if e.inviter_groups else []
                g_names = [g.name for g in e.inviter_groups] if e.inviter_groups else []
            result['events'].append({
                'id': e.id,
                'name': e.name,
                'code': e.code,
                'status': e.status,
                'start_date': to_utc_isoformat(e.start_date),
                'end_date': to_utc_isoformat(e.end_date),
                'venue': e.venue,
                'description': e.description,
                'invitee_count': e.event_invitees.count() if hasattr(e, 'event_invitees') else 0,
                'is_all_groups': e.is_all_groups,
                'inviter_group_names': g_names,
                'creator_name': e.creator.username if e.creator else None,
                'checkin_pin_active': e.checkin_pin_active,
                'has_checkin_pin': e.checkin_pin is not None,
                'checkin_pin_auto_deactivate_hours': e.checkin_pin_auto_deactivate_hours,
                'inviter_group_ids': g_ids,
                'created_by_user_id': e.created_by_user_id,
                'created_at': to_utc_isoformat(e.created_at),
                'updated_at': to_utc_isoformat(e.updated_at),
            })

    # ---- Event Assignments: event → invitee → status → approval →
    #      inviter/group → guests → invitation → attendance → check-in →
    #      notes → raw IDs → timestamps ----
    if 'event_invitees' in tables:
        ei_all = EventInvitee.query.order_by(EventInvitee.id).all()
        result['event_invitees'] = []
        for ei in ei_all:
            from app.models.user import User as U
            submitter = U.query.get(ei.inviter_user_id) if ei.inviter_user_id else None
            approver = U.query.get(ei.approved_by_user_id) if ei.approved_by_user_id else None
            checked_by = U.query.get(ei.checked_in_by_user_id) if ei.checked_in_by_user_id else None
            result['event_invitees'].append({
                'id': ei.id,
                # Event context
                'event_name': ei.event.name if ei.event else None,
                'event_date': to_utc_isoformat(ei.event.start_date) if ei.event else None,
                'event_location': ei.event.venue if ei.event else None,
                # Invitee identity
                'invitee_name': ei.invitee.name if ei.invitee else None,
                'invitee_phone': ei.invitee.phone if ei.invitee else None,
                'invitee_email': ei.invitee.email if ei.invitee else None,
                'invitee_title': ei.invitee.title if ei.invitee else None,
                'invitee_company': ei.invitee.company if ei.invitee else None,
                'invitee_position': ei.invitee.position if ei.invitee else None,
                # Status & approval
                'status': ei.status,
                'status_date': to_utc_isoformat(ei.status_date),
                'approved_by_name': approver.username if approver else None,
                'approver_role': ei.approver_role,
                'approval_notes': ei.approval_notes,
                # Inviter & category
                'category': ei.category_rel.name if ei.category_rel else None,
                'inviter_name': ei.inviter.name if ei.inviter else None,
                'inviter_group_name': ei.inviter.inviter_group.name if ei.inviter and ei.inviter.inviter_group else (submitter.inviter_group.name if submitter and submitter.inviter_group else None),
                'submitter_name': submitter.username if submitter else None,
                'inviter_role': ei.inviter_role,
                # Guests & RSVP
                'plus_one': ei.plus_one,
                'is_going': ei.is_going,
                # Invitation dispatch
                'invitation_sent': ei.invitation_sent,
                'invitation_sent_at': to_utc_isoformat(ei.invitation_sent_at),
                'invitation_method': ei.invitation_method,
                # Attendance & portal
                'attendance_code': ei.attendance_code,
                'portal_accessed_at': to_utc_isoformat(ei.portal_accessed_at),
                'attendance_confirmed': ei.attendance_confirmed,
                'confirmed_at': to_utc_isoformat(ei.confirmed_at),
                'confirmed_guests': ei.confirmed_guests,
                # Check-in
                'checked_in': ei.checked_in,
                'checked_in_at': to_utc_isoformat(ei.checked_in_at),
                'checked_in_by_name': checked_by.username if checked_by else None,
                'actual_guests': ei.actual_guests,
                'check_in_notes': ei.check_in_notes,
                # Notes
                'notes': ei.notes,
                # Raw IDs (last)
                'event_id': ei.event_id,
                'invitee_id': ei.invitee_id,
                'category_id': ei.category_id,
                'inviter_id': ei.inviter_id,
                'inviter_user_id': ei.inviter_user_id,
                'approved_by_user_id': ei.approved_by_user_id,
                'checked_in_by_user_id': ei.checked_in_by_user_id,
                'code_generated_at': to_utc_isoformat(ei.code_generated_at),
                'created_at': to_utc_isoformat(ei.created_at),
                'updated_at': to_utc_isoformat(ei.updated_at),
            })

    # ---- Categories: name → status → timestamps ----
    if 'categories' in tables:
        cats = Category.query.order_by(Category.id).all()
        result['categories'] = [{
            'id': c.id,
            'name': c.name,
            'is_active': c.is_active,
            'created_at': to_utc_isoformat(c.created_at),
            'updated_at': to_utc_isoformat(c.updated_at),
        } for c in cats]

    # Summary counts
    summary = {t: len(result.get(t, [])) for t in tables if t in result}

    return jsonify({
        'backup_date': datetime.utcnow().isoformat() + 'Z',
        'backed_up_by': current_user.username,
        'summary': summary,
        'data': result,
    }), 200
