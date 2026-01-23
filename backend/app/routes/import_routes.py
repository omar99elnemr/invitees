"""
Import routes
Endpoints for bulk importing invitees from Excel/CSV
"""
from flask import Blueprint, request, jsonify, send_file
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from app.services.import_service import ImportService
import os

import_bp = Blueprint('import', __name__, url_prefix='/api/import')

ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}
UPLOAD_FOLDER = 'tmp/uploads'

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@import_bp.route('/template', methods=['GET'])
@login_required
def download_template():
    """Download Excel template for bulk import"""
    try:
        template_path = ImportService.generate_template()
        return send_file(
            template_path,
            as_attachment=True,
            download_name='invitees_import_template.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@import_bp.route('/invitees', methods=['POST'])
@login_required
def import_invitees():
    """
    Import invitees from Excel/CSV file
    Requires:
    - file: Excel or CSV file
    - event_id: Event to import invitees to
    """
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    event_id = request.form.get('event_id')
    
    if not event_id:
        return jsonify({'error': 'Event ID is required'}), 400
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Only .xlsx, .xls, and .csv are allowed'}), 400
    
    try:
        # Validate event exists and user can add invitees
        from app.models.event import Event
        event = Event.query.get(int(event_id))
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        if current_user.role != 'admin' and not event.can_add_invitees():
            return jsonify({'error': 'Cannot add invitees to this event'}), 403
        
        # Save file temporarily
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f'{current_user.id}_{filename}')
        file.save(filepath)
        
        # Process the file
        result = ImportService.import_invitees_from_file(
            filepath,
            int(event_id),
            current_user.id
        )
        
        # Clean up
        try:
            os.remove(filepath)
        except:
            pass
        
        return jsonify({
            'message': 'Import completed',
            'total_rows': result['total_rows'],
            'successful': result['successful'],
            'failed': result['failed'],
            'errors': result['errors']
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Import failed: {str(e)}'}), 500
