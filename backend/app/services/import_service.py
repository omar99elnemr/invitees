"""
Import service
Handles bulk import of invitees from Excel/CSV files
"""
import pandas as pd
import re
from flask import request
from app import db
from app.models.invitee import Invitee
from app.models.event_invitee import EventInvitee
from app.models.user import User
from app.models.audit_log import AuditLog
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
import os

class ImportService:
    """Service for bulk importing invitees"""
    
    @staticmethod
    def validate_email(email):
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, str(email)) is not None
    
    @staticmethod
    def validate_phone(phone):
        """Validate phone format"""
        clean_phone = str(phone).replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        pattern = r'^\+?[1-9]\d{1,14}$'
        return re.match(pattern, clean_phone) is not None
    
    @staticmethod
    def import_invitees_from_file(filepath, event_id, inviter_user_id):
        """
        Import invitees from Excel or CSV file
        Returns dict with import results
        """
        # Read file based on extension
        if filepath.endswith('.csv'):
            df = pd.read_csv(filepath)
        else:
            df = pd.read_excel(filepath)
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
        # Validate required columns
        required_columns = ['name', 'email', 'phone']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
        
        # Get inviter info
        inviter = User.query.get(inviter_user_id)
        if not inviter:
            raise ValueError("Inviter user not found")
        
        # Process rows
        total_rows = len(df)
        successful = 0
        failed = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Validate required fields
                name = str(row['name']).strip() if pd.notna(row['name']) else None
                email = str(row['email']).strip().lower() if pd.notna(row['email']) else None
                phone = str(row['phone']).strip() if pd.notna(row['phone']) else None
                
                if not name or not email or not phone:
                    raise ValueError("Missing required field (name, email, or phone)")
                
                # Validate email format
                if not ImportService.validate_email(email):
                    raise ValueError("Invalid email format")
                
                # Validate phone format
                if not ImportService.validate_phone(phone):
                    raise ValueError("Invalid phone format (use international format like +20 123 456 7890)")
                
                # Check if invitee exists by email
                invitee = Invitee.find_by_email(email)
                
                if not invitee:
                    # Create new invitee
                    invitee = Invitee(
                        name=name,
                        email=email,
                        phone=phone,
                        position=str(row.get('position', '')).strip() if pd.notna(row.get('position')) else None,
                        company=str(row.get('company', '')).strip() if pd.notna(row.get('company')) else None
                    )
                    db.session.add(invitee)
                    db.session.flush()  # Get the ID
                else:
                    # Update existing invitee with new info if provided
                    if pd.notna(row.get('position')) and row.get('position'):
                        invitee.position = str(row['position']).strip()
                    if pd.notna(row.get('company')) and row.get('company'):
                        invitee.company = str(row['company']).strip()
                
                # Check if already invited to this event
                existing = EventInvitee.query.filter_by(
                    event_id=event_id,
                    invitee_id=invitee.id
                ).first()
                
                if existing:
                    raise ValueError("Already invited to this event")
                
                # Get invitation class
                invitation_class = 'none'
                if pd.notna(row.get('invitation_class')):
                    ic = str(row['invitation_class']).strip().lower()
                    if ic in ['white', 'gold', 'none']:
                        invitation_class = ic
                
                # Create event_invitee record
                event_invitee = EventInvitee(
                    event_id=event_id,
                    invitee_id=invitee.id,
                    category=str(row.get('category', '')).strip() if pd.notna(row.get('category')) else None,
                    invitation_class=invitation_class,
                    inviter_user_id=inviter_user_id,
                    inviter_role=inviter.role,
                    status='waiting_for_approval',
                    notes=str(row.get('notes', '')).strip() if pd.notna(row.get('notes')) else None
                )
                db.session.add(event_invitee)
                successful += 1
                
            except Exception as e:
                failed += 1
                # Excel rows start at 1, header is row 1, data starts at row 2
                errors.append(f"Row {index + 2}: {str(e)}")
                # Rollback this specific row's changes
                db.session.rollback()
        
        # Commit all successful changes
        try:
            db.session.commit()
            
            # Log import
            AuditLog.log(
                user_id=inviter_user_id,
                action='bulk_import',
                table_name='event_invitees',
                new_value=f'Imported {successful} invitees, {failed} failed',
                ip_address=request.remote_addr if request else None
            )
            db.session.commit()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Database error during import: {str(e)}")
        
        return {
            'total_rows': total_rows,
            'successful': successful,
            'failed': failed,
            'errors': errors
        }
    
    @staticmethod
    def generate_template():
        """
        Generate Excel template with instructions
        Returns the file path of the generated template
        """
        wb = Workbook()
        
        # Remove default sheet
        wb.remove(wb.active)
        
        # Create Instructions sheet
        instructions_ws = wb.create_sheet("Instructions", 0)
        
        # Title
        instructions_ws['A1'] = "BULK IMPORT INSTRUCTIONS"
        instructions_ws['A1'].font = Font(bold=True, size=16, color="FFFFFF")
        instructions_ws['A1'].fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
        instructions_ws['A1'].alignment = Alignment(horizontal="center")
        instructions_ws.merge_cells('A1:H1')
        
        # Instructions content
        instructions = [
            [],
            ["REQUIRED COLUMNS", "", "", "", "", "", "", ""],
            ["Column Name", "Required?", "Description", "Example", "", "", "", ""],
            ["Name", "YES", "Full name of the invitee", "John Smith", "", "", "", ""],
            ["Email", "YES", "Valid email address (used to check duplicates)", "john@example.com", "", "", "", ""],
            ["Phone", "YES", "Phone number with country code", "+20 123 456 7890", "", "", "", ""],
            [],
            ["OPTIONAL COLUMNS", "", "", "", "", "", "", ""],
            ["Column Name", "Required?", "Description", "Example", "", "", "", ""],
            ["Position", "NO", "Job title or position", "Manager", "", "", "", ""],
            ["Company", "NO", "Company name", "ABC Corporation", "", "", "", ""],
            ["Category", "NO", "Any category for grouping", "VIP", "", "", "", ""],
            ["Invitation Class", "NO", "Must be: none, white, or gold", "gold", "", "", "", ""],
            ["Notes", "NO", "Any additional notes", "Important guest", "", "", "", ""],
            [],
            ["IMPORTANT NOTES", "", "", "", "", "", "", ""],
            ["1. Do not change the column headers in the template", "", "", "", "", "", "", ""],
            ["2. All rows with missing Name, Email, or Phone will be skipped", "", "", "", "", "", "", ""],
            ["3. If an invitee with the same email already exists in this event, the row will be skipped", "", "", "", "", "", "", ""],
            ["4. Phone numbers should include country code (e.g., +20 for Egypt, +1 for USA)", "", "", "", "", "", "", ""],
            ["5. The system will automatically set you as the inviter", "", "", "", "", "", "", ""],
            ["6. All imported invitees will have status 'Waiting for Approval'", "", "", "", "", "", "", ""],
            ["7. If an invitee with the same email exists globally, their info will be updated", "", "", "", "", "", "", ""],
            [],
            ["Go to the 'Template' sheet to start importing data →", "", "", "", "", "", "", ""],
        ]
        
        for i, row_data in enumerate(instructions, start=1):
            for j, cell_value in enumerate(row_data, start=1):
                cell = instructions_ws.cell(row=i, column=j, value=cell_value)
                
                # Style headers
                if i == 2 or i == 8:
                    cell.font = Font(bold=True, color="FFFFFF")
                    cell.fill = PatternFill(start_color="10B981", end_color="10B981", fill_type="solid")
                elif i == 3 or i == 9:
                    cell.font = Font(bold=True)
                    cell.fill = PatternFill(start_color="E5E7EB", end_color="E5E7EB", fill_type="solid")
                elif i == 16:
                    cell.font = Font(bold=True, color="FFFFFF")
                    cell.fill = PatternFill(start_color="EF4444", end_color="EF4444", fill_type="solid")
                elif i == 24:
                    cell.font = Font(bold=True, size=12, color="3B82F6")
        
        # Adjust column widths
        instructions_ws.column_dimensions['A'].width = 25
        instructions_ws.column_dimensions['B'].width = 12
        instructions_ws.column_dimensions['C'].width = 50
        instructions_ws.column_dimensions['D'].width = 25
        
        # Create Template sheet
        template_ws = wb.create_sheet("Template", 1)
        
        # Headers
        headers = ["Name", "Email", "Phone", "Position", "Company", "Category", "Invitation Class", "Notes"]
        for col, header in enumerate(headers, start=1):
            cell = template_ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")
        
        # Add sample data
        sample_data = [
            ["Ahmed Hassan", "ahmed.hassan@example.com", "+20 100 123 4567", "CEO", "Tech Solutions", "VIP", "gold", "Key stakeholder"],
            ["Sarah Mohamed", "sarah.mohamed@example.com", "+20 101 234 5678", "Marketing Director", "Creative Agency", "Guest", "white", ""],
            ["Mohamed Ali", "mohamed.ali@example.com", "+20 102 345 6789", "Sales Manager", "Sales Corp", "", "none", "Follow up required"],
        ]
        
        for row_idx, row_data in enumerate(sample_data, start=2):
            for col_idx, value in enumerate(row_data, start=1):
                template_ws.cell(row=row_idx, column=col_idx, value=value)
        
        # Adjust column widths
        template_ws.column_dimensions['A'].width = 20
        template_ws.column_dimensions['B'].width = 30
        template_ws.column_dimensions['C'].width = 20
        template_ws.column_dimensions['D'].width = 20
        template_ws.column_dimensions['E'].width = 20
        template_ws.column_dimensions['F'].width = 15
        template_ws.column_dimensions['G'].width = 18
        template_ws.column_dimensions['H'].width = 30
        
        # Save template
        template_dir = 'tmp'
        os.makedirs(template_dir, exist_ok=True)
        template_path = os.path.join(template_dir, 'invitees_import_template.xlsx')
        wb.save(template_path)
        
        return template_path
