"""Server-side validation for ad submissions."""

import re
from datetime import datetime

from app.data.brands import BRANDS
from app.utils.mappings import FUEL_TYPE_MAP, TRANSMISSION_MAP


def _check_required_string(
    data: dict,
    field: str,
    label: str,
    min_len: int = 1,
    max_len: int = 100,
) -> list[str]:
    """Validate a required string field; return list of errors."""
    errors: list[str] = []
    val = data.get(field)
    if val is None or (isinstance(val, str) and not val.strip()):
        errors.append(f"{label} — обязательное поле")
        return errors
    val = str(val).strip()
    if len(val) < min_len or len(val) > max_len:
        errors.append(f"{label} — от {min_len} до {max_len} символов")
    return errors


def _check_optional_string(
    data: dict,
    field: str,
    label: str,
    max_len: int,
) -> list[str]:
    """Validate an optional string field; return list of errors."""
    val = data.get(field)
    if val is None or (isinstance(val, str) and not val.strip()):
        return []
    val = str(val).strip()
    if len(val) > max_len:
        return [f"{label} — максимум {max_len} символов"]
    return []


def _check_phone(data: dict, field: str = "contact_phone") -> list[str]:
    """Validate contact phone: required, 5-20 chars, must contain digits."""
    errors: list[str] = []
    val = data.get(field)
    if val is None or (isinstance(val, str) and not val.strip()):
        errors.append("Контактный телефон — обязательное поле")
        return errors
    val = str(val).strip()
    if len(val) < 5 or len(val) > 20:
        errors.append("Контактный телефон — от 5 до 20 символов")
        return errors
    if not re.search(r"\d", val):
        errors.append("Контактный телефон — должен содержать цифры")
    return errors


# ── Car ad ────────────────────────────────────────────────────────────


def validate_car_ad(data: dict) -> list[str]:
    """Validate car_ad fields. Returns a list of error messages (empty = OK)."""
    errors: list[str] = []

    # brand
    errors.extend(_check_required_string(data, "brand", "Марка", 1, 100))

    # model
    errors.extend(_check_required_string(data, "model", "Модель", 1, 100))

    # Validate brand/model against static BRANDS list
    brand_val = str(data.get("brand", "")).strip()
    model_val = str(data.get("model", "")).strip()
    if brand_val and brand_val != "Другая":
        if brand_val not in BRANDS:
            errors.append(f"Марка «{brand_val}» не найдена в каталоге")
        elif model_val and model_val != "Другая":
            if model_val not in BRANDS[brand_val]:
                errors.append(f"Модель «{model_val}» не найдена для марки «{brand_val}»")

    # year (required, int, 1960 — текущий год + 1)
    max_year = datetime.now().year + 1
    year = data.get("year")
    if year is None or year == "":
        errors.append("Год выпуска — обязательное поле")
    else:
        try:
            year_int = int(year)
            if year_int < 1960 or year_int > max_year:
                errors.append(f"Год выпуска — от 1960 до {max_year}")
        except (ValueError, TypeError):
            errors.append("Год выпуска — должно быть числом")

    # price (required, int, > 0, max 100_000_000)
    price = data.get("price")
    if price is None or price == "":
        errors.append("Цена — обязательное поле")
    else:
        try:
            price_int = int(price)
            if price_int <= 0:
                errors.append("Цена — должна быть больше 0")
            elif price_int > 100_000_000:
                errors.append("Цена — максимум 100 000 000")
        except (ValueError, TypeError):
            errors.append("Цена — должна быть числом")

    # mileage (optional, int >= 0, max 10_000_000)
    mileage = data.get("mileage")
    if mileage is not None and mileage != "":
        try:
            mileage_int = int(mileage)
            if mileage_int < 0:
                errors.append("Пробег — не может быть отрицательным")
            elif mileage_int > 10_000_000:
                errors.append("Пробег — максимум 10 000 000")
        except (ValueError, TypeError):
            errors.append("Пробег — должен быть числом")

    # engine_volume (optional, float, 0.1 - 20.0)
    engine = data.get("engine_volume")
    if engine is not None and engine != "":
        try:
            engine_f = float(engine)
            if engine_f < 0.1 or engine_f > 20.0:
                errors.append("Объём двигателя — от 0.1 до 20.0")
        except (ValueError, TypeError):
            errors.append("Объём двигателя — должен быть числом")

    # fuel_type (optional, must be in FUEL_TYPE_MAP)
    fuel = data.get("fuel_type")
    if fuel is not None and fuel != "":
        if str(fuel) not in FUEL_TYPE_MAP:
            allowed = ", ".join(FUEL_TYPE_MAP.keys())
            errors.append(f"Тип топлива — допустимые значения: {allowed}")

    # transmission (optional, must be in TRANSMISSION_MAP)
    trans = data.get("transmission")
    if trans is not None and trans != "":
        if str(trans) not in TRANSMISSION_MAP:
            allowed = ", ".join(TRANSMISSION_MAP.keys())
            errors.append(f"Коробка передач — допустимые значения: {allowed}")

    # city
    errors.extend(_check_required_string(data, "city", "Город", 1, 100))

    # contact_phone
    errors.extend(_check_phone(data))

    # description (optional, max 2000)
    errors.extend(_check_optional_string(data, "description", "Описание", 2000))

    return errors


# ── Plate ad ──────────────────────────────────────────────────────────


def validate_plate_ad(data: dict) -> list[str]:
    """Validate plate_ad fields. Returns a list of error messages (empty = OK)."""
    errors: list[str] = []

    # plate_number
    errors.extend(
        _check_required_string(data, "plate_number", "Номер госномера", 1, 20)
    )

    # price (required, int, > 0, max 50_000_000)
    price = data.get("price")
    if price is None or price == "":
        errors.append("Цена — обязательное поле")
    else:
        try:
            price_int = int(price)
            if price_int <= 0:
                errors.append("Цена — должна быть больше 0")
            elif price_int > 50_000_000:
                errors.append("Цена — максимум 50 000 000")
        except (ValueError, TypeError):
            errors.append("Цена — должна быть числом")

    # city
    errors.extend(_check_required_string(data, "city", "Город", 1, 100))

    # contact_phone
    errors.extend(_check_phone(data))

    # description (optional, max 2000)
    errors.extend(_check_optional_string(data, "description", "Описание", 2000))

    return errors
