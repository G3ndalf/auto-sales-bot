"""Handler for Mini App web_app_data submissions."""

import json
import logging

from aiogram import Bot, Router
from aiogram.types import Message
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.handlers.photos import PhotoCollectStates
from app.models.car_ad import FuelType, Transmission
from app.services.car_ad_service import create_car_ad
from app.services.plate_ad_service import create_plate_ad
from app.services.user_service import get_or_create_user
from app.texts import (
    WEB_APP_CAR_CREATED,
    WEB_APP_PLATE_CREATED,
    WEB_APP_INVALID_DATA,
    WEB_APP_SEND_PHOTOS,
    WEB_APP_SKIP_PHOTOS,
    WEB_APP_ERROR,
)

logger = logging.getLogger(__name__)
router = Router()


FUEL_TYPE_MAP = {
    "бензин": FuelType.PETROL,
    "дизель": FuelType.DIESEL,
    "газ": FuelType.GAS,
    "электро": FuelType.ELECTRIC,
    "гибрид": FuelType.HYBRID,
}

TRANSMISSION_MAP = {
    "механика": Transmission.MANUAL,
    "автомат": Transmission.AUTOMATIC,
    "робот": Transmission.ROBOT,
    "вариатор": Transmission.VARIATOR,
}


@router.message(lambda m: m.web_app_data is not None)
async def handle_web_app_data(
    message: Message,
    session: AsyncSession,
    state: FSMContext,
    bot: Bot,
):
    """Process data received from Telegram Mini App."""
    logger.info(
        "Received web_app_data from user %s: %s",
        message.from_user.id,
        message.web_app_data.data[:200],
    )
    try:
        data = json.loads(message.web_app_data.data)
    except (json.JSONDecodeError, AttributeError):
        logger.error("Invalid JSON in web_app_data")
        await message.answer(WEB_APP_INVALID_DATA)
        return

    ad_type = data.get("type")
    if ad_type not in ("car_ad", "plate_ad"):
        logger.warning("Unknown ad_type=%s in web_app_data", ad_type)
        await message.answer(WEB_APP_INVALID_DATA)
        return

    try:
        # Step 1: Get or create user
        logger.info("[Step 1] Getting/creating user telegram_id=%s", message.from_user.id)
        user = await get_or_create_user(
            session,
            telegram_id=message.from_user.id,
            username=message.from_user.username,
            full_name=message.from_user.full_name,
        )
        logger.info("[Step 1] User ready: id=%s", user.id)

        # Step 2: Create ad
        logger.info("[Step 2] Creating %s for user_id=%s", ad_type, user.id)
        if ad_type == "car_ad":
            ad = await _create_car_ad(session, user.id, data)
            logger.info("[Step 2] Car ad created: id=%s", ad.id)
            await message.answer(WEB_APP_CAR_CREATED)
            logger.info("[Step 2] Confirmation message sent")
        else:
            ad = await _create_plate_ad(session, user.id, data)
            logger.info("[Step 2] Plate ad created: id=%s", ad.id)
            await message.answer(WEB_APP_PLATE_CREATED)
            logger.info("[Step 2] Confirmation message sent")

        # Step 3: Ask for photos
        logger.info("[Step 3] Sending photo request to user %s", message.from_user.id)
        from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

        skip_kb = ReplyKeyboardMarkup(
            keyboard=[[KeyboardButton(text=WEB_APP_SKIP_PHOTOS)]],
            resize_keyboard=True,
            one_time_keyboard=True,
        )
        await message.answer(WEB_APP_SEND_PHOTOS, reply_markup=skip_kb)
        logger.info("[Step 3] Photo request sent successfully")

        # Step 4: Set FSM state for photo collection
        logger.info("[Step 4] Setting FSM state to waiting_photos")
        await state.set_state(PhotoCollectStates.waiting_photos)
        await state.update_data(
            ad_id=ad.id,
            ad_type=ad_type,
            photo_count=0,
        )
        logger.info("[Step 4] FSM state set: ad_id=%s, ad_type=%s", ad.id, ad_type)

        # Step 5: Notify admins
        logger.info("[Step 5] Notifying admins about new %s id=%s", ad_type, ad.id)
        await _notify_admins(bot, ad, ad_type)
        logger.info("[Step 5] Admin notification complete")

    except Exception as e:
        logger.exception("Error creating ad from web_app_data: %s", e)
        await message.answer(WEB_APP_ERROR)


async def _create_car_ad(session: AsyncSession, user_id: int, data: dict):
    """Create car ad from Mini App data."""
    contact_tg = data.get("contact_telegram")
    if isinstance(contact_tg, str):
        contact_tg = contact_tg.strip() or None

    return await create_car_ad(
        session,
        user_id=user_id,
        brand=data["brand"].strip(),
        model=data["model"].strip(),
        year=int(data["year"]),
        mileage=int(data.get("mileage", 0)),
        engine_volume=float(data.get("engine_volume", 0)),
        fuel_type=FUEL_TYPE_MAP.get(data.get("fuel_type", ""), FuelType.PETROL),
        transmission=TRANSMISSION_MAP.get(data.get("transmission", ""), Transmission.MANUAL),
        color=data.get("color", "").strip(),
        price=int(data["price"]),
        description=data.get("description", "").strip(),
        city=data["city"].strip(),
        contact_phone=data["contact_phone"].strip(),
        contact_telegram=contact_tg,
    )


async def _notify_admins(bot: Bot, ad, ad_type: str):
    """Send moderation notification to all admins."""
    from app.config import settings
    from app.handlers.admin import _format_car_ad, _format_plate_ad, _moderation_keyboard

    logger.info("_notify_admins called: ad_type=%s, ad_id=%s", ad_type, ad.id)

    if ad_type == "car_ad":
        text = f"🆕 Новое объявление!\n\n{_format_car_ad(ad)}"
        kb = _moderation_keyboard("car", ad.id)
    else:
        text = f"🆕 Новое объявление!\n\n{_format_plate_ad(ad)}"
        kb = _moderation_keyboard("plate", ad.id)

    logger.info("Admin IDs to notify: %s", settings.admin_ids)
    for admin_id in settings.admin_ids:
        try:
            logger.info("Sending moderation message to admin %s", admin_id)
            await bot.send_message(admin_id, text, reply_markup=kb)
            logger.info("Successfully notified admin %s", admin_id)
        except Exception:
            logger.exception("Failed to notify admin %s", admin_id)


async def _create_plate_ad(session: AsyncSession, user_id: int, data: dict):
    """Create plate ad from Mini App data."""
    contact_tg = data.get("contact_telegram")
    if isinstance(contact_tg, str):
        contact_tg = contact_tg.strip() or None

    return await create_plate_ad(
        session,
        user_id=user_id,
        plate_number=data["plate_number"].strip(),
        price=int(data["price"]),
        description=data.get("description", "").strip(),
        city=data["city"].strip(),
        contact_phone=data["contact_phone"].strip(),
        contact_telegram=contact_tg,
    )
