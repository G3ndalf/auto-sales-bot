"""add ad_views table for unique view tracking

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6g7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ad_views',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.BigInteger, nullable=False, index=True),
        sa.Column('ad_type', sa.Enum('car', 'plate', name='adtype', create_type=False), nullable=False),
        sa.Column('ad_id', sa.Integer, nullable=False),
        sa.Column('viewed_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'ad_type', 'ad_id', name='uq_ad_view_user_ad'),
    )


def downgrade():
    op.drop_table('ad_views')
