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
    # Используем raw SQL чтобы избежать повторного CREATE TYPE adtype
    op.execute("""
        CREATE TABLE ad_views (
            id SERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL,
            ad_type adtype NOT NULL,
            ad_id INTEGER NOT NULL,
            viewed_at TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT uq_ad_view_user_ad UNIQUE (user_id, ad_type, ad_id)
        )
    """)
    op.create_index('ix_ad_views_user_id', 'ad_views', ['user_id'])


def downgrade():
    op.drop_table('ad_views')
