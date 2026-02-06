"""Generic helper utilities."""

from typing import Any


def clean_telegram_contact(value: Any) -> str | None:
    """Очистить telegram username."""
    if isinstance(value, str):
        return value.strip() or None
    return None
