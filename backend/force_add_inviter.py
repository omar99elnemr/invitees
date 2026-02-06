from app import create_app, db
from app.models.inviter import Inviter
from app.models.inviter_group import InviterGroup
import sys

app = create_app()

def force_add_inviter_to_group(name, email=None, phone=None, position=None, group_name=None, group_id=None, is_active=True):
    """
    Force add an inviter to a group, bypassing any application-level constraints.
    This works directly at the database level.
    """
    with app.app_context():
        try:
            # Find the group
            target_group = None
            if group_id:
                target_group = InviterGroup.query.get(group_id)
            elif group_name:
                target_group = InviterGroup.query.filter_by(name=group_name).first()
            
            if not target_group:
                print(f"Error: Group not found (ID: {group_id}, Name: {group_name})")
                return False
            
            # Check if inviter already exists
            existing_inviter = Inviter.query.filter_by(name=name).first()
            if existing_inviter:
                print(f"Inviter '{name}' already exists with ID {existing_inviter.id}")
                print(f"Current group: {existing_inviter.inviter_group.name if existing_inviter.inviter_group else 'None'}")
                
                # Update existing inviter
                existing_inviter.inviter_group_id = target_group.id
                existing_inviter.email = email or existing_inviter.email
                existing_inviter.phone = phone or existing_inviter.phone
                existing_inviter.position = position or existing_inviter.position
                existing_inviter.is_active = is_active
                existing_inviter.updated_at = db.func.current_timestamp()
                
                db.session.commit()
                print(f"Updated existing inviter '{name}' to group '{target_group.name}'")
                return existing_inviter.id
            else:
                # Create new inviter
                new_inviter = Inviter(
                    name=name,
                    email=email,
                    phone=phone,
                    position=position,
                    inviter_group_id=target_group.id,
                    is_active=is_active
                )
                
                db.session.add(new_inviter)
                db.session.commit()
                print(f"Created new inviter '{name}' in group '{target_group.name}' with ID {new_inviter.id}")
                return new_inviter.id
                
        except Exception as e:
            print(f"Error adding inviter: {e}")
            db.session.rollback()
            return False

def list_all_groups():
    """List all available inviter groups"""
    with app.app_context():
        groups = InviterGroup.query.order_by(InviterGroup.name).all()
        print("\nAvailable Inviter Groups:")
        print("-" * 50)
        for group in groups:
            print(f"ID: {group.id} | Name: {group.name}")
            if group.description:
                print(f"    Description: {group.description}")
        print("-" * 50)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python force_add_inviter.py list                          # List all groups")
        print("  python force_add_inviter.py add <name> <group_name|group_id> [email] [phone] [position]")
        print("\nExamples:")
        print("  python force_add_inviter.py add 'John Doe' 'Real Estate Division' 'john@example.com' '+1234567890' 'Manager'")
        print("  python force_add_inviter.py add 'Jane Smith' 5 'jane@example.com'")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "list":
        list_all_groups()
    elif command == "add":
        if len(sys.argv) < 4:
            print("Error: Name and group required")
            print("Usage: python force_add_inviter.py add <name> <group_name|group_id> [email] [phone] [position]")
            sys.exit(1)
        
        name = sys.argv[2]
        group_identifier = sys.argv[3]
        email = sys.argv[4] if len(sys.argv) > 4 else None
        phone = sys.argv[5] if len(sys.argv) > 5 else None
        position = sys.argv[6] if len(sys.argv) > 6 else None
        
        # Try to parse group_identifier as integer first (group_id), then as name
        try:
            group_id = int(group_identifier)
            result = force_add_inviter_to_group(name, email, phone, position, group_id=group_id)
        except ValueError:
            # Not an integer, treat as group name
            result = force_add_inviter_to_group(name, email, phone, position, group_name=group_identifier)
        
        if result:
            print(f"\nSuccess! Inviter ID: {result}")
        else:
            print("\nFailed to add inviter")
            sys.exit(1)
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
