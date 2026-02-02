"""Add attendance tracking fields to event_invitees

Revision ID: b7c4d8e9f123
Revises: ad900b0b75b4
Create Date: 2026-01-28 21:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7c4d8e9f123'
down_revision = 'ad900b0b75b4'
branch_labels = None
depends_on = None


def upgrade():
    # Add attendance tracking columns to event_invitees table
    
    # Attendance code fields
    op.add_column('event_invitees', sa.Column('attendance_code', sa.String(12), nullable=True))
    op.add_column('event_invitees', sa.Column('code_generated_at', sa.DateTime(), nullable=True))
    
    # Invitation dispatch tracking
    op.add_column('event_invitees', sa.Column('invitation_sent', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('event_invitees', sa.Column('invitation_sent_at', sa.DateTime(), nullable=True))
    op.add_column('event_invitees', sa.Column('invitation_method', sa.String(20), nullable=True))
    
    # Portal confirmation tracking
    op.add_column('event_invitees', sa.Column('portal_accessed_at', sa.DateTime(), nullable=True))
    op.add_column('event_invitees', sa.Column('attendance_confirmed', sa.Boolean(), nullable=True))
    op.add_column('event_invitees', sa.Column('confirmed_at', sa.DateTime(), nullable=True))
    op.add_column('event_invitees', sa.Column('confirmed_guests', sa.Integer(), nullable=True))
    
    # Check-in tracking
    op.add_column('event_invitees', sa.Column('checked_in', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('event_invitees', sa.Column('checked_in_at', sa.DateTime(), nullable=True))
    op.add_column('event_invitees', sa.Column('checked_in_by_user_id', sa.Integer(), nullable=True))
    op.add_column('event_invitees', sa.Column('actual_guests', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('event_invitees', sa.Column('check_in_notes', sa.Text(), nullable=True))
    
    # Create indexes for performance
    op.create_index('ix_event_invitees_attendance_code', 'event_invitees', ['attendance_code'], unique=True)
    op.create_index('ix_event_invitees_checked_in', 'event_invitees', ['checked_in'])
    op.create_index('ix_event_invitees_invitation_sent', 'event_invitees', ['invitation_sent'])
    
    # Create foreign key for checked_in_by_user_id
    op.create_foreign_key(
        'fk_event_invitees_checked_in_by_user_id',
        'event_invitees', 'users',
        ['checked_in_by_user_id'], ['id']
    )
    
    # Add check constraint for invitation_method
    op.execute("""
        ALTER TABLE event_invitees 
        ADD CONSTRAINT check_invitation_method 
        CHECK (invitation_method IN ('email', 'whatsapp', 'physical', 'sms') OR invitation_method IS NULL)
    """)


def downgrade():
    # Remove check constraint
    op.execute("ALTER TABLE event_invitees DROP CONSTRAINT IF EXISTS check_invitation_method")
    
    # Remove foreign key
    op.drop_constraint('fk_event_invitees_checked_in_by_user_id', 'event_invitees', type_='foreignkey')
    
    # Remove indexes
    op.drop_index('ix_event_invitees_invitation_sent', 'event_invitees')
    op.drop_index('ix_event_invitees_checked_in', 'event_invitees')
    op.drop_index('ix_event_invitees_attendance_code', 'event_invitees')
    
    # Remove columns (in reverse order of addition)
    op.drop_column('event_invitees', 'check_in_notes')
    op.drop_column('event_invitees', 'actual_guests')
    op.drop_column('event_invitees', 'checked_in_by_user_id')
    op.drop_column('event_invitees', 'checked_in_at')
    op.drop_column('event_invitees', 'checked_in')
    op.drop_column('event_invitees', 'confirmed_guests')
    op.drop_column('event_invitees', 'confirmed_at')
    op.drop_column('event_invitees', 'attendance_confirmed')
    op.drop_column('event_invitees', 'portal_accessed_at')
    op.drop_column('event_invitees', 'invitation_method')
    op.drop_column('event_invitees', 'invitation_sent_at')
    op.drop_column('event_invitees', 'invitation_sent')
    op.drop_column('event_invitees', 'code_generated_at')
    op.drop_column('event_invitees', 'attendance_code')
