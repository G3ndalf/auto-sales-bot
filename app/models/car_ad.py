import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class FuelType(str, enum.Enum):
    """Fuel type enum for car ads."""

    PETROL = "бензин"
    DIESEL = "дизель"
    GAS = "газ"
    ELECTRIC = "электро"
    HYBRID = "гибрид"


class Transmission(str, enum.Enum):
    """Transmission type enum for car ads."""

    MANUAL = "механика"
    AUTOMATIC = "автомат"
    ROBOT = "робот"
    VARIATOR = "вариатор"


class AdStatus(str, enum.Enum):
    """Ad status enum for moderation."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SOLD = "sold"  # Отмечено продавцом как проданное


class CarAd(Base, TimestampMixin):
    """Car advertisement model."""

    __tablename__ = "car_ads"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Car details
    brand: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    mileage: Mapped[int] = mapped_column(Integer, nullable=False)
    engine_volume: Mapped[float] = mapped_column(Float, nullable=False)
    fuel_type: Mapped[FuelType] = mapped_column(
        Enum(FuelType, native_enum=True),
        nullable=False,
    )
    transmission: Mapped[Transmission] = mapped_column(
        Enum(Transmission, native_enum=True),
        nullable=False,
    )
    color: Mapped[str] = mapped_column(String(50), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # ГБО (газобаллонное оборудование)
    has_gbo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)

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
