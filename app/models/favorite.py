"""Модель избранного — связь пользователя с понравившимися объявлениями."""
from datetime import datetime
from sqlalchemy import DateTime, Enum, Integer, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from app.models.photo import AdType


class Favorite(Base):
    """Избранное объявление пользователя."""
    __tablename__ = "favorites"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    ad_type: Mapped[AdType] = mapped_column(Enum(AdType, native_enum=True), nullable=False)
    ad_id: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "ad_type", "ad_id", name="uq_favorite"),
    )
