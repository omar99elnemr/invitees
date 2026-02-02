"""Add new contact fields to invitees table

Revision ID: f8e2a3c4d567
Revises: 4a70eab94824
Create Date: 2026-01-26 16:03:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f8e2a3c4d567'
down_revision = '4a70eab94824'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to invitees table
    op.add_column('invitees', sa.Column('secondary_phone', sa.String(30), nullable=True))
    op.add_column('invitees', sa.Column('title', sa.String(50), nullable=True))
    op.add_column('invitees', sa.Column('address', sa.String(255), nullable=True))
    op.add_column('invitees', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('invitees', sa.Column('plus_one', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    # Remove new columns from invitees table
    op.drop_column('invitees', 'plus_one')
    op.drop_column('invitees', 'notes')
    op.drop_column('invitees', 'address')
    op.drop_column('invitees', 'title')
    op.drop_column('invitees', 'secondary_phone')
