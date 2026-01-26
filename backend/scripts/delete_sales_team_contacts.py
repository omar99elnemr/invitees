import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import db
from app.models.inviter_group import InviterGroup
from app.models.invitee import Invitee

def delete_sales_team_contacts():
    group = InviterGroup.query.filter_by(name='Sales Team').first()
    if not group:
        print('No inviter group named "Sales Team" found.')
        return
    contacts = Invitee.query.filter_by(inviter_group_id=group.id).all()
    if not contacts:
        print('No contacts found for Sales Team.')
        return
    print(f'Deleting {len(contacts)} contacts from Sales Team...')
    for c in contacts:
        db.session.delete(c)
    db.session.commit()
    print('All contacts from Sales Team deleted.')

if __name__ == '__main__':
    from app import create_app
    app = create_app()
    with app.app_context():
        delete_sales_team_contacts()