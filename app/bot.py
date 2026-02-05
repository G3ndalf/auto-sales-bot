import asyncio
import logging

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from app.api import create_api_app
from app.config import settings
from app.database import async_session
from app.handlers import start
from app.handlers import admin
from app.handlers import photos
from app.handlers import web_app
from app.middlewares.db import DbSessionMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())

    # Middleware
    dp.update.middleware(DbSessionMiddleware(session_pool=async_session))

    # Routers (order matters — more specific first)
    dp.include_router(admin.router)
    dp.include_router(photos.router)
    dp.include_router(web_app.router)
    dp.include_router(start.router)

    # Start API server for Mini App catalog (pass bot + FSM storage for submit fallback)
    api_app = create_api_app(async_session, settings.bot_token, bot=bot, storage=dp.storage)
    runner = web.AppRunner(api_app)
    await runner.setup()
    site = web.TCPSite(runner, settings.api_host, settings.api_port)
    await site.start()
    logger.info(f"API server started on {settings.api_host}:{settings.api_port}")

    try:
        await dp.start_polling(bot)
    finally:
        await runner.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
