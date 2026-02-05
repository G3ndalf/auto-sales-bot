"""add region column to car_ads & plate_ads, has_gbo to car_ads

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6g7h8'
down_revision = 'b2c3d4e5f6g7'
branch_labels = None
depends_on = None


def upgrade():
    # ГБО (boolean) для car_ads
    op.add_column('car_ads', sa.Column('has_gbo', sa.Boolean(), server_default='false', nullable=False))
    # Регион для car_ads и plate_ads
    op.add_column('car_ads', sa.Column('region', sa.String(100), nullable=True))
    op.add_column('plate_ads', sa.Column('region', sa.String(100), nullable=True))


def downgrade():
    op.drop_column('plate_ads', 'region')
    op.drop_column('car_ads', 'region')
    op.drop_column('car_ads', 'has_gbo')
