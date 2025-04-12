"""Initial migration with Room and Box

Revision ID: bdaad971fc72
Revises: 
Create Date: 2025-04-13 00:38:51.213283
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'bdaad971fc72'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('rooms',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('password', sa.String(length=80), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('boxes',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('top', sa.Integer(), nullable=True),
        sa.Column('left', sa.Integer(), nullable=True),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('room_id', sa.Integer(), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('boxes')
    op.drop_table('rooms')
