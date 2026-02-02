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
