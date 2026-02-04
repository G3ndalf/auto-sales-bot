from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import (
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

from app.config import settings
from app.texts import START_WELCOME

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    kb = None
    if settings.webapp_url:
        kb = ReplyKeyboardMarkup(
            keyboard=[
                [
                    KeyboardButton(
                        text="🚗 Подать объявление",
                        web_app=WebAppInfo(url=settings.webapp_url),
                    ),
                ],
                [
                    KeyboardButton(
                        text="📋 Каталог",
                        web_app=WebAppInfo(url=f"{settings.webapp_url}/catalog"),
                    ),
                ],
            ],
            resize_keyboard=True,
        )
    await message.answer(START_WELCOME, reply_markup=kb)
