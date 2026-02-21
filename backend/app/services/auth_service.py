"""
Authentication service
Handles user authentication, password management, and session control
"""
import bcrypt
from flask_login import login_user, logout_user
from flask import request
from app import db
from app.models.user import User
from app.models.audit_log import AuditLog
from datetime import datetime

class AuthService:
    """Service for authentication operations"""
    
    @staticmethod
    def authenticate(username, password):
        """
        Authenticate user with username and password
        Returns user object if successful, None otherwise
        """
        username = username.strip()
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return None
        
        if not user.is_active:
            return None
        
        # Verify password
        if bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            # Update last login
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            # Log successful login
            AuditLog.log(
                user_id=user.id,
                action='login',
                table_name='users',
                record_id=user.id,
                ip_address=request.remote_addr
            )
            db.session.commit()
            
            return user
        
        return None
    
    @staticmethod
    def login(user, remember=False):
        """Log in user and create session"""
        login_user(user, remember=remember)
    
    @staticmethod
    def logout(user):
        """Log out user and end session"""
        if user:
            AuditLog.log(
                user_id=user.id,
                action='logout',
                table_name='users',
                record_id=user.id,
                ip_address=request.remote_addr
            )
            db.session.commit()
        
        logout_user()
    
    @staticmethod
    def change_password(user, old_password, new_password):
        """
        Change user password
        Returns True if successful, False if old password is incorrect
        """
        # Verify old password
        if not bcrypt.checkpw(old_password.encode('utf-8'), user.password_hash.encode('utf-8')):
            return False
        
        # Hash new password
        new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password
        user.password_hash = new_hash
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log password change
        AuditLog.log(
            user_id=user.id,
            action='change_password',
            table_name='users',
            record_id=user.id,
            ip_address=request.remote_addr
        )
        db.session.commit()
        
        return True
    
    @staticmethod
    def reset_password(user, new_password, admin_user_id):
        """
        Reset user password (admin function)
        """
        # Hash new password
        new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password
        user.password_hash = new_hash
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log password reset
        AuditLog.log(
            user_id=admin_user_id,
            action='reset_password',
            table_name='users',
            record_id=user.id,
            new_value=f'Password reset for user {user.username}',
            ip_address=request.remote_addr
        )
        db.session.commit()
        
        return True
    
    @staticmethod
    def validate_password(password):
        """
        Validate password strength
        Returns (is_valid, error_message)
        """
        if len(password) < 8:
            return False, 'Password must be at least 8 characters long'
        
        if not any(c.isupper() for c in password):
            return False, 'Password must contain at least one uppercase letter'
        
        if not any(c.islower() for c in password):
            return False, 'Password must contain at least one lowercase letter'
        
        if not any(c.isdigit() for c in password):
            return False, 'Password must contain at least one number'
        
        return True, None
