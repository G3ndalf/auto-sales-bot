from app.models.base import Base, TimestampMixin
from app.models.car_ad import AdStatus, CarAd, FuelType, Transmission
from app.models.favorite import Favorite
from app.models.photo import AdPhoto, AdType
from app.models.plate_ad import PlateAd
from app.models.user import User

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "CarAd",
    "PlateAd",
    "AdPhoto",
    "Favorite",
    "FuelType",
    "Transmission",
    "AdStatus",
    "AdType",
]
