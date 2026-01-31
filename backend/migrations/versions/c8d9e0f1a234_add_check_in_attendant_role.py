"""Add check_in_attendant role and user_event_assignments table

Revision ID: c8d9e0f1a234
Revises: b7c4d8e9f123
Create Date: 2026-01-31 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c8d9e0f1a234'
down_revision = 'b7c4d8e9f123'
branch_labels = None
depends_on = None


def upgrade():
    # Create user_event_assignments table
    op.create_table('user_event_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'event_id', name='uq_user_event_assignment')
    )
    op.create_index('ix_user_event_assignments_user_id', 'user_event_assignments', ['user_id'])
    op.create_index('ix_user_event_assignments_event_id', 'user_event_assignments', ['event_id'])
    
    # Update the role constraint to include check_in_attendant
    # First drop the existing constraint
    op.drop_constraint('check_user_role', 'users', type_='check')
    
    # Then create the new constraint with the additional role
    op.create_check_constraint(
        'check_user_role',
        'users',
        "role IN ('admin', 'director', 'organizer', 'check_in_attendant')"
    )


def downgrade():
    # Drop the new constraint
    op.drop_constraint('check_user_role', 'users', type_='check')
    
    # Restore the original constraint
    op.create_check_constraint(
        'check_user_role',
        'users',
        "role IN ('admin', 'director', 'organizer')"
    )
    
    # Drop the user_event_assignments table
    op.drop_index('ix_user_event_assignments_event_id', table_name='user_event_assignments')
    op.drop_index('ix_user_event_assignments_user_id', table_name='user_event_assignments')
    op.drop_table('user_event_assignments')
