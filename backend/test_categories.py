from app import create_app, db
from app.models.category import Category
from app.models.invitee import Invitee
from app.services.invitee_service import InviteeService
from app.models.user import User

app = create_app()

def test_backend():
    with app.app_context():
        print("Testing Categories...")
        
        # 1. Verify Migration
        white = Category.query.filter_by(name='White').first()
        gold = Category.query.filter_by(name='Gold').first()
        
        assert white is not None, "White category missing"
        assert gold is not None, "Gold category missing"
        print(f"Verified default categories: White ID={white.id}, Gold ID={gold.id}")
        
        # 2. Create new Category
        platinum = Category.query.filter_by(name='Platinum').first()
        if not platinum:
            platinum = Category(name='Platinum')
            db.session.add(platinum)
            db.session.commit()
            print(f"Created Platinum ID={platinum.id}")
        else:
            print(f"Platinum already exists ID={platinum.id}")
        
        # 3. Create Invitee with Category Name "Platinum"
        print("Creating invitee with category 'Platinum'...")
        invitee, created, error = InviteeService.create_or_get_invitee(
            name="Test Invitee",
            email="test.invitee@example.com",
            phone="+1234567890",
            category="Platinum"
        )
        
        if error:
            print("Error creating invitee:", error)
            return
            
        print(f"Invitee Created: {invitee.name}, Category ID: {invitee.category_id}")
        assert invitee.category_id == platinum.id, f"Expected {platinum.id}, got {invitee.category_id}"
        
        # 4. Resolve mechanism check
        cat_id = InviteeService._resolve_category_id("Gold")
        assert cat_id == gold.id, "Failed to resolve Gold"
        
        print("Backend verification SUCCESS!")

if __name__ == "__main__":
    test_backend()
