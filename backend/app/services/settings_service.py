"""
Settings service
Business logic for export settings management
"""
from app.models.export_setting import ExportSetting


class SettingsService:
    """Service for managing export settings"""
    
    @staticmethod
    def get_export_settings():
        """Get all export settings (logos)"""
        return ExportSetting.get_all_export_settings()
    
    @staticmethod
    def update_export_logos(logo_left=None, logo_right=None, remove_left=False, remove_right=False, user_id=None):
        """
        Update export logo settings.
        
        Args:
            logo_left: base64 data URI for left logo (or None to keep unchanged)
            logo_right: base64 data URI for right logo (or None to keep unchanged)
            remove_left: if True, remove the left logo
            remove_right: if True, remove the right logo
            user_id: ID of the user making the change
        
        Returns:
            dict with updated settings
        """
        if remove_left:
            ExportSetting.set_setting('logo_left', None, user_id)
        elif logo_left is not None:
            ExportSetting.set_setting('logo_left', logo_left, user_id)
        
        if remove_right:
            ExportSetting.set_setting('logo_right', None, user_id)
        elif logo_right is not None:
            ExportSetting.set_setting('logo_right', logo_right, user_id)
        
        return ExportSetting.get_all_export_settings()
