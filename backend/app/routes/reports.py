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


# =============================================================================
# IMPORTANT: HISTORICAL DATA - LEGACY SYSTEM (DO NOT MODIFY)
# =============================================================================
# The historical_invitees table contains ~5866 records from a previous system.
# This is READ-ONLY archival data, completely separate from the current system.
# 
# Table: historical_invitees
# Columns: id, event_name, invitee_name, position, inviter_name, 
#          inviter_group_name, status, status_date, created_at
#
# DO NOT:
# - Join this with current system tables (events, invitees, event_invitees, etc.)
# - Modify or delete records from this table
# - Replace this implementation with queries against current system tables
#
# This endpoint must ONLY query the historical_invitees table directly.
# =============================================================================

@reports_bp.route('/historical', methods=['GET'])
@login_required
@admin_required
def get_historical_data():
    """
    Report 6: Historical Data - LEGACY SYSTEM
    
    IMPORTANT: This reads from the historical_invitees table which contains
    ~5866 records from the OLD system. This is completely separate from the
    current event_invitees table. DO NOT change this to query current tables.
    
    The historical_invitees table is a standalone archive table with no
    foreign key relationships to the current system.
    """
    from sqlalchemy import text
    
    # Get filter parameters
    event_filter = request.args.get('event', '')
    inviter_filter = request.args.get('inviter', '')
    group_filter = request.args.get('group', '')
    status_filter = request.args.get('status', '')
    search_query = request.args.get('search', '')
    
    # IMPORTANT: Query the historical_invitees table directly - NOT event_invitees!
    base_query = "SELECT id, event_name, invitee_name, position, inviter_name, inviter_group_name, status, status_date, created_at FROM historical_invitees WHERE 1=1"
    params = {}
    
    # Apply filters
    if event_filter:
        base_query += " AND event_name ILIKE :event_filter"
        params['event_filter'] = f'%{event_filter}%'
    
    if inviter_filter:
        base_query += " AND inviter_name ILIKE :inviter_filter"
        params['inviter_filter'] = f'%{inviter_filter}%'
    
    if group_filter:
        base_query += " AND inviter_group_name ILIKE :group_filter"
        params['group_filter'] = f'%{group_filter}%'
    
    if status_filter:
        base_query += " AND status = :status_filter"
        params['status_filter'] = status_filter
    
    if search_query:
        base_query += " AND (invitee_name ILIKE :search OR event_name ILIKE :search OR inviter_name ILIKE :search OR position ILIKE :search)"
        params['search'] = f'%{search_query}%'
    
    # Order by status_date descending
    base_query += " ORDER BY status_date DESC NULLS LAST, created_at DESC"
    
    # Execute query
    result = db.session.execute(text(base_query), params)
    rows = result.fetchall()
    
    historical_data = []
    for row in rows:
        historical_data.append({
            'id': row.id,
            'event_name': row.event_name or 'Unknown',
            'invitee_name': row.invitee_name or 'Unknown',
            'position': row.position or '',
            'inviter_name': row.inviter_name or 'Unknown',
            'inviter_group_name': row.inviter_group_name or '',
            'status': row.status or '',
            'status_date': row.status_date if row.status_date else '',
            'created_at': row.created_at.isoformat() if row.created_at else ''
        })
    
    return jsonify(historical_data), 200


@reports_bp.route('/historical/filters', methods=['GET'])
@login_required
@admin_required
def get_historical_filters():
    """
    Get filter options for historical data report from legacy table
    """
    from sqlalchemy import text
    
    # Get unique values from historical_invitees table
    events_result = db.session.execute(text("SELECT DISTINCT event_name FROM historical_invitees WHERE event_name IS NOT NULL ORDER BY event_name"))
    events = [r[0] for r in events_result.fetchall()]
    
    inviters_result = db.session.execute(text("SELECT DISTINCT inviter_name FROM historical_invitees WHERE inviter_name IS NOT NULL ORDER BY inviter_name"))
    inviters = [r[0] for r in inviters_result.fetchall()]
    
    groups_result = db.session.execute(text("SELECT DISTINCT inviter_group_name FROM historical_invitees WHERE inviter_group_name IS NOT NULL ORDER BY inviter_group_name"))
    groups = [r[0] for r in groups_result.fetchall()]
    
    return jsonify({
        'events': events,
        'inviters': inviters,
        'groups': groups
    }), 200
