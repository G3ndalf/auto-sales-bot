import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AdType(str, enum.Enum):
    """Ad type enum for photos."""

    CAR = "car"
    PLATE = "plate"


class AdPhoto(Base):
    """Photo attached to an advertisement."""

    __tablename__ = "ad_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    ad_type: Mapped[AdType] = mapped_column(
        Enum(AdType, native_enum=True),
        nullable=False,
    )
    ad_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    file_id: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
