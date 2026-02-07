"""Telegram initData HMAC validation and user authentication.

Implements server-side validation per:
https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""

import hashlib
import hmac
import json
import logging
from urllib.parse import parse_qs, unquote

from aiohttp import web

from app.config import settings

logger = logging.getLogger(__name__)


def validate_init_data(init_data: str, bot_token: str) -> dict | None:
    """Validate Telegram initData HMAC signature.

    Args:
        init_data: Raw initData query string from Telegram WebApp.
        bot_token: Bot token for HMAC key derivation.

    Returns:
        Parsed data dict if valid, None if invalid.
    """
    if not init_data or not bot_token:
        return None

    try:
        # Parse query string
        parsed = parse_qs(init_data, keep_blank_values=True)
        # parse_qs returns lists; flatten to single values
        params = {k: v[0] for k, v in parsed.items()}

        received_hash = params.pop("hash", None)
        if not received_hash:
            return None

        # Sort remaining params alphabetically and build check string
        check_parts = sorted(f"{k}={v}" for k, v in params.items())
        check_string = "\n".join(check_parts)

        # Derive secret key: HMAC-SHA256("WebAppData", bot_token)
        secret_key = hmac.new(
            b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256
        ).digest()

        # Calculate expected hash
        expected_hash = hmac.new(
            secret_key, check_string.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        # Timing-safe comparison
        if not hmac.compare_digest(expected_hash, received_hash):
            return None

        # Parse user JSON if present
        if "user" in params:
            try:
                params["user"] = json.loads(params["user"])
            except (json.JSONDecodeError, TypeError):
                pass

        return params

    except Exception:
        logger.exception("Error validating initData")
        return None


def get_user_id_from_init_data(init_data: str, bot_token: str) -> int | None:
    """Extract and validate user_id from initData.

    Returns user's telegram_id if initData is valid, None otherwise.
    """
    data = validate_init_data(init_data, bot_token)
    if not data:
        return None

    user = data.get("user")
    if isinstance(user, dict):
        uid = user.get("id")
        if uid:
            return int(uid)

    return None


def get_authenticated_user(request: web.Request) -> int | None:
    """Extract authenticated user_id from request via initData validation.

    Checks:
    1. X-Telegram-Init-Data header
    2. initData query parameter

    Returns telegram user_id if valid, None otherwise.
    """
    init_data = (
        request.headers.get("X-Telegram-Init-Data")
        or request.query.get("initData")
    )
    if not init_data:
        return None

    bot_token = request.app.get("bot_token") or settings.bot_token
    return get_user_id_from_init_data(init_data, bot_token)


def get_authenticated_user_or_fallback(request: web.Request) -> int | None:
    """Get authenticated user_id, with fallback to query param for backwards compat.

    Priority:
    1. Validated initData (secure)
    2. user_id query param / X-Telegram-User-Id header (legacy fallback)

    TODO: Remove fallback once all clients send initData.
    """
    uid = get_authenticated_user(request)
    if uid:
        return uid

    # Legacy fallback
    user_id_str = (
        request.query.get("user_id")
        or request.headers.get("X-Telegram-User-Id")
    )
    if user_id_str:
        try:
            return int(user_id_str)
        except (ValueError, TypeError):
            pass

    return None
