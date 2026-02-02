"""
Manual migration script to add inviter_id to invitees table (PostgreSQL)
"""
from app import create_app, db
from sqlalchemy import text

def add_inviter_id_column():
    with create_app().app_context():
        # Add inviter_id column if it doesn't exist
        db.session.execute(text('''
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='invitees' AND column_name='inviter_id'
                ) THEN
                    ALTER TABLE invitees ADD COLUMN inviter_id INTEGER;
                END IF;
            END$$;
        '''))
        db.session.execute(text('''
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_type='FOREIGN KEY' AND table_name='invitees' AND constraint_name='invitees_inviter_id_fkey'
                ) THEN
                    ALTER TABLE invitees ADD CONSTRAINT invitees_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES inviters(id);
                END IF;
            END$$;
        '''))
        db.session.commit()
        print('inviter_id column and foreign key added to invitees table (if not already present).')

if __name__ == '__main__':
    add_inviter_id_column()
