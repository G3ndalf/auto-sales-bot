"""
AdView — модель уникальных просмотров объявлений.

Хранит пары (user_id, ad_type, ad_id) для предотвращения
повторного подсчёта просмотров от одного пользователя.
"""

from sqlalchemy import BigInteger, Column, Enum, Integer, DateTime, UniqueConstraint, func
from .base import Base
from .car_ad import AdType


class AdView(Base):
    """Уникальный просмотр объявления пользователем."""

    __tablename__ = "ad_views"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    ad_type = Column(Enum(AdType), nullable=False)
    ad_id = Column(Integer, nullable=False)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "ad_type", "ad_id", name="uq_ad_view_user_ad"),
    )
