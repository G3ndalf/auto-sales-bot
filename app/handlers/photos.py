"""FSM handler for collecting photos after ad submission."""

import logging

from aiogram import Router
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
    WEB_APP_SKIP_PHOTOS,
)

logger = logging.getLogger(__name__)
router = Router()


class PhotoCollectStates(StatesGroup):
    waiting_photos = State()


@router.message(PhotoCollectStates.waiting_photos, lambda m: m.text == WEB_APP_SKIP_PHOTOS)
async def skip_photos(message: Message, state: FSMContext):
    """User chose to skip sending photos."""
    await state.clear()
    await message.answer(PHOTOS_SKIPPED, reply_markup=ReplyKeyboardRemove())


@router.message(PhotoCollectStates.waiting_photos, lambda m: m.photo is not None)
async def collect_photo(
    message: Message,
    state: FSMContext,
    session: AsyncSession,
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

    if photo_count >= max_photos:
        await state.clear()
        await message.answer(
            PHOTOS_SAVED.format(count=photo_count),
            reply_markup=ReplyKeyboardRemove(),
        )
    else:
        await message.answer(
            PHOTOS_COUNT.format(count=photo_count, max=max_photos)
        )


@router.message(PhotoCollectStates.waiting_photos, lambda m: m.text and m.text.lower() in ("готово", "done", "стоп"))
async def finish_photos(message: Message, state: FSMContext):
    """User finished sending photos."""
    data = await state.get_data()
    photo_count = data.get("photo_count", 0)
    await state.clear()
    if photo_count > 0:
        await message.answer(
            PHOTOS_SAVED.format(count=photo_count),
            reply_markup=ReplyKeyboardRemove(),
        )
    else:
        await message.answer(PHOTOS_SKIPPED, reply_markup=ReplyKeyboardRemove())
