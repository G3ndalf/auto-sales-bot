"""FSM handler for collecting photos after ad submission."""

import logging

from aiogram import Bot, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import MAX_CAR_PHOTOS, MAX_PLATE_PHOTOS
from app.models.car_ad import AdStatus
from app.models.photo import AdPhoto, AdType
from app.texts import (
    PHOTOS_SAVED,
    PHOTOS_LIMIT_REACHED,
    PHOTOS_SKIPPED,
    PHOTOS_COUNT,
    PHOTOS_UNEXPECTED,
    WEB_APP_SKIP_PHOTOS,
)

logger = logging.getLogger(__name__)
router = Router()

PHOTOS_DONE_BTN = "✅ Готово"


class PhotoCollectStates(StatesGroup):
    waiting_photos = State()


def _skip_keyboard() -> ReplyKeyboardMarkup:
    """Keyboard with skip button (no photos yet)."""
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=WEB_APP_SKIP_PHOTOS)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def _done_keyboard() -> ReplyKeyboardMarkup:
    """Keyboard with done button (has photos)."""
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=PHOTOS_DONE_BTN)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


async def _finish_and_publish(
    message: Message,
    state: FSMContext,
    bot: Bot,
    session: AsyncSession,
    photo_count: int,
) -> None:
    """Clear FSM, auto-approve ad, publish to channel."""
    data = await state.get_data()
    ad_id = data["ad_id"]
    ad_type = data["ad_type"]
    await state.clear()

    # Send completion message
    if photo_count > 0:
        await message.answer(
            PHOTOS_SAVED.format(count=photo_count),
            reply_markup=ReplyKeyboardRemove(),
        )
    else:
        await message.answer(PHOTOS_SKIPPED, reply_markup=ReplyKeyboardRemove())

    # Auto-approve and publish
    try:
        from app.services.car_ad_service import get_car_ad
        from app.services.plate_ad_service import get_plate_ad
        from app.utils.publish import publish_to_channel

        if ad_type == "car_ad":
            ad = await get_car_ad(session, ad_id)
        else:
            ad = await get_plate_ad(session, ad_id)

        if ad:
            # Auto-approve
            ad.status = AdStatus.APPROVED
            logger.info("[photos] Auto-approved %s #%d with %d photos", ad_type, ad_id, photo_count)

            # Publish to channel
            cb_type = "car" if ad_type == "car_ad" else "plate"
            await publish_to_channel(bot, ad, cb_type, session)

            await message.answer("🎉 Объявление опубликовано!")
        else:
            logger.error("[photos] Ad not found: %s #%d", ad_type, ad_id)
    except Exception:
        logger.exception("[photos] Failed to publish %s #%d", ad_type, ad_id)


@router.message(PhotoCollectStates.waiting_photos, lambda m: m.text == WEB_APP_SKIP_PHOTOS)
async def skip_photos(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """User chose to skip sending photos."""
    await _finish_and_publish(message, state, bot, session, photo_count=0)


@router.message(PhotoCollectStates.waiting_photos, lambda m: m.text == PHOTOS_DONE_BTN)
async def done_photos(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """User pressed Done button."""
    data = await state.get_data()
    photo_count = data.get("photo_count", 0)
    await _finish_and_publish(message, state, bot, session, photo_count=photo_count)


@router.message(PhotoCollectStates.waiting_photos, lambda m: m.photo is not None)
async def collect_photo(
    message: Message,
    state: FSMContext,
    session: AsyncSession,
    bot: Bot,
):
    """Collect a photo from the user."""
    data = await state.get_data()
    ad_id = data["ad_id"]
    ad_type = data["ad_type"]
    photo_count = data.get("photo_count", 0)

    max_photos = MAX_CAR_PHOTOS if ad_type == "car_ad" else MAX_PLATE_PHOTOS

    if photo_count >= max_photos:
        await message.answer(PHOTOS_LIMIT_REACHED.format(max=max_photos))
        return

    # Save photo
    file_id = message.photo[-1].file_id
    photo_ad_type = AdType.CAR if ad_type == "car_ad" else AdType.PLATE
    photo = AdPhoto(
        ad_type=photo_ad_type,
        ad_id=ad_id,
        file_id=file_id,
        position=photo_count,
    )
    session.add(photo)

    photo_count += 1
    await state.update_data(photo_count=photo_count)

    if photo_count >= max_photos:
        # Limit reached — auto-finish
        await _finish_and_publish(message, state, bot, session, photo_count=photo_count)
    else:
        # Show "✅ Готово" button instead of "⏭ Пропустить"
        await message.answer(
            PHOTOS_COUNT.format(count=photo_count, max=max_photos),
            reply_markup=_done_keyboard(),
        )


@router.message(PhotoCollectStates.waiting_photos, lambda m: m.text and m.text.lower() in ("готово", "done", "стоп"))
async def finish_photos(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """User typed done/готово."""
    data = await state.get_data()
    photo_count = data.get("photo_count", 0)
    await _finish_and_publish(message, state, bot, session, photo_count=photo_count)


# Catch-all for unexpected messages during photo collection
@router.message(PhotoCollectStates.waiting_photos)
async def unknown_message_in_photos(message: Message, state: FSMContext):
    """Handle unexpected messages."""
    data = await state.get_data()
    photo_count = data.get("photo_count", 0)
    kb = _done_keyboard() if photo_count > 0 else _skip_keyboard()
    await message.answer(PHOTOS_UNEXPECTED, reply_markup=kb)
