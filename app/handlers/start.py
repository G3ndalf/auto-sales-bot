from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from app.texts import START_WELCOME

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    await message.answer(START_WELCOME)
