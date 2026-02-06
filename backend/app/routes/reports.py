"""
Reporting routes
Endpoints for generating reports (admin only per new requirements)
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.utils.decorators import admin_required
from app.services.report_service import ReportService
from app.utils.helpers import get_filters_from_request
from app.models.audit_log import AuditLog
from app.models.user import User
from app import db

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('/summary-per-event', methods=['GET'])
@login_required
@admin_required
def get_summary_per_event():
    """
    Report 1: Summary - Invitees Per Event
    Groups by Event → Inviter Group → Status
    """
    filters = get_filters_from_request()
    report_data = ReportService.get_summary_per_event(filters)
    return jsonify(report_data), 200

@reports_bp.route('/summary-per-inviter', methods=['GET'])
@login_required
@admin_required
def get_summary_per_inviter():
    """
    Report 2: Summary - Invitees Per Inviter
    Groups by Event → Inviter → Status
    """
    filters = get_filters_from_request()
    report_data = ReportService.get_summary_per_inviter(filters)
    return jsonify(report_data), 200

@reports_bp.route('/detail-per-event', methods=['GET'])
@login_required
@admin_required
def get_detail_per_event():
    """
    Report 3: Detail - Invitees Per Event
    Complete list with all details, grouped by inviter
    """
    filters = get_filters_from_request()
    report_data = ReportService.get_detail_per_event(filters)
    return jsonify(report_data), 200

@reports_bp.route('/detail-going', methods=['GET'])
@login_required
@admin_required
def get_detail_going():
    """
    Report 4: Detail - Invitees Going
    Final attendee list for approved invitees, grouped by inviter
    """
    filters = get_filters_from_request()
    report_data = ReportService.get_detail_going(filters)
    return jsonify(report_data), 200


@reports_bp.route('/activity-log', methods=['GET'])
@login_required
@admin_required
def get_activity_log():
    """
    Report 5: Activity Log
    System activity log showing all actions with filtering
    """
    # Get filter parameters
    action_filter = request.args.get('action', '')
    user_filter = request.args.get('user_id', '')
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')
    limit = request.args.get('limit', 500, type=int)
    
    # Build query
    query = AuditLog.query
    
    # Apply filters
    if action_filter:
        query = query.filter(AuditLog.action == action_filter)
    
    if user_filter:
        query = query.filter(AuditLog.user_id == int(user_filter))
    
    if start_date:
        from datetime import datetime
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(AuditLog.timestamp >= start_dt)
        except:
            pass
    
    if end_date:
        from datetime import datetime
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(AuditLog.timestamp <= end_dt)
        except:
            pass
    
    # Order by most recent first and limit results
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    return jsonify([log.to_dict() for log in logs]), 200


@reports_bp.route('/activity-log/actions', methods=['GET'])
@login_required
@admin_required
def get_activity_actions():
    """
    Get list of unique action types for filtering
    """
    actions = db.session.query(AuditLog.action).distinct().order_by(AuditLog.action).all()
    return jsonify([a[0] for a in actions]), 200


@reports_bp.route('/activity-log/users', methods=['GET'])
@login_required
@admin_required
def get_activity_users():
    """
    Get list of users who have performed actions for filtering
    """
    user_ids = db.session.query(AuditLog.user_id).distinct().filter(AuditLog.user_id.isnot(None)).all()
    user_ids = [u[0] for u in user_ids]
    
    users = User.query.filter(User.id.in_(user_ids)).all()
    return jsonify([{
        'id': u.id, 
        'username': u.username, 
        'name': u.full_name or u.username,
        'role': u.role,
        'inviter_group': u.inviter_group.name if u.inviter_group else None
    } for u in users]), 200


@reports_bp.route('/historical', methods=['GET'])
@login_required
@admin_required
def get_historical_data():
    """
    Report 6: Historical Data
    Shows all event invitees with their status history
    """
    from app.models.event_invitee import EventInvitee
    from app.models.invitee import Invitee
    from app.models.event import Event
    from app.models.inviter import Inviter
    from app.models.inviter_group import InviterGroup
    
    # Get filter parameters
    event_filter = request.args.get('event', '')
    inviter_filter = request.args.get('inviter', '')
    group_filter = request.args.get('group', '')
    status_filter = request.args.get('status', '')
    search_query = request.args.get('search', '')
    
    # Build query
    query = db.session.query(
        EventInvitee,
        Invitee,
        Event,
        Inviter,
        InviterGroup
    ).join(
        Invitee, EventInvitee.invitee_id == Invitee.id
    ).join(
        Event, EventInvitee.event_id == Event.id
    ).outerjoin(
        Inviter, EventInvitee.inviter_id == Inviter.id
    ).outerjoin(
        InviterGroup, Invitee.inviter_group_id == InviterGroup.id
    )
    
    # Apply filters
    if event_filter:
        query = query.filter(Event.name.ilike(f'%{event_filter}%'))
    
    if inviter_filter:
        query = query.filter(Inviter.name.ilike(f'%{inviter_filter}%'))
    
    if group_filter:
        query = query.filter(InviterGroup.name.ilike(f'%{group_filter}%'))
    
    if status_filter:
        query = query.filter(EventInvitee.status == status_filter)
    
    if search_query:
        search_term = f'%{search_query}%'
        query = query.filter(
            db.or_(
                Invitee.name.ilike(search_term),
                Invitee.email.ilike(search_term),
                Invitee.phone.ilike(search_term),
                Event.name.ilike(search_term),
                Inviter.name.ilike(search_term)
            )
        )
    
    # Order by most recent first
    query = query.order_by(EventInvitee.status_date.desc().nullsfirst(), EventInvitee.created_at.desc())
    
    # Limit to prevent performance issues
    results = query.limit(1000).all()
    
    historical_data = []
    for ei, invitee, event, inviter, group in results:
        historical_data.append({
            'id': ei.id,
            'event_name': event.name if event else 'Unknown',
            'invitee_name': invitee.name if invitee else 'Unknown',
            'invitee_email': invitee.email if invitee else '',
            'position': invitee.position if invitee else '',
            'inviter_name': inviter.name if inviter else 'Unknown',
            'inviter_group_name': group.name if group else '',
            'status': ei.status,
            'status_date': ei.status_date.isoformat() if ei.status_date else (ei.created_at.isoformat() if ei.created_at else ''),
            'category': ei.category.name if ei.category else '',
            'plus_one': ei.plus_one or 0
        })
    
    return jsonify(historical_data), 200


@reports_bp.route('/historical/filters', methods=['GET'])
@login_required
@admin_required
def get_historical_filters():
    """
    Get filter options for historical data report
    """
    from app.models.event import Event
    from app.models.inviter import Inviter
    from app.models.inviter_group import InviterGroup
    
    events = Event.query.order_by(Event.name).all()
    inviters = Inviter.query.filter(Inviter.is_active == True).order_by(Inviter.name).all()
    groups = InviterGroup.query.order_by(InviterGroup.name).all()
    
    return jsonify({
        'events': [e.name for e in events],
        'inviters': [i.name for i in inviters],
        'groups': [g.name for g in groups]
    }), 200
