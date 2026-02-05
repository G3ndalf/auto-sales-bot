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


def _webapp_url(path: str = "") -> str:
    """Build webapp URL with cache-busting query param."""
    base = settings.webapp_url.rstrip("/")
    ts = int(time.time())
    url = f"{base}{path}" if path else base
    return f"{url}?v={ts}"


@router.message(CommandStart())
async def cmd_start(message: Message):
    kb = None
    if settings.webapp_url:
        keyboard_rows = [
            [
                KeyboardButton(
                    text="🚗 Подать объявление",
                    web_app=WebAppInfo(url=_webapp_url()),
                ),
            ],
            [
                KeyboardButton(
                    text="📋 Каталог",
                    web_app=WebAppInfo(url=_webapp_url("/catalog")),
                ),
            ],
        ]
        # Admin button — only for admins
        if message.from_user and message.from_user.id in settings.admin_ids:
            keyboard_rows.append([
                KeyboardButton(
                    text=ADMIN_PANEL_BTN,
                    web_app=WebAppInfo(url=_webapp_url("/admin")),
                ),
            ])
        kb = ReplyKeyboardMarkup(keyboard=keyboard_rows, resize_keyboard=True)
    await message.answer(START_WELCOME, reply_markup=kb)
