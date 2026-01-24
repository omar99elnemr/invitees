"""
Reporting routes
Endpoints for generating reports (admin only per new requirements)
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required
from app.utils.decorators import admin_required
from app.services.report_service import ReportService
from app.utils.helpers import get_filters_from_request

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
