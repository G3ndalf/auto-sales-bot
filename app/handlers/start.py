import time

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import (
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

from app.config import settings
from app.texts import ADMIN_PANEL_BTN, START_WELCOME

router = Router()


def _webapp_url(path: str = "", admin: bool = False) -> str:
    """Build webapp URL with cache-busting query param."""
    base = settings.webapp_url.rstrip("/")
    ts = int(time.time())
    url = f"{base}{path}" if path else base
    params = f"v={ts}"
    if admin and settings.admin_token:
        params += f"&token={settings.admin_token}"
    return f"{url}?{params}"


@router.message(CommandStart())
async def cmd_start(message: Message):
    kb = None
    if settings.webapp_url:
        base = settings.webapp_url.rstrip("/")
        uid = message.from_user.id if message.from_user else 0
        keyboard_rows = [
            [
                KeyboardButton(
                    text="🚗 Подать объявление",
                    web_app=WebAppInfo(url=f"{base}?uid={uid}"),
                ),
            ],
            [
                KeyboardButton(
                    text="📋 Каталог",
                    web_app=WebAppInfo(url=f"{base}/catalog"),
                ),
            ],
        ]
        # Admin button — only for admins
        if message.from_user and message.from_user.id in settings.admin_ids:
            keyboard_rows.append([
                KeyboardButton(
                    text=ADMIN_PANEL_BTN,
                    web_app=WebAppInfo(url=_webapp_url("/admin", admin=True)),
                ),
            ])
        kb = ReplyKeyboardMarkup(keyboard=keyboard_rows, resize_keyboard=True)
    await message.answer(START_WELCOME, reply_markup=kb)
