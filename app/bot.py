import asyncio
import logging

from aiogram import Bot, Dispatcher

from app.config import settings
from app.handlers import start

logging.basicConfig(level=logging.INFO)


async def main():
    bot = Bot(token=settings.bot_token)
    dp = Dispatcher()

    dp.include_router(start.router)

    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
