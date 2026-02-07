"""
Settings routes
Admin endpoints for managing export settings (logos, etc.)
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.utils.decorators import admin_required
from app.services.settings_service import SettingsService

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
        
        settings = SettingsService.update_export_logos(
            logo_left=logo_left,
            logo_right=logo_right,
            remove_left=remove_left,
            remove_right=remove_right,
            user_id=current_user.id,
        )
        
        return jsonify({'success': True, 'settings': settings}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
