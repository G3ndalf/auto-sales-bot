"""Admin moderation handlers."""

import logging

from aiogram import Bot, Router
from aiogram.filters import Command
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.car_ad import AdStatus
from app.services.car_ad_service import (
    approve_car_ad,
    get_car_ad,
    get_pending_car_ads,
    reject_car_ad,
)
from app.services.plate_ad_service import (
    approve_plate_ad,
    get_pending_plate_ads,
    get_plate_ad,
    reject_plate_ad,
)
from app.texts import (
    ADMIN_NO_ACCESS,
    ADMIN_NO_PENDING,
    ADMIN_CAR_AD_CARD,
    ADMIN_PLATE_AD_CARD,
    ADMIN_APPROVED,
    ADMIN_REJECTED,
    ADMIN_AD_NOT_FOUND,
    ADMIN_NEXT,
    USER_AD_APPROVED,
    USER_AD_REJECTED,
)

logger = logging.getLogger(__name__)
router = Router()


def _is_admin(user_id: int) -> bool:
    """Check if user is admin."""
    return user_id in settings.admin_ids


def _moderation_keyboard(ad_type: str, ad_id: int) -> InlineKeyboardMarkup:
    """Generate approve/reject inline keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✅ Одобрить",
                    callback_data=f"mod:approve:{ad_type}:{ad_id}",
                ),
                InlineKeyboardButton(
                    text="❌ Отклонить",
                    callback_data=f"mod:reject:{ad_type}:{ad_id}",
                ),
            ],
            [
                InlineKeyboardButton(
                    text="⏭ Пропустить",
                    callback_data=f"mod:skip:{ad_type}:{ad_id}",
                ),
            ],
        ]
    )


def _format_car_ad(ad) -> str:
    """Format car ad for moderation view."""
    return ADMIN_CAR_AD_CARD.format(
        id=ad.id,
        brand=ad.brand,
        model=ad.model,
        year=ad.year,
        mileage=f"{ad.mileage:,}".replace(",", " "),
        engine=ad.engine_volume,
        fuel=ad.fuel_type.value,
        transmission=ad.transmission.value,
        color=ad.color,
        price=f"{ad.price:,}".replace(",", " "),
        city=ad.city,
        phone=ad.contact_phone,
        telegram=ad.contact_telegram or "—",
        description=ad.description[:300] if ad.description else "—",
    )


def _format_plate_ad(ad) -> str:
    """Format plate ad for moderation view."""
    return ADMIN_PLATE_AD_CARD.format(
        id=ad.id,
        plate=ad.plate_number,
        price=f"{ad.price:,}".replace(",", " "),
        city=ad.city,
        phone=ad.contact_phone,
        telegram=ad.contact_telegram or "—",
        description=ad.description[:300] if ad.description else "—",
    )


@router.message(Command("admin", "moderate"))
async def cmd_admin(message: Message, session: AsyncSession):
    """Show pending ads for moderation."""
    if not _is_admin(message.from_user.id):
        await message.answer(ADMIN_NO_ACCESS)
        return

    car_ads = await get_pending_car_ads(session)
    plate_ads = await get_pending_plate_ads(session)

    if not car_ads and not plate_ads:
        await message.answer(ADMIN_NO_PENDING)
        return

    # Show first pending ad
    if car_ads:
        ad = car_ads[0]
        text = _format_car_ad(ad)
        kb = _moderation_keyboard("car", ad.id)
    else:
        ad = plate_ads[0]
        text = _format_plate_ad(ad)
        kb = _moderation_keyboard("plate", ad.id)

    total = len(car_ads) + len(plate_ads)
    text = f"📋 На модерации: {total}\n\n{text}"
    await message.answer(text, reply_markup=kb)


@router.callback_query(lambda c: c.data and c.data.startswith("mod:"))
async def handle_moderation(
    callback: CallbackQuery,
    session: AsyncSession,
    bot: Bot,
):
    """Handle moderation approve/reject/skip callbacks."""
    if not _is_admin(callback.from_user.id):
        await callback.answer(ADMIN_NO_ACCESS, show_alert=True)
        return

    parts = callback.data.split(":")
    action = parts[1]  # approve/reject/skip
    ad_type = parts[2]  # car/plate
    ad_id = int(parts[3])

    if action == "approve":
        if ad_type == "car":
            ad = await approve_car_ad(session, ad_id)
        else:
            ad = await approve_plate_ad(session, ad_id)

        if ad:
            await callback.answer(ADMIN_APPROVED, show_alert=False)
            # Notify user
            try:
                from app.models.user import User
                from sqlalchemy import select

                stmt = select(User).where(User.id == ad.user_id)
                result = await session.execute(stmt)
                user = result.scalar_one_or_none()
                if user:
                    await bot.send_message(user.telegram_id, USER_AD_APPROVED)
            except Exception:
                logger.exception("Failed to notify user about approval")
            # Publish to channel
            await _publish_to_channel(bot, ad, ad_type, session)
        else:
            await callback.answer(ADMIN_AD_NOT_FOUND, show_alert=True)
            return

    elif action == "reject":
        if ad_type == "car":
            ad = await reject_car_ad(session, ad_id, reason="Не прошло модерацию")
        else:
            ad = await reject_plate_ad(session, ad_id, reason="Не прошло модерацию")

        if ad:
            await callback.answer(ADMIN_REJECTED, show_alert=False)
            # Notify user
            try:
                from app.models.user import User
                from sqlalchemy import select

                stmt = select(User).where(User.id == ad.user_id)
                result = await session.execute(stmt)
                user = result.scalar_one_or_none()
                if user:
                    await bot.send_message(user.telegram_id, USER_AD_REJECTED)
            except Exception:
                logger.exception("Failed to notify user about rejection")
        else:
            await callback.answer(ADMIN_AD_NOT_FOUND, show_alert=True)
            return

    # Show next pending ad
    await _show_next_pending(callback, session)


async def _publish_to_channel(bot: Bot, ad, ad_type: str, session: AsyncSession):
    """Publish approved ad to the channel."""
    channel_id = settings.channel_id
    if not channel_id:
        return

    from app.models.photo import AdPhoto, AdType
    from sqlalchemy import select
    from aiogram.types import InputMediaPhoto

    # Get photos
    photo_type = AdType.CAR if ad_type == "car" else AdType.PLATE
    photo_stmt = (
        select(AdPhoto)
        .where(AdPhoto.ad_type == photo_type, AdPhoto.ad_id == ad.id)
        .order_by(AdPhoto.position)
    )
    photos = (await session.execute(photo_stmt)).scalars().all()

    # Format text
    if ad_type == "car":
        text = (
            f"🚗 <b>{ad.brand} {ad.model}</b> ({ad.year})\n\n"
            f"💰 {ad.price:,} ₽\n".replace(",", " ") +
            f"🛣 {ad.mileage:,} км\n".replace(",", " ") +
            f"⛽ {ad.fuel_type.value} | 🔧 {ad.transmission.value}\n"
            f"🎨 {ad.color} | 🏎 {ad.engine_volume}л\n"
            f"📍 {ad.city}\n"
        )
        if ad.description:
            text += f"\n📝 {ad.description[:500]}\n"
        text += f"\n📞 {ad.contact_phone}"
        if ad.contact_telegram:
            text += f"\n📱 {ad.contact_telegram}"
    else:
        text = (
            f"🔢 <b>{ad.plate_number}</b>\n\n"
            f"💰 {ad.price:,} ₽\n".replace(",", " ") +
            f"📍 {ad.city}\n"
        )
        if ad.description:
            text += f"\n📝 {ad.description[:500]}\n"
        text += f"\n📞 {ad.contact_phone}"
        if ad.contact_telegram:
            text += f"\n📱 {ad.contact_telegram}"

    try:
        if photos:
            media = []
            for i, photo in enumerate(photos[:10]):
                media.append(
                    InputMediaPhoto(
                        media=photo.file_id,
                        caption=text if i == 0 else None,
                        parse_mode="HTML" if i == 0 else None,
                    )
                )
            await bot.send_media_group(chat_id=channel_id, media=media)
        else:
            await bot.send_message(chat_id=channel_id, text=text)
    except Exception:
        logger.exception("Failed to publish to channel")


async def _show_next_pending(callback: CallbackQuery, session: AsyncSession):
    """Show next pending ad or 'all done' message."""
    car_ads = await get_pending_car_ads(session)
    plate_ads = await get_pending_plate_ads(session)

    if not car_ads and not plate_ads:
        await callback.message.edit_text(ADMIN_NO_PENDING)
        return

    if car_ads:
        ad = car_ads[0]
        text = _format_car_ad(ad)
        kb = _moderation_keyboard("car", ad.id)
    else:
        ad = plate_ads[0]
        text = _format_plate_ad(ad)
        kb = _moderation_keyboard("plate", ad.id)

    total = len(car_ads) + len(plate_ads)
    text = f"📋 На модерации: {total}\n\n{text}"

    try:
        await callback.message.edit_text(text, reply_markup=kb)
    except Exception:
        await callback.message.answer(text, reply_markup=kb)
