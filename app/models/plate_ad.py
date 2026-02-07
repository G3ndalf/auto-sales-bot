from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.car_ad import AdStatus


class PlateAd(Base, TimestampMixin):
    """Plate (car number) advertisement model."""

    __tablename__ = "plate_ads"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Plate details
    plate_number: Mapped[str] = mapped_column(String(20), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Location and contacts
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    contact_telegram: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Moderation
    status: Mapped[AdStatus] = mapped_column(
        Enum(AdStatus, native_enum=True),
        default=AdStatus.PENDING,
        nullable=False,
        index=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Статистика
    view_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    # Автоистечение (30 дней по умолчанию)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # F23: ID сообщения в канале (для удаления дублей при повторной публикации)
    channel_message_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
