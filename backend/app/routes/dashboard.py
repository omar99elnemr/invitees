"""
Dashboard routes
Endpoints for dashboard statistics
"""
from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from app.services.report_service import ReportService
from app.services.approval_service import ApprovalService
from app.models.audit_log import AuditLog

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    """Get dashboard statistics based on user role"""
    stats = ReportService.get_dashboard_stats(current_user)
    return jsonify(stats), 200

@dashboard_bp.route('/activity', methods=['GET'])
@login_required
def get_recent_activity():
    """Get recent activity"""
    limit = 20 if current_user.role == 'admin' else 10
    
    if current_user.role == 'organizer':
        # Show only user's own approvals/rejections
        activity = ApprovalService.get_approval_history(current_user.id)[:limit]
        return jsonify([a.to_dict(include_relations=True) for a in activity]), 200
    
    elif current_user.role == 'director':
        # Show recent approvals made by all directors
        recent_approvals = ApprovalService.get_approvals_by_approver(current_user.id, limit)
        return jsonify([a.to_dict(include_relations=True) for a in recent_approvals]), 200
    
    else:  # admin
        # Show all system activity
        logs = AuditLog.get_recent(limit)
        return jsonify([log.to_dict() for log in logs]), 200
