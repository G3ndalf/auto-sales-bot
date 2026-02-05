"""Start command handler with deep link support.

Handles:
  /start              — main menu with webapp buttons
  /start msg_car_N    — deep link to view car ad #N with seller contacts
  /start msg_plate_N  — deep link to view plate ad #N with seller contacts

Deep links are used in "contact seller" buttons shared from the catalog,
allowing users to open the bot and immediately see the ad card + contacts.
"""

import logging
import re
import time

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import (
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    WebAppInfo,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.car_ad import AdStatus, CarAd
from app.models.plate_ad import PlateAd
from app.models.photo import AdPhoto, AdType
from app.texts import START_WELCOME, ADMIN_PANEL_BTN

logger = logging.getLogger(__name__)

router = Router()

# Regex для парсинга deep link аргументов вида msg_car_5 / msg_plate_3
_DEEP_LINK_RE = re.compile(r"^msg_(car|plate)_(\d+)$")


def _webapp_url(path: str = "", admin: bool = False, uid: int = 0) -> str:
    """Build webapp URL with HashRouter path and cache-busting query param.

    Используем HashRouter (/#/path) вместо BrowserRouter (/path),
    т.к. Telegram iOS WebView плохо обрабатывает pushState —
    при client-side навигации экран становится пустым.

    С HashRouter все маршруты через hash-fragment, WebView не вмешивается.
    """
    base = settings.webapp_url.rstrip("/")
    ts = int(time.time())
    params = f"v={ts}"
    if uid:
        params += f"&uid={uid}"
    if admin and settings.admin_token:
        params += f"&token={settings.admin_token}"
    # HashRouter: пути через #/, query params ПЕРЕД hash
    hash_path = f"#/{path.lstrip('/')}" if path else ""
    return f"{base}?{params}{hash_path}"


def _format_price(price: int) -> str:
    """Format price with thousands separator for display.

    Example: 1500000 → '1 500 000 ₽'
    """
    return f"{price:,}".replace(",", " ") + " ₽"


@router.message(CommandStart())
async def cmd_start(message: Message, session: AsyncSession):
    """Handle /start command.

    Checks for deep link arguments first:
    - /start msg_car_5   → показать карточку авто #5 с контактами
    - /start msg_plate_3 → показать карточку номера #3 с контактами

    If no deep link — show the main menu with webapp buttons.

    The `session` parameter is injected by DbSessionMiddleware.
    """
    # ── Проверяем deep link аргумент ───────────────────────────────
    # message.text для /start msg_car_5 будет "/start msg_car_5"
    args = _extract_deep_link_arg(message.text or "")
    if args:
        await _handle_deep_link(message, session, args)
        return

    # ── Стандартное меню /start ─────────────────────────────────────
    kb = None
    if settings.webapp_url:
        uid = message.from_user.id if message.from_user else 0
        # ВСЕ кнопки используют _webapp_url() для cache-busting.
        # Каждый /start генерирует уникальные URL с ?v={timestamp},
        # чтобы Telegram WebView не использовал кэшированную версию.
        keyboard_rows = [
            [
                KeyboardButton(
                    text="🚗 Подать объявление",
                    web_app=WebAppInfo(url=_webapp_url(uid=uid)),
                ),
            ],
            [
                KeyboardButton(
                    text="📋 Каталог",
                    web_app=WebAppInfo(url=_webapp_url("/catalog")),
                ),
            ],
        ]
        # Admin button — only for admins
        if message.from_user and message.from_user.id in settings.admin_ids:
            keyboard_rows.append([
                KeyboardButton(
                    text=ADMIN_PANEL_BTN,
                    web_app=WebAppInfo(url=_webapp_url("/admin", admin=True)),
                ),
            ])
        kb = ReplyKeyboardMarkup(keyboard=keyboard_rows, resize_keyboard=True)
    await message.answer(START_WELCOME, reply_markup=kb)


def _extract_deep_link_arg(text: str) -> re.Match | None:
    """Extract deep link argument from /start command text.

    Returns a regex Match with groups (ad_type, ad_id) if the argument
    matches the expected pattern, or None otherwise.

    Example:
      "/start msg_car_5" → Match(groups=("car", "5"))
      "/start"           → None
      "/start hello"     → None
    """
    parts = text.strip().split(maxsplit=1)
    if len(parts) < 2:
        return None
    return _DEEP_LINK_RE.match(parts[1])


async def _handle_deep_link(
    message: Message,
    session: AsyncSession,
    match: re.Match,
) -> None:
    """Handle deep link for viewing an ad with seller contacts.

    Deep link format: msg_{car|plate}_{ad_id}

    Loads the ad from DB, checks it's APPROVED, and sends a formatted
    card with contact info to the user.

    If the ad doesn't exist or isn't approved — sends an error message.
    """
    ad_type = match.group(1)   # "car" or "plate"
    ad_id = int(match.group(2))

    if ad_type == "car":
        await _show_car_contact_card(message, session, ad_id)
    else:
        await _show_plate_contact_card(message, session, ad_id)


async def _show_car_contact_card(
    message: Message,
    session: AsyncSession,
    ad_id: int,
) -> None:
    """Показать карточку авто-объявления с контактами продавца.

    Загружает CarAd по ID, проверяет что статус APPROVED,
    отправляет пользователю форматированную карточку.
    Если есть фото — отправляет первое фото + подпись.
    """
    stmt = select(CarAd).where(CarAd.id == ad_id, CarAd.status == AdStatus.APPROVED)
    ad = (await session.execute(stmt)).scalar_one_or_none()

    if not ad:
        await message.answer("❌ Объявление не найдено или снято.")
        return

    # Контакт Telegram — форматируем как ссылку если есть
    tg_contact = "—"
    if ad.contact_telegram:
        # Убираем @ если есть, формируем ссылку
        username = ad.contact_telegram.lstrip("@")
        tg_contact = f"@{username}"

    # Форматируем карточку
    card_text = (
        f"🚗 <b>{ad.brand} {ad.model}</b> ({ad.year})\n"
        f"━━━━━━━━━━━━━━━\n"
        f"💰 {_format_price(ad.price)}\n"
        f"📍 {ad.city}\n"
        f"🛣 {ad.mileage:,} км\n".replace(",", " ") +
        f"⛽ {ad.fuel_type.value} | 🔧 {ad.transmission.value}\n"
        f"━━━━━━━━━━━━━━━\n"
        f"📞 <b>Телефон:</b> {ad.contact_phone}\n"
        f"📱 <b>Telegram:</b> {tg_contact}\n"
    )

    if ad.description:
        card_text += f"\n📝 {ad.description}"

    # Попробовать отправить с фото (если есть)
    await _send_card_with_optional_photo(
        message, session, card_text, ad_id, AdType.CAR,
    )


async def _show_plate_contact_card(
    message: Message,
    session: AsyncSession,
    ad_id: int,
) -> None:
    """Показать карточку номер-объявления с контактами продавца.

    Аналогично _show_car_contact_card, но для PlateAd.
    """
    stmt = select(PlateAd).where(PlateAd.id == ad_id, PlateAd.status == AdStatus.APPROVED)
    ad = (await session.execute(stmt)).scalar_one_or_none()

    if not ad:
        await message.answer("❌ Объявление не найдено или снято.")
        return

    tg_contact = "—"
    if ad.contact_telegram:
        username = ad.contact_telegram.lstrip("@")
        tg_contact = f"@{username}"

    card_text = (
        f"🔢 <b>Номер: {ad.plate_number}</b>\n"
        f"━━━━━━━━━━━━━━━\n"
        f"💰 {_format_price(ad.price)}\n"
        f"📍 {ad.city}\n"
        f"━━━━━━━━━━━━━━━\n"
        f"📞 <b>Телефон:</b> {ad.contact_phone}\n"
        f"📱 <b>Telegram:</b> {tg_contact}\n"
    )

    if ad.description:
        card_text += f"\n📝 {ad.description}"

    await _send_card_with_optional_photo(
        message, session, card_text, ad_id, AdType.PLATE,
    )


async def _send_card_with_optional_photo(
    message: Message,
    session: AsyncSession,
    card_text: str,
    ad_id: int,
    ad_type: AdType,
) -> None:
    """Отправить карточку объявления, с фото если есть.

    Если у объявления есть фото — отправляем первое фото с caption.
    Если фото нет — отправляем просто текстовое сообщение.
    При ошибке отправки фото (например, file_id протух) — fallback на текст.
    """
    # Загружаем первое фото
    photo_stmt = (
        select(AdPhoto)
        .where(AdPhoto.ad_type == ad_type, AdPhoto.ad_id == ad_id)
        .order_by(AdPhoto.position)
        .limit(1)
    )
    photo = (await session.execute(photo_stmt)).scalar_one_or_none()

    if photo:
        try:
            # Отправляем фото с подписью (caption)
            await message.answer_photo(photo=photo.file_id, caption=card_text)
            return
        except Exception:
            # file_id мог протухнуть — fallback на текст
            logger.warning(
                "Failed to send photo for ad %s/%d, falling back to text",
                ad_type.value, ad_id,
            )

    # Без фото или при ошибке — отправляем текст
    await message.answer(card_text)
