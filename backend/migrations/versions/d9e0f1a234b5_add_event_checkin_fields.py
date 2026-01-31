"""Add event checkin fields

Revision ID: d9e0f1a234b5
Revises: c8d9e0f1a234
Create Date: 2026-01-31

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd9e0f1a234b5'
down_revision = 'c8d9e0f1a234'
branch_labels = None
depends_on = None


def upgrade():
    # Add event code column
    op.add_column('events', sa.Column('code', sa.String(50), nullable=True))
    op.create_index('ix_events_code', 'events', ['code'], unique=True)
    
    # Add check-in PIN fields
    op.add_column('events', sa.Column('checkin_pin', sa.String(6), nullable=True))
    op.add_column('events', sa.Column('checkin_pin_active', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('events', sa.Column('checkin_pin_auto_deactivate_hours', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('events', 'checkin_pin_auto_deactivate_hours')
    op.drop_column('events', 'checkin_pin_active')
    op.drop_column('events', 'checkin_pin')
    op.drop_index('ix_events_code', table_name='events')
    op.drop_column('events', 'code')
