from sqlalchemy import Enum, ForeignKey, Integer, String, Text
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
