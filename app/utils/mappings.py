"""Shared enum mappings for ad data (used by web_app handler and API)."""

from app.models.car_ad import FuelType, Transmission

FUEL_TYPE_MAP = {
    "бензин": FuelType.PETROL,
    "дизель": FuelType.DIESEL,
    "газ": FuelType.GAS,
    "электро": FuelType.ELECTRIC,
    "гибрид": FuelType.HYBRID,
}

TRANSMISSION_MAP = {
    "механика": Transmission.MANUAL,
    "автомат": Transmission.AUTOMATIC,
    "робот": Transmission.ROBOT,
    "вариатор": Transmission.VARIATOR,
}
