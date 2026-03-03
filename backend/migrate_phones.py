"""
One-time migration script: strip '+' prefix from all phone numbers in the database.
Run from the production backend directory.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Count phones with '+' prefix
    r = db.session.execute(text("SELECT COUNT(1) FROM invitees WHERE phone LIKE '+%'"))
    plus_count = r.scalar()
    r2 = db.session.execute(text("SELECT COUNT(1) FROM invitees WHERE secondary_phone LIKE '+%'"))
    sec_count = r2.scalar()
    print(f"Phones with '+' prefix: {plus_count}")
    print(f"Secondary phones with '+' prefix: {sec_count}")

    if plus_count > 0:
        db.session.execute(text("UPDATE invitees SET phone = LTRIM(phone, '+') WHERE phone LIKE '+%'"))
        print(f"Stripped '+' from {plus_count} phone numbers")

    if sec_count > 0:
        db.session.execute(text("UPDATE invitees SET secondary_phone = LTRIM(secondary_phone, '+') WHERE secondary_phone LIKE '+%'"))
        print(f"Stripped '+' from {sec_count} secondary phone numbers")

    if plus_count > 0 or sec_count > 0:
        db.session.commit()
        print("Migration committed successfully")
    else:
        print("No phones to migrate - all clean already")
