from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

from app.config import settings
from app.texts import START_WELCOME

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    kb = None
    if settings.webapp_url:
        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="🚗 Подать объявление",
                        web_app=WebAppInfo(url=settings.webapp_url),
                    ),
                ],
                [
                    InlineKeyboardButton(
                        text="📋 Каталог",
                        web_app=WebAppInfo(url=f"{settings.webapp_url}/catalog"),
                    ),
                ],
            ]
        )
    await message.answer(START_WELCOME, reply_markup=kb)
