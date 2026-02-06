"""Add is_all_groups to events

Revision ID: e1f2a3b4c5d6
Revises: d9e0f1a234b5
Create Date: 2025-01-31

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1f2a3b4c5d6'
down_revision = 'd9e0f1a234b5'
branch_labels = None
depends_on = None


def upgrade():
    # Add is_all_groups column to events table
    # When True, the event is accessible by ALL inviter groups
    op.add_column('events', sa.Column('is_all_groups', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('events', 'is_all_groups')
