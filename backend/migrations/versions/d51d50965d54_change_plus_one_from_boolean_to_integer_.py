"""Change plus_one from boolean to integer for guest count

Revision ID: d51d50965d54
Revises: c9663ec139fc
Create Date: 2026-01-24 19:03:48.857741

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd51d50965d54'
down_revision = 'c9663ec139fc'
branch_labels = None
depends_on = None


def upgrade():
    # PostgreSQL requires explicit cast from boolean to integer
    op.execute('ALTER TABLE event_invitees ALTER COLUMN plus_one TYPE INTEGER USING (CASE WHEN plus_one THEN 1 ELSE 0 END)')


def downgrade():
    # Convert back to boolean (any value > 0 becomes true)
    op.execute('ALTER TABLE event_invitees ALTER COLUMN plus_one TYPE BOOLEAN USING (plus_one > 0)')
