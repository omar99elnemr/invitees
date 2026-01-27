"""
User service
Handles user management operations
"""
import bcrypt
from flask import request
from app import db
from app.models.user import User
from app.models.inviter_group import InviterGroup
from app.models.audit_log import AuditLog
from datetime import datetime

class UserService:
    """Service for user management operations"""
    
    @staticmethod
    def create_user(username, password, role, email, full_name=None, inviter_group_id=None, created_by_user_id=None):
        """
        Create a new user
        Returns (user, error_message)
        """
        # Validate username
        if User.query.filter_by(username=username).first():
            return None, 'Username already exists'
        
        # Validate email
        if User.query.filter_by(email=email).first():
            return None, 'Email already exists'
        
        # Validate role
        if role not in ('admin', 'director', 'organizer'):
            return None, 'Invalid role'
        
        # Admin users should not belong to any inviter group
        if role == 'admin':
            inviter_group_id = None
        
        # Validate inviter group exists
        if inviter_group_id:
            group = InviterGroup.query.get(inviter_group_id)
            if not group:
                return None, 'Inviter group not found'
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user
        user = User(
            username=username,
            email=email,
            full_name=full_name,
            password_hash=password_hash,
            role=role,
            inviter_group_id=inviter_group_id,
            is_active=True
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Log creation
        AuditLog.log(
            user_id=created_by_user_id,
            action='create_user',
            table_name='users',
            record_id=user.id,
            new_value=f'Created user {username} with role {role}',
            ip_address=request.remote_addr if request else None
        )
        db.session.commit()
        
        return user, None
    
    @staticmethod
    def update_user(user_id, username=None, email=None, full_name=None, role=None, inviter_group_id=None, updated_by_user_id=None):
        """
        Update user information
        Returns (user, error_message)
        """
        user = User.query.get(user_id)
        if not user:
            return None, 'User not found'
        
        old_value = user.to_dict()
        
        # Update fields
        if username and username != user.username:
            # Check if new username already exists
            if User.query.filter_by(username=username).first():
                return None, 'Username already exists'
            user.username = username
        
        if email and email != user.email:
            # Check if new email already exists
            if User.query.filter_by(email=email).first():
                return None, 'Email already exists'
            user.email = email
        
        if full_name is not None:
            user.full_name = full_name
        
        if role and role != user.role:
            if role not in ('admin', 'director', 'organizer'):
                return None, 'Invalid role'
            user.role = role
            # Admin users should not belong to any inviter group
            if role == 'admin':
                user.inviter_group_id = None
        
        # Skip inviter_group_id update if user is admin (already set to None above)
        if user.role == 'admin':
            inviter_group_id = None
        
        if inviter_group_id is not None and inviter_group_id != user.inviter_group_id:
            if inviter_group_id:
                group = InviterGroup.query.get(inviter_group_id)
                if not group:
                    return None, 'Inviter group not found'
            user.inviter_group_id = inviter_group_id
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log update
        if updated_by_user_id:
            AuditLog.log(
                user_id=updated_by_user_id,
                action='update_user',
                table_name='users',
                record_id=user.id,
                old_value=str(old_value),
                new_value=str(user.to_dict()),
                ip_address=request.remote_addr if request else None
            )
            db.session.commit()
        
        return user, None
    
    @staticmethod
    def activate_user(user_id, activated_by_user_id):
        """Activate a user account"""
        user = User.query.get(user_id)
        if not user:
            return None, 'User not found'
        
        if user.is_active:
            return user, 'User is already active'
        
        user.is_active = True
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log activation
        AuditLog.log(
            user_id=activated_by_user_id,
            action='activate_user',
            table_name='users',
            record_id=user.id,
            new_value=f'Activated user {user.username}',
            ip_address=request.remote_addr
        )
        db.session.commit()
        
        return user, None
    
    @staticmethod
    def deactivate_user(user_id, deactivated_by_user_id):
        """Deactivate a user account"""
        user = User.query.get(user_id)
        if not user:
            return None, 'User not found'
        
        if not user.is_active:
            return user, 'User is already inactive'
        
        user.is_active = False
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log deactivation
        AuditLog.log(
            user_id=deactivated_by_user_id,
            action='deactivate_user',
            table_name='users',
            record_id=user.id,
            new_value=f'Deactivated user {user.username}',
            ip_address=request.remote_addr
        )
        db.session.commit()
        
        return user, None
    
    @staticmethod
    def get_all_users(filters=None):
        """Get all users with optional filters"""
        query = User.query
        
        if filters:
            if 'role' in filters and filters['role']:
                query = query.filter_by(role=filters['role'])
            
            if 'is_active' in filters and filters['is_active'] is not None:
                query = query.filter_by(is_active=filters['is_active'])
            
            if 'inviter_group_id' in filters and filters['inviter_group_id']:
                query = query.filter_by(inviter_group_id=filters['inviter_group_id'])
            
            if 'search' in filters and filters['search']:
                search_term = f'%{filters["search"]}%'
                query = query.filter(User.username.ilike(search_term))
        
        return query.order_by(User.created_at.desc()).all()
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID"""
        return User.query.get(user_id)
