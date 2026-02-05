"""Shared utility for notifying admins about new ads."""

import html
import logging

from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.photo import AdPhoto, AdType
from sqlalchemy import select

logger = logging.getLogger(__name__)


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
    """Format car ad for moderation view (HTML-safe)."""
    from app.texts import ADMIN_CAR_AD_CARD

    return ADMIN_CAR_AD_CARD.format(
        id=ad.id,
        brand=html.escape(ad.brand),
        model=html.escape(ad.model),
        year=ad.year,
        mileage=f"{ad.mileage:,}".replace(",", " "),
        engine=ad.engine_volume,
        fuel=ad.fuel_type.value,
        transmission=ad.transmission.value,
        color=html.escape(ad.color),
        price=f"{ad.price:,}".replace(",", " "),
        city=html.escape(ad.city),
        phone=html.escape(ad.contact_phone),
        telegram=html.escape(ad.contact_telegram) if ad.contact_telegram else "—",
        description=html.escape(ad.description[:300]) if ad.description else "—",
    )


def _format_plate_ad(ad) -> str:
    """Format plate ad for moderation view (HTML-safe)."""
    from app.texts import ADMIN_PLATE_AD_CARD

    return ADMIN_PLATE_AD_CARD.format(
        id=ad.id,
        plate=html.escape(ad.plate_number),
        price=f"{ad.price:,}".replace(",", " "),
        city=html.escape(ad.city),
        phone=html.escape(ad.contact_phone),
        telegram=html.escape(ad.contact_telegram) if ad.contact_telegram else "—",
        description=html.escape(ad.description[:300]) if ad.description else "—",
    )


async def get_photo_count(session: AsyncSession, ad_id: int, ad_type: str) -> int:
    """Get the number of photos for an ad."""
    photo_type = AdType.CAR if ad_type == "car_ad" else AdType.PLATE
    stmt = (
        select(AdPhoto)
        .where(AdPhoto.ad_type == photo_type, AdPhoto.ad_id == ad_id)
    )
    result = await session.execute(stmt)
    return len(result.scalars().all())


async def notify_admins(bot: Bot, ad, ad_type: str, photo_count: int = 0) -> None:
    """Send moderation notification to all admins.

    Args:
        bot: Telegram Bot instance.
        ad: CarAd or PlateAd ORM object.
        ad_type: "car_ad" or "plate_ad".
        photo_count: Number of photos attached.
    """
    # Normalize ad_type for callback_data
    cb_type = "car" if ad_type == "car_ad" else "plate"

    if ad_type == "car_ad":
        text = f"🆕 Новое объявление!\n\n{_format_car_ad(ad)}"
    else:
        text = f"🆕 Новое объявление!\n\n{_format_plate_ad(ad)}"

    if photo_count > 0:
        text += f"\n\n📸 Фото: {photo_count}"

    kb = _moderation_keyboard(cb_type, ad.id)

    logger.info(
        "Notifying %d admin(s) about %s #%d (photos: %d)",
        len(settings.admin_ids), ad_type, ad.id, photo_count,
    )

    for admin_id in settings.admin_ids:
        try:
            await bot.send_message(admin_id, text, reply_markup=kb)
        except Exception:
            logger.exception("Failed to notify admin %d", admin_id)
