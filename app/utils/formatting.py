"""Number and price formatting utilities."""


def format_number(n: int) -> str:
    """123456 → '123 456'"""
    return f"{n:,}".replace(",", " ")


def format_price(n: int) -> str:
    """123456 → '123 456 ₽'"""
    return format_number(n) + " ₽"
