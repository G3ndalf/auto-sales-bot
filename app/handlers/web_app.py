"""Handler for Mini App web_app_data submissions."""

import html
import json
import logging

from aiogram import Bot, Router
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton
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
    WEB_APP_FSM_OVERWRITE,
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
    logger.info("[web_app] Received web_app_data from user %s", message.from_user.id)
    try:
        data = json.loads(message.web_app_data.data)
    except (json.JSONDecodeError, AttributeError):
        logger.error("[web_app] Invalid JSON in web_app_data")
        await message.answer(WEB_APP_INVALID_DATA)
        return

    ad_type = data.get("type")
    if ad_type not in ("car_ad", "plate_ad"):
        logger.error("[web_app] Unknown ad_type: %s", ad_type)
        await message.answer(WEB_APP_INVALID_DATA)
        return

    try:
        # BUG 5 fix: Check if user is already collecting photos
        current_state = await state.get_state()
        if current_state == PhotoCollectStates.waiting_photos:
            logger.info("[web_app] User %s had active photo collection — clearing", message.from_user.id)
            await state.clear()
            await message.answer(WEB_APP_FSM_OVERWRITE)

        # Step 1: Get or create user
        user = await get_or_create_user(
            session,
            telegram_id=message.from_user.id,
            username=message.from_user.username,
            full_name=message.from_user.full_name,
        )
        logger.info("[web_app] [Step 1] User ready: id=%d, tg=%d", user.id, message.from_user.id)

        # Step 2: Create ad
        if ad_type == "car_ad":
            ad = await _create_car_ad(session, user.id, data)
            await message.answer(WEB_APP_CAR_CREATED)
        else:
            ad = await _create_plate_ad(session, user.id, data)
            await message.answer(WEB_APP_PLATE_CREATED)
        logger.info("[web_app] [Step 2] Ad created: type=%s, id=%d", ad_type, ad.id)

        # Step 3: Ask for photos
        skip_kb = ReplyKeyboardMarkup(
            keyboard=[[KeyboardButton(text=WEB_APP_SKIP_PHOTOS)]],
            resize_keyboard=True,
            one_time_keyboard=True,
        )
        await message.answer(WEB_APP_SEND_PHOTOS, reply_markup=skip_kb)
        logger.info("[web_app] [Step 3] Photo request sent to user %d", message.from_user.id)

        # Step 4: Set FSM state for photo collection
        await state.set_state(PhotoCollectStates.waiting_photos)
        await state.update_data(
            ad_id=ad.id,
            ad_type=ad_type,
            photo_count=0,
        )
        logger.info("[web_app] [Step 4] FSM state set: waiting_photos, ad_id=%d", ad.id)

        # NOTE: Admin notification moved to photos.py — sent AFTER photo collection ends

    except Exception:
        logger.exception("[web_app] Error creating ad from web_app_data")
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
