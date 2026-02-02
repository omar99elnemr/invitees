"""
Seed database with initial data
Run this script after setting up the database
"""
from app import create_app, db
from app.models.user import User
from app.models.inviter_group import InviterGroup
import bcrypt

def seed_database():
    """Create initial admin user and inviter groups"""
    app = create_app()
    
    with app.app_context():
        print("Starting database seed...")
        
        # Check if data already exists
        if InviterGroup.query.first() or User.query.first():
            print("Database already contains data. Skipping seed.")
            return
        
        # Create inviter groups
        print("Creating inviter groups...")
        groups = [
            InviterGroup(
                name='Sales Team',
                description='Sales and Business Development Department'
            ),
            InviterGroup(
                name='Marketing Division',
                description='Marketing and Communications Team'
            ),
            InviterGroup(
                name='HR Department',
                description='Human Resources Department'
            ),
            InviterGroup(
                name='Executive Office',
                description='Executive and Management Office'
            ),
            InviterGroup(
                name='Operations',
                description='Operations and Logistics Department'
            ),
        ]
        
        for group in groups:
            db.session.add(group)
        
        db.session.commit()
        print(f"Created {len(groups)} inviter groups")
        
        # Create admin user
        print("Creating admin user...")
        admin = User(
            username='admin',
            email='admin@example.com',
            full_name='System Administrator',
            password_hash=bcrypt.hashpw('Admin@123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            role='admin',
            inviter_group_id=None,  # Admin users are not assigned to any inviter group
            is_active=True
        )
        
        db.session.add(admin)
        db.session.commit()
        
        print(f"✓ Admin user created successfully!")
        print(f"  Username: admin")
        print(f"  Password: Admin@123")
        print(f"  Role: admin")
        print(f"\n⚠️  IMPORTANT: Change the admin password after first login!")
        
        # Create sample users for testing
        print("\nCreating sample users for testing...")
        
        sample_users = [
            User(
                username='director1',
                email='director1@example.com',
                full_name='John Director',
                password_hash=bcrypt.hashpw('Director@123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                role='director',
                inviter_group_id=groups[1].id,
                is_active=True
            ),
            User(
                username='organizer1',
                email='organizer1@example.com',
                full_name='Jane Organizer',
                password_hash=bcrypt.hashpw('Organizer@123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                role='organizer',
                inviter_group_id=groups[2].id,
                is_active=True
            ),
        ]
        
        for user in sample_users:
            db.session.add(user)
        
        db.session.commit()
        
        print(f"✓ Created {len(sample_users)} sample users")
        print(f"  Director - username: director1, password: Director@123")
        print(f"  Organizer - username: organizer1, password: Organizer@123")
        
        print("\n✅ Database seed completed successfully!")

if __name__ == '__main__':
    seed_database()
