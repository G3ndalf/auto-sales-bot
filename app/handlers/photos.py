"""FSM handler for collecting photos after ad submission."""

import logging

from aiogram import Bot, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, ReplyKeyboardRemove
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import MAX_CAR_PHOTOS, MAX_PLATE_PHOTOS
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


class PhotoCollectStates(StatesGroup):
    waiting_photos = State()


async def _finish_and_notify(
    message: Message,
    state: FSMContext,
    bot: Bot,
    session: AsyncSession,
    photo_count: int,
) -> None:
    """Clear FSM state and notify admins about the new ad."""
    data = await state.get_data()
    ad_id = data["ad_id"]
    ad_type = data["ad_type"]

    logger.info(
        "[photos] _finish_and_notify: ad_type=%s, ad_id=%d, photos=%d",
        ad_type, ad_id, photo_count,
    )

    # Step 1: Clear FSM state
    try:
        await state.clear()
        logger.info("[photos] FSM state cleared for user %d", message.from_user.id)
    except Exception:
        logger.exception("[photos] Failed to clear FSM state for user %d", message.from_user.id)

    # Step 2: Send completion message to user
    try:
        if photo_count > 0:
            await message.answer(
                PHOTOS_SAVED.format(count=photo_count),
                reply_markup=ReplyKeyboardRemove(),
            )
        else:
            await message.answer(PHOTOS_SKIPPED, reply_markup=ReplyKeyboardRemove())
        logger.info("[photos] Completion message sent to user %d", message.from_user.id)
    except Exception:
        logger.exception("[photos] Failed to send completion message to user %d", message.from_user.id)

    # Step 3: Notify admins (AFTER photos are done)
    try:
        from app.utils.notify import notify_admins

        logger.info("[photos] Importing ad services for notification...")
        from app.services.car_ad_service import get_car_ad
        from app.services.plate_ad_service import get_plate_ad

        logger.info("[photos] Fetching ad %s #%d from DB...", ad_type, ad_id)
        if ad_type == "car_ad":
            ad = await get_car_ad(session, ad_id)
        else:
            ad = await get_plate_ad(session, ad_id)

        if ad:
            logger.info("[photos] Sending admin notification for %s #%d...", ad_type, ad_id)
            await notify_admins(bot, ad, ad_type, photo_count=photo_count)
            logger.info("[photos] Admin notification sent for %s #%d", ad_type, ad_id)
        else:
            logger.error("[photos] Ad not found for notification: %s #%d", ad_type, ad_id)
    except Exception:
        logger.exception("[photos] Failed to notify admins about %s #%d", ad_type, ad_id)


@router.message(PhotoCollectStates.waiting_photos, lambda m: m.text == WEB_APP_SKIP_PHOTOS)
async def skip_photos(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """User chose to skip sending photos."""
    logger.info("[photos] User %d skipped photos", message.from_user.id)
    await _finish_and_notify(message, state, bot, session, photo_count=0)


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

    # Take the largest photo size
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
    logger.info("[photos] Photo %d/%d collected for %s #%d", photo_count, max_photos, ad_type, ad_id)

    if photo_count >= max_photos:
        # Limit reached — finish
        await _finish_and_notify(message, state, bot, session, photo_count=photo_count)
    else:
        await message.answer(
            PHOTOS_COUNT.format(count=photo_count, max=max_photos)
        )


@router.message(PhotoCollectStates.waiting_photos, lambda m: m.text and m.text.lower() in ("готово", "done", "стоп"))
async def finish_photos(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """User finished sending photos."""
    data = await state.get_data()
    photo_count = data.get("photo_count", 0)
    logger.info("[photos] User %d finished with %d photos", message.from_user.id, photo_count)
    await _finish_and_notify(message, state, bot, session, photo_count=photo_count)


# BUG 6 fix: Catch-all for unexpected messages during photo collection
@router.message(PhotoCollectStates.waiting_photos)
async def unknown_message_in_photos(message: Message):
    """Handle unexpected messages (stickers, video, voice, random text)."""
    await message.answer(PHOTOS_UNEXPECTED)
