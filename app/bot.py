import asyncio
import logging

from aiogram import Bot, Dispatcher

from app.config import settings
from app.database import async_session
from app.handlers import start
from app.middlewares.db import DbSessionMiddleware

logging.basicConfig(level=logging.INFO)


async def main():
    bot = Bot(token=settings.bot_token)
    dp = Dispatcher()

    # Middleware
    dp.update.middleware(DbSessionMiddleware(session_pool=async_session))

    # Routers
    dp.include_router(start.router)

    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
