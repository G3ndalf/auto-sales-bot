"""Shared utility for publishing approved ads to the Telegram channel."""

import html
import logging

from aiogram import Bot
from aiogram.types import InputMediaPhoto
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.photo import AdPhoto, AdType

logger = logging.getLogger(__name__)


def _fmt_number(n: int) -> str:
    return f"{n:,}".replace(",", " ")


async def publish_to_channel(
    bot: Bot,
    ad,
    ad_type: str,
    session: AsyncSession,
) -> None:
    """Publish an approved ad to the configured channel.

    Args:
        bot: Telegram Bot instance.
        ad: CarAd or PlateAd ORM object.
        ad_type: "car" or "plate".
        session: Active async DB session.
    """
    channel_id = settings.channel_id
    if not channel_id:
        logger.warning("CHANNEL_ID not configured, skipping publish")
        return

    # Get photos
    photo_type = AdType.CAR if ad_type == "car" else AdType.PLATE
    photo_stmt = (
        select(AdPhoto)
        .where(AdPhoto.ad_type == photo_type, AdPhoto.ad_id == ad.id)
        .order_by(AdPhoto.position)
    )
    photos = (await session.execute(photo_stmt)).scalars().all()

    # Format text (escape user data for HTML)
    if ad_type == "car":
        text = (
            f"🚗 <b>{html.escape(ad.brand)} {html.escape(ad.model)}</b> ({ad.year})\n\n"
            f"💰 {_fmt_number(ad.price)} ₽\n"
            f"🛣 {_fmt_number(ad.mileage)} км\n"
            f"⛽ {ad.fuel_type.value} | 🔧 {ad.transmission.value}\n"
            f"🎨 {html.escape(ad.color)} | 🏎 {ad.engine_volume}л\n"
            f"📍 {html.escape(ad.city)}\n"
        )
        if ad.description:
            text += f"\n📝 {html.escape(ad.description[:500])}\n"
        text += f"\n📞 {html.escape(ad.contact_phone)}"
        if ad.contact_telegram:
            text += f"\n📱 {html.escape(ad.contact_telegram)}"
    else:
        text = (
            f"🔢 <b>{html.escape(ad.plate_number)}</b>\n\n"
            f"💰 {_fmt_number(ad.price)} ₽\n"
            f"📍 {html.escape(ad.city)}\n"
        )
        if ad.description:
            text += f"\n📝 {html.escape(ad.description[:500])}\n"
        text += f"\n📞 {html.escape(ad.contact_phone)}"
        if ad.contact_telegram:
            text += f"\n📱 {html.escape(ad.contact_telegram)}"

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
        logger.info("Published ad %s/%s to channel %s", ad_type, ad.id, channel_id)
    except Exception:
        logger.exception("Failed to publish ad %s/%s to channel", ad_type, ad.id)
