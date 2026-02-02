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

@import_bp.route('/contacts', methods=['POST'])
@login_required
def import_contacts():
    """
    Import contacts from Excel/CSV file
    Contacts are added to the global contact list, not directly to an event.
    Users can then select contacts to submit to events via the Events tab.
    Requires:
    - file: Excel or CSV file
    """
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Only .xlsx, .xls, and .csv are allowed'}), 400
    
    try:
        # Save file temporarily
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f'{current_user.id}_{filename}')
        file.save(filepath)
        
        # Process the file
        result = ImportService.import_contacts_from_file(
            filepath,
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
            'skipped': result['skipped'],
            'failed': result['failed'],
            'errors': result['errors']
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Import failed: {str(e)}'}), 500
