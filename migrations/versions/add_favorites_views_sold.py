"""Add favorites table, view_count, expires_at, SOLD status

Revision ID: a1b2c3d4e5f6
Revises: 342550911eac
Create Date: 2026-02-05

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '342550911eac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Таблица избранного
    op.create_table('favorites',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('ad_type', postgresql.ENUM('CAR', 'PLATE', name='adtype', create_type=False), nullable=False),
        sa.Column('ad_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'ad_type', 'ad_id', name='uq_favorite'),
    )
    op.create_index('ix_favorites_user_id', 'favorites', ['user_id'])

    # view_count для car_ads и plate_ads
    op.add_column('car_ads', sa.Column('view_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('plate_ads', sa.Column('view_count', sa.Integer(), server_default='0', nullable=False))

    # expires_at для car_ads и plate_ads
    op.add_column('car_ads', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('plate_ads', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))

    # Добавить SOLD в enum adstatus
    # PostgreSQL: нужно ALTER TYPE
    op.execute("ALTER TYPE adstatus ADD VALUE IF NOT EXISTS 'sold'")


def downgrade() -> None:
    op.drop_column('plate_ads', 'expires_at')
    op.drop_column('plate_ads', 'view_count')
    op.drop_column('car_ads', 'expires_at')
    op.drop_column('car_ads', 'view_count')
    op.drop_index('ix_favorites_user_id', table_name='favorites')
    op.drop_table('favorites')
    # Нельзя удалить значение из enum в PostgreSQL без пересоздания
