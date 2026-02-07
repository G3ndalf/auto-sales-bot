"""FSM handler for collecting photos after ad submission."""

import logging
import time

from aiogram import Bot, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
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

    # F13: НЕ авто-одобряем — объявление остаётся PENDING для модерации
    try:
        await message.answer(
            "✅ Объявление отправлено на модерацию! Мы уведомим вас после проверки."
        )
        logger.info("[photos] %s #%d submitted for moderation with %d photos", ad_type, ad_id, photo_count)
    except Exception:
        logger.exception("[photos] Failed to notify user for %s #%d", ad_type, ad_id)


FSM_TIMEOUT_SECONDS = 3600  # F11: 1 час таймаут для FSM


async def _check_fsm_timeout(state: FSMContext, message: Message) -> bool:
    """F11: Проверить, не истёк ли таймаут FSM state (1 час). Возвращает True если истёк."""
    data = await state.get_data()
    started_at = data.get("started_at", 0)
    if started_at and (time.time() - started_at) > FSM_TIMEOUT_SECONDS:
        await state.clear()
        await message.answer(
            "⏰ Время на отправку фото истекло (1 час). Пожалуйста, подайте объявление заново.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return True
    return False


@router.message(PhotoCollectStates.waiting_photos, lambda m: m.text == WEB_APP_SKIP_PHOTOS)
async def skip_photos(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """User chose to skip sending photos."""
    if await _check_fsm_timeout(state, message):
        return
    await _finish_and_publish(message, state, bot, session, photo_count=0)


@router.message(PhotoCollectStates.waiting_photos, lambda m: m.text == PHOTOS_DONE_BTN)
async def done_photos(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """User pressed Done button."""
    if await _check_fsm_timeout(state, message):
        return
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
    if await _check_fsm_timeout(state, message):
        return
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
