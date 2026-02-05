"""REST API for Mini App catalog (aiohttp).

Endpoints:
  Public:
    GET  /api/brands                          — list brands with approved car ads
    GET  /api/brands/{brand}/models           — list models for a brand
    GET  /api/cars                            — approved car ads (filters: brand, model, city, q, sort)
    GET  /api/cars/{ad_id}                    — single car ad with all photos
    GET  /api/plates                          — approved plate ads (filters: city, q, sort)
    GET  /api/plates/{ad_id}                  — single plate ad
    GET  /api/cities                          — cities with approved ads
    GET  /api/photos/{file_id}                — serve photo (local upload or Telegram proxy)
    POST /api/photos/upload                   — upload photo via multipart (returns photo_id)
    GET  /api/profile/{telegram_id}           — user profile with ad stats
    GET  /api/user/{telegram_id}/ads          — all user's ads (any status) for "My Ads" page

  User (owner-only):
    PUT    /api/ads/car/{ad_id}?user_id=      — partial update car ad (re-moderation if was approved)
    PUT    /api/ads/plate/{ad_id}?user_id=    — partial update plate ad
    DELETE /api/ads/car/{ad_id}?user_id=      — soft-delete car ad (status → rejected)
    DELETE /api/ads/plate/{ad_id}?user_id=    — soft-delete plate ad

  Submit (Mini App fallback):
    POST /api/submit                          — create ad from Mini App

  Admin:
    GET  /api/admin/pending                   — pending ads for moderation
    GET  /api/admin/stats                     — ad statistics
    POST /api/admin/approve/{ad_type}/{ad_id} — approve ad
    POST /api/admin/reject/{ad_type}/{ad_id}  — reject ad
"""

import hmac
import json
import logging
import mimetypes
import re

from aiohttp import ClientSession as HttpClientSession
from aiohttp import web
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.fsm.storage.base import StorageKey
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.config import settings
from app.handlers.photos import PhotoCollectStates
from app.models.car_ad import AdStatus, CarAd, FuelType, Transmission
from app.models.photo import AdPhoto, AdType
from app.models.plate_ad import PlateAd
from app.models.user import User
from app.services.car_ad_service import create_car_ad
from app.services.plate_ad_service import create_plate_ad
from app.services.user_service import get_or_create_user
from app.texts import (
    WEB_APP_CAR_CREATED,
    WEB_APP_PLATE_CREATED,
    WEB_APP_SEND_PHOTOS,
    WEB_APP_SKIP_PHOTOS,
)
from app.utils.mappings import FUEL_TYPE_MAP, TRANSMISSION_MAP
from app.utils.publish import publish_to_channel
from app.utils.validators import validate_car_ad, validate_plate_ad
from app.utils.rate_limiter import submit_limiter
from app.utils.photo_storage import save_photo, get_photo_path, is_local_photo, ALLOWED_TYPES, MAX_PHOTO_SIZE

logger = logging.getLogger(__name__)

# Max request body size for submit endpoint (10 KB)
MAX_SUBMIT_BODY_SIZE = 10 * 1024

# Telegram file_id: alphanumeric, underscores, dashes only
_FILE_ID_RE = re.compile(r"^[A-Za-z0-9_\-]+$")

# ---------------------------------------------------------------------------
# Allowed sort options for car and plate listings.
#
# Keys are the `sort` query param values accepted by GET /api/cars and
# GET /api/plates.  Values are *callables* that, given the model class,
# return an ORDER BY clause element.  Using callables (lambdas) avoids
# creating SQLAlchemy column expressions at import-time, which keeps the
# module free of side-effects.
# ---------------------------------------------------------------------------
_CAR_SORT_OPTIONS: dict[str, object] = {
    "price_asc":   lambda: CarAd.price.asc(),
    "price_desc":  lambda: CarAd.price.desc(),
    "date_new":    lambda: CarAd.created_at.desc(),
    "date_old":    lambda: CarAd.created_at.asc(),
    "mileage_asc": lambda: CarAd.mileage.asc(),
}

_PLATE_SORT_OPTIONS: dict[str, object] = {
    "price_asc":  lambda: PlateAd.price.asc(),
    "price_desc": lambda: PlateAd.price.desc(),
    "date_new":   lambda: PlateAd.created_at.desc(),
    "date_old":   lambda: PlateAd.created_at.asc(),
}


def _escape_like(s: str) -> str:
    """Экранировать спецсимволы LIKE/ILIKE: % и _ → \\% и \\_."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _safe_int(val, default: int = 0) -> int:
    """Safely convert to int, return default on failure."""
    try:
        return int(val) if val not in (None, "", " ") else default
    except (ValueError, TypeError):
        return default


def _safe_float(val, default: float = 0.0) -> float:
    """Safely convert to float, return default on failure."""
    try:
        return float(val) if val not in (None, "", " ") else default
    except (ValueError, TypeError):
        return default


def _get_first_photos(photos_list: list[AdPhoto]) -> dict[int, str]:
    """Build {ad_id: file_id} map keeping only the first photo per ad.

    Assumes *photos_list* is already ordered by position so the first
    occurrence for each ad_id is the cover photo.
    """
    result: dict[int, str] = {}
    for p in photos_list:
        if p.ad_id not in result:
            result[p.ad_id] = p.file_id
    return result


async def _on_startup(app: web.Application):
    """Создать HTTP-клиент для проксирования фото из Telegram."""
    app["http_client"] = HttpClientSession()


async def _on_cleanup(app: web.Application):
    """Закрыть HTTP-клиент при остановке."""
    client = app.get("http_client")
    if client:
        await client.close()


def create_api_app(
    session_pool: async_sessionmaker, bot_token: str, bot=None, storage=None,
) -> web.Application:
    """Create aiohttp app with API routes."""
    app = web.Application(
        middlewares=[cors_middleware],
        client_max_size=10 * 1024 * 1024,  # 10MB для multipart загрузок фото
    )
    app["session_pool"] = session_pool
    app["bot_token"] = bot_token
    if bot:
        app["bot"] = bot
    if storage:
        app["storage"] = storage

    # Lifecycle hooks для HTTP-клиента
    app.on_startup.append(_on_startup)
    app.on_cleanup.append(_on_cleanup)

    # Submit endpoint (sendData fallback)
    app.router.add_post("/api/submit", handle_submit)

    # Загрузка фото из Mini App
    app.router.add_post("/api/photos/upload", handle_photo_upload)

    # Public routes
    app.router.add_get("/api/brands", get_brands)
    app.router.add_get("/api/brands/{brand}/models", get_models)
    app.router.add_get("/api/cars", get_car_ads)
    app.router.add_get("/api/cars/{ad_id}", get_car_ad)
    app.router.add_get("/api/plates", get_plate_ads)
    app.router.add_get("/api/plates/{ad_id}", get_plate_ad_detail)
    app.router.add_get("/api/cities", get_cities)
    app.router.add_get("/api/photos/{file_id}", proxy_photo)
    app.router.add_get("/api/profile/{telegram_id}", get_profile)

    # ── User "My Ads" endpoint ─────────────────────────────────────
    app.router.add_get("/api/user/{telegram_id}/ads", get_user_ads)

    # ── User ad edit / delete ──────────────────────────────────────
    app.router.add_put("/api/ads/car/{ad_id}", edit_car_ad_endpoint)
    app.router.add_put("/api/ads/plate/{ad_id}", edit_plate_ad_endpoint)
    app.router.add_delete("/api/ads/car/{ad_id}", delete_car_ad_endpoint)
    app.router.add_delete("/api/ads/plate/{ad_id}", delete_plate_ad_endpoint)

    # Admin routes
    app.router.add_get("/api/admin/pending", admin_get_pending)
    app.router.add_get("/api/admin/stats", admin_get_stats)
    app.router.add_post("/api/admin/approve/{ad_type}/{ad_id}", admin_approve)
    app.router.add_post("/api/admin/reject/{ad_type}/{ad_id}", admin_reject)

    return app


def _check_admin_access(request: web.Request) -> bool:
    """Check admin access via secret token only.

    Единственный надёжный способ — секретный токен, который бот вставляет
    в URL при создании кнопки админ-панели. user_id/initData ненадёжны
    (можно подделать без верификации подписи).
    """
    token = request.query.get("token")
    if token and settings.admin_token:
        return hmac.compare_digest(token, settings.admin_token)
    return False


@web.middleware
async def cors_middleware(request: web.Request, handler):
    """Add CORS headers to all responses.

    Allows GET, POST, PUT, DELETE, OPTIONS for cross-origin requests
    from the Mini App frontend.
    """
    if request.method == "OPTIONS":
        response = web.Response()
    else:
        response = await handler(request)
    # Ограничиваем CORS: только разрешённые origin'ы
    origin = request.headers.get("Origin", "")
    allowed_origins = {"https://auto.xlmmama.ru"}
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        # Для локальной разработки (localhost)
        if origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1"):
            response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Telegram-User-Id"
    response.headers["Access-Control-Expose-Headers"] = "X-Telegram-User-Id"
    return response


async def get_brands(request: web.Request) -> web.Response:
    """GET /api/brands — list brands with approved car ads."""
    pool = request.app["session_pool"]
    async with pool() as session:
        stmt = (
            select(CarAd.brand, func.count().label("count"))
            .where(CarAd.status == AdStatus.APPROVED)
            .group_by(CarAd.brand)
            .order_by(CarAd.brand)
        )
        result = await session.execute(stmt)
        brands = [{"brand": row.brand, "count": row.count} for row in result.all()]

    return web.json_response(brands)


async def get_models(request: web.Request) -> web.Response:
    """GET /api/brands/{brand}/models — list models for a brand."""
    brand = request.match_info["brand"]
    pool = request.app["session_pool"]
    async with pool() as session:
        stmt = (
            select(CarAd.model, func.count().label("count"))
            .where(CarAd.status == AdStatus.APPROVED, CarAd.brand == brand)
            .group_by(CarAd.model)
            .order_by(CarAd.model)
        )
        result = await session.execute(stmt)
        models = [{"model": row.model, "count": row.count} for row in result.all()]

    return web.json_response(models)


async def get_car_ads(request: web.Request) -> web.Response:
    """GET /api/cars — list approved car ads with filters, search, and sort.

    Query params:
      brand  — exact match on brand
      model  — exact match on model
      city   — exact match on city
      q      — ILIKE search across brand, model, description (OR)
      sort   — ordering: price_asc | price_desc | date_new (default) |
               date_old | mileage_asc
      offset — pagination offset (default 0)
      limit  — page size, capped at 50 (default 20)
    """
    pool = request.app["session_pool"]
    brand = request.query.get("brand")
    model = request.query.get("model")
    city = request.query.get("city")
    q = request.query.get("q")          # full-text-like search term
    sort = request.query.get("sort")    # sort option key
    offset = _safe_int(request.query.get("offset"), 0)
    limit = min(_safe_int(request.query.get("limit"), 20), 50)

    async with pool() as session:
        stmt = select(CarAd).where(CarAd.status == AdStatus.APPROVED)
        count_stmt = select(func.count()).select_from(CarAd).where(CarAd.status == AdStatus.APPROVED)

        # ── Exact filters ──────────────────────────────────────────
        if brand:
            stmt = stmt.where(CarAd.brand == brand)
            count_stmt = count_stmt.where(CarAd.brand == brand)
        if model:
            stmt = stmt.where(CarAd.model == model)
            count_stmt = count_stmt.where(CarAd.model == model)
        if city:
            stmt = stmt.where(CarAd.city == city)
            count_stmt = count_stmt.where(CarAd.city == city)

        # ── Search (q) — ILIKE по brand, model, description (OR) ──
        # Позволяет пользователю искать "BMW" и найти по марке/модели/описанию.
        if q:
            q_escaped = _escape_like(q)
            q_pattern = f"%{q_escaped}%"
            search_filter = or_(
                CarAd.brand.ilike(q_pattern),
                CarAd.model.ilike(q_pattern),
                CarAd.description.ilike(q_pattern),
            )
            stmt = stmt.where(search_filter)
            count_stmt = count_stmt.where(search_filter)

        # ── Sort ───────────────────────────────────────────────────
        # Если sort не указан или невалидный — используем date_new (новые первыми).
        sort_fn = _CAR_SORT_OPTIONS.get(sort, _CAR_SORT_OPTIONS["date_new"])
        stmt = stmt.order_by(sort_fn())

        total = (await session.execute(count_stmt)).scalar_one()
        ads = (
            await session.execute(stmt.offset(offset).limit(limit))
        ).scalars().all()

        # Get first photo for each ad
        ad_ids = [ad.id for ad in ads]
        photos_map: dict[int, str] = {}
        if ad_ids:
            photo_stmt = (
                select(AdPhoto)
                .where(AdPhoto.ad_type == AdType.CAR, AdPhoto.ad_id.in_(ad_ids))
                .order_by(AdPhoto.position)
            )
            all_photos = (await session.execute(photo_stmt)).scalars().all()
            photos_map = _get_first_photos(all_photos)

        items = [
            {
                "id": ad.id,
                "brand": ad.brand,
                "model": ad.model,
                "year": ad.year,
                "price": ad.price,
                "city": ad.city,
                "mileage": ad.mileage,
                "fuel_type": ad.fuel_type.value,
                "transmission": ad.transmission.value,
                "photo": photos_map.get(ad.id),
            }
            for ad in ads
        ]

    return web.json_response({"items": items, "total": total})


async def get_car_ad(request: web.Request) -> web.Response:
    """GET /api/cars/{ad_id} — single car ad with all photos."""
    ad_id = _safe_int(request.match_info.get("ad_id"), 0)
    if not ad_id:
        raise web.HTTPBadRequest(text="Invalid ad_id")
    pool = request.app["session_pool"]

    async with pool() as session:
        stmt = select(CarAd).where(CarAd.id == ad_id, CarAd.status == AdStatus.APPROVED)
        ad = (await session.execute(stmt)).scalar_one_or_none()
        if not ad:
            raise web.HTTPNotFound()

        photo_stmt = (
            select(AdPhoto)
            .where(AdPhoto.ad_type == AdType.CAR, AdPhoto.ad_id == ad_id)
            .order_by(AdPhoto.position)
        )
        photos = (await session.execute(photo_stmt)).scalars().all()

        data = {
            "id": ad.id,
            "brand": ad.brand,
            "model": ad.model,
            "year": ad.year,
            "price": ad.price,
            "mileage": ad.mileage,
            "engine_volume": ad.engine_volume,
            "fuel_type": ad.fuel_type.value,
            "transmission": ad.transmission.value,
            "color": ad.color,
            "city": ad.city,
            "description": ad.description,
            "contact_phone": ad.contact_phone,
            "contact_telegram": ad.contact_telegram,
            "photos": [p.file_id for p in photos],
            "created_at": ad.created_at.isoformat() if ad.created_at else None,
        }

    return web.json_response(data)


async def get_plate_ads(request: web.Request) -> web.Response:
    """GET /api/plates — list approved plate ads with filters, search, and sort.

    Query params:
      city   — exact match on city
      q      — ILIKE search across plate_number, description (OR)
      sort   — ordering: price_asc | price_desc | date_new (default) | date_old
      offset — pagination offset (default 0)
      limit  — page size, capped at 50 (default 20)
    """
    pool = request.app["session_pool"]
    city = request.query.get("city")
    q = request.query.get("q")          # full-text-like search term
    sort = request.query.get("sort")    # sort option key
    offset = _safe_int(request.query.get("offset"), 0)
    limit = min(_safe_int(request.query.get("limit"), 20), 50)

    async with pool() as session:
        stmt = select(PlateAd).where(PlateAd.status == AdStatus.APPROVED)
        count_stmt = select(func.count()).select_from(PlateAd).where(PlateAd.status == AdStatus.APPROVED)

        # ── Exact filters ──────────────────────────────────────────
        if city:
            stmt = stmt.where(PlateAd.city == city)
            count_stmt = count_stmt.where(PlateAd.city == city)

        # ── Search (q) — ILIKE по plate_number, description (OR) ──
        if q:
            q_escaped = _escape_like(q)
            q_pattern = f"%{q_escaped}%"
            search_filter = or_(
                PlateAd.plate_number.ilike(q_pattern),
                PlateAd.description.ilike(q_pattern),
            )
            stmt = stmt.where(search_filter)
            count_stmt = count_stmt.where(search_filter)

        # ── Sort ───────────────────────────────────────────────────
        # mileage_asc не применим к номерам — при невалидном sort используем date_new.
        sort_fn = _PLATE_SORT_OPTIONS.get(sort, _PLATE_SORT_OPTIONS["date_new"])
        stmt = stmt.order_by(sort_fn())

        total = (await session.execute(count_stmt)).scalar_one()
        ads = (
            await session.execute(stmt.offset(offset).limit(limit))
        ).scalars().all()

        # Photos
        ad_ids = [ad.id for ad in ads]
        photos_map: dict[int, str] = {}
        if ad_ids:
            photo_stmt = (
                select(AdPhoto)
                .where(AdPhoto.ad_type == AdType.PLATE, AdPhoto.ad_id.in_(ad_ids))
                .order_by(AdPhoto.position)
            )
            all_photos = (await session.execute(photo_stmt)).scalars().all()
            photos_map = _get_first_photos(all_photos)

        items = [
            {
                "id": ad.id,
                "plate_number": ad.plate_number,
                "price": ad.price,
                "city": ad.city,
                "photo": photos_map.get(ad.id),
            }
            for ad in ads
        ]

    return web.json_response({"items": items, "total": total})


async def get_plate_ad_detail(request: web.Request) -> web.Response:
    """GET /api/plates/{ad_id} — single plate ad."""
    ad_id = _safe_int(request.match_info.get("ad_id"), 0)
    if not ad_id:
        raise web.HTTPBadRequest(text="Invalid ad_id")
    pool = request.app["session_pool"]

    async with pool() as session:
        stmt = select(PlateAd).where(PlateAd.id == ad_id, PlateAd.status == AdStatus.APPROVED)
        ad = (await session.execute(stmt)).scalar_one_or_none()
        if not ad:
            raise web.HTTPNotFound()

        photo_stmt = (
            select(AdPhoto)
            .where(AdPhoto.ad_type == AdType.PLATE, AdPhoto.ad_id == ad_id)
            .order_by(AdPhoto.position)
        )
        photos = (await session.execute(photo_stmt)).scalars().all()

        data = {
            "id": ad.id,
            "plate_number": ad.plate_number,
            "price": ad.price,
            "city": ad.city,
            "description": ad.description,
            "contact_phone": ad.contact_phone,
            "contact_telegram": ad.contact_telegram,
            "photos": [p.file_id for p in photos],
            "created_at": ad.created_at.isoformat() if ad.created_at else None,
        }

    return web.json_response(data)


async def get_cities(request: web.Request) -> web.Response:
    """GET /api/cities — cities with approved ads."""
    pool = request.app["session_pool"]
    async with pool() as session:
        # Combine cities from both ad types
        car_cities = (
            await session.execute(
                select(CarAd.city, func.count().label("c"))
                .where(CarAd.status == AdStatus.APPROVED)
                .group_by(CarAd.city)
            )
        ).all()

        plate_cities = (
            await session.execute(
                select(PlateAd.city, func.count().label("c"))
                .where(PlateAd.status == AdStatus.APPROVED)
                .group_by(PlateAd.city)
            )
        ).all()

        city_counts: dict[str, int] = {}
        for city, count in car_cities:
            city_counts[city] = city_counts.get(city, 0) + count
        for city, count in plate_cities:
            city_counts[city] = city_counts.get(city, 0) + count

        cities = [
            {"city": city, "count": count}
            for city, count in sorted(city_counts.items())
        ]

    return web.json_response(cities)


async def proxy_photo(request: web.Request) -> web.Response:
    """GET /api/photos/{file_id} — serve photo (local or Telegram proxy).

    Сначала проверяет, является ли file_id локальным (loc_*).
    Если да — отдаёт файл с диска.
    Если нет — проксирует через Telegram Bot API (старое поведение).
    """
    file_id = request.match_info["file_id"]

    # Sanitize file_id: only alphanumeric, underscores, dashes allowed
    if not _FILE_ID_RE.match(file_id) or len(file_id) > 256:
        raise web.HTTPBadRequest(text="Invalid file_id")

    # Проверяем, не локальное ли фото (загруженное через Mini App)
    if is_local_photo(file_id):
        path = get_photo_path(file_id)
        if path is None:
            raise web.HTTPNotFound()
        content_type = mimetypes.guess_type(str(path))[0] or "image/jpeg"
        return web.FileResponse(
            path,
            headers={
                "Cache-Control": "public, max-age=86400",
                "Content-Type": content_type,
            },
        )

    # Telegram photo proxy — переиспользуем app-level HTTP-клиент
    bot_token = request.app["bot_token"]
    client = request.app["http_client"]
    api_url = f"https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}"

    async with client.get(api_url) as resp:
        if resp.status != 200:
            raise web.HTTPNotFound()
        data = await resp.json()
        if not data.get("ok"):
            raise web.HTTPNotFound()
        file_path = data["result"]["file_path"]

    download_url = f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
    async with client.get(download_url) as resp:
        if resp.status != 200:
            raise web.HTTPNotFound()
        content = await resp.read()
        content_type_header = resp.headers.get("Content-Type", "image/jpeg")

    return web.Response(
        body=content,
        content_type=content_type_header,
        headers={"Cache-Control": "public, max-age=86400"},
    )


# --- Profile endpoint ---


async def get_profile(request: web.Request) -> web.Response:
    """GET /api/profile/{telegram_id} — user profile with ad stats."""
    telegram_id = _safe_int(request.match_info.get("telegram_id"), 0)
    if not telegram_id:
        return web.json_response({"error": "Invalid telegram_id"}, status=400)

    pool = request.app["session_pool"]
    async with pool() as session:
        user_stmt = select(User).where(User.telegram_id == telegram_id)
        user = (await session.execute(user_stmt)).scalar_one_or_none()

        if not user:
            return web.json_response({
                "name": "Пользователь",
                "username": None,
                "ads": {"total": 0, "active": 0, "pending": 0, "rejected": 0},
            })

        # Count ads by status
        car_counts = {}
        plate_counts = {}
        for label, status in [
            ("active", AdStatus.APPROVED),
            ("pending", AdStatus.PENDING),
            ("rejected", AdStatus.REJECTED),
        ]:
            cc = (await session.execute(
                select(func.count()).select_from(CarAd)
                .where(CarAd.user_id == user.id, CarAd.status == status)
            )).scalar_one()
            pc = (await session.execute(
                select(func.count()).select_from(PlateAd)
                .where(PlateAd.user_id == user.id, PlateAd.status == status)
            )).scalar_one()
            car_counts[label] = cc
            plate_counts[label] = pc

        total = sum(car_counts.values()) + sum(plate_counts.values())

        return web.json_response({
            "name": user.full_name,
            "username": user.username,
            "member_since": user.created_at.strftime("%d.%m.%Y") if user.created_at else None,
            "ads": {
                "total": total,
                "active": car_counts["active"] + plate_counts["active"],
                "pending": car_counts["pending"] + plate_counts["pending"],
                "rejected": car_counts["rejected"] + plate_counts["rejected"],
                "cars": sum(car_counts.values()),
                "plates": sum(plate_counts.values()),
            },
        })


# ---------------------------------------------------------------------------
# "My Ads" endpoint — all user's ads regardless of status
# ---------------------------------------------------------------------------


async def get_user_ads(request: web.Request) -> web.Response:
    """GET /api/user/{telegram_id}/ads — все объявления пользователя.

    Возвращает JSON:
      {
        "cars":   [{id, title, status, price, city, photo, created_at}, ...],
        "plates": [{id, title, status, price, city, photo, created_at}, ...]
      }

    Не требует админской авторизации — пользователь видит только свои.
    Включает ВСЕ статусы: pending, approved, rejected.
    """
    telegram_id = _safe_int(request.match_info.get("telegram_id"), 0)
    if not telegram_id:
        return web.json_response({"error": "Invalid telegram_id"}, status=400)

    pool = request.app["session_pool"]
    async with pool() as session:
        # ── Найти пользователя по telegram_id ──────────────────────
        user_stmt = select(User).where(User.telegram_id == telegram_id)
        user = (await session.execute(user_stmt)).scalar_one_or_none()
        if not user:
            # Пользователь ещё не подавал объявлений — пустой ответ
            return web.json_response({"cars": [], "plates": []})

        # ── Загрузить все car ads пользователя ─────────────────────
        car_stmt = (
            select(CarAd)
            .where(CarAd.user_id == user.id)
            .order_by(CarAd.created_at.desc())
        )
        car_ads = (await session.execute(car_stmt)).scalars().all()

        # ── Загрузить все plate ads пользователя ───────────────────
        plate_stmt = (
            select(PlateAd)
            .where(PlateAd.user_id == user.id)
            .order_by(PlateAd.created_at.desc())
        )
        plate_ads = (await session.execute(plate_stmt)).scalars().all()

        # ── Собрать первые фото для всех объявлений ────────────────
        car_ids = [ad.id for ad in car_ads]
        plate_ids = [ad.id for ad in plate_ads]
        car_photos: dict[int, str] = {}
        plate_photos: dict[int, str] = {}

        if car_ids:
            photo_stmt = (
                select(AdPhoto)
                .where(AdPhoto.ad_type == AdType.CAR, AdPhoto.ad_id.in_(car_ids))
                .order_by(AdPhoto.position)
            )
            car_photos = _get_first_photos(
                (await session.execute(photo_stmt)).scalars().all()
            )

        if plate_ids:
            photo_stmt = (
                select(AdPhoto)
                .where(AdPhoto.ad_type == AdType.PLATE, AdPhoto.ad_id.in_(plate_ids))
                .order_by(AdPhoto.position)
            )
            plate_photos = _get_first_photos(
                (await session.execute(photo_stmt)).scalars().all()
            )

        # ── Формировать ответ ──────────────────────────────────────
        cars_list = [
            {
                "id": ad.id,
                "title": f"{ad.brand} {ad.model}",
                "status": ad.status.value,
                "price": ad.price,
                "city": ad.city,
                "photo": car_photos.get(ad.id),
                "created_at": ad.created_at.isoformat() if ad.created_at else None,
            }
            for ad in car_ads
        ]

        plates_list = [
            {
                "id": ad.id,
                "title": ad.plate_number,
                "status": ad.status.value,
                "price": ad.price,
                "city": ad.city,
                "photo": plate_photos.get(ad.id),
                "created_at": ad.created_at.isoformat() if ad.created_at else None,
            }
            for ad in plate_ads
        ]

    return web.json_response({"cars": cars_list, "plates": plates_list})


# ---------------------------------------------------------------------------
# Edit / Delete ad endpoints — общая логика + тонкие обёртки
# ---------------------------------------------------------------------------

# Разрешённые поля и конвертеры для редактирования car ads
_CAR_ALLOWED_FIELDS = {
    "brand", "model", "year", "mileage", "engine_volume",
    "fuel_type", "transmission", "color", "price",
    "description", "city", "contact_phone", "contact_telegram",
}
_CAR_FIELD_CONVERTERS = {
    "year": lambda v, ad: _safe_int(v),
    "mileage": lambda v, ad: _safe_int(v),
    "price": lambda v, ad: _safe_int(v),
    "engine_volume": lambda v, ad: _safe_float(v),
    "fuel_type": lambda v, ad: FUEL_TYPE_MAP.get(v, ad.fuel_type),
    "transmission": lambda v, ad: TRANSMISSION_MAP.get(v, ad.transmission),
}

# Разрешённые поля и конвертеры для редактирования plate ads
_PLATE_ALLOWED_FIELDS = {
    "plate_number", "price", "description",
    "city", "contact_phone", "contact_telegram",
}
_PLATE_FIELD_CONVERTERS = {
    "price": lambda v, ad: _safe_int(v),
}


async def _edit_ad(
    request: web.Request,
    model_class,
    validator_fn,
    allowed_fields: set[str],
    field_converters: dict,
) -> web.Response:
    """Общая логика редактирования объявления (car или plate).

    Правила:
    - user_id (query param) должен совпадать с владельцем объявления
    - Редактировать можно только PENDING или APPROVED объявления
    - Если объявление было APPROVED — после редактирования статус → PENDING
      (повторная модерация, чтобы не пропустить невалидные правки)
    - Поля валидируются через validator_fn (на основе merged словаря)

    HTTP-ошибки: 400 (валидация), 403 (не владелец), 404 (не найдено / уже rejected)
    """
    ad_id = _safe_int(request.match_info.get("ad_id"), 0)
    if not ad_id:
        return web.json_response({"error": "Invalid ad_id"}, status=400)

    # user_id — telegram_id владельца, передаётся как query param
    user_id_tg = _safe_int(request.query.get("user_id"), 0)
    if not user_id_tg:
        return web.json_response({"error": "Missing user_id"}, status=400)

    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    pool = request.app["session_pool"]
    async with pool() as session:
        # ── Загрузить объявление ───────────────────────────────────
        ad = (await session.execute(
            select(model_class).where(model_class.id == ad_id)
        )).scalar_one_or_none()

        if not ad:
            return web.json_response({"error": "Ad not found"}, status=404)

        # ── Проверка статуса (rejected нельзя редактировать) ───────
        if ad.status not in (AdStatus.PENDING, AdStatus.APPROVED):
            return web.json_response(
                {"error": "Cannot edit rejected ad"}, status=400,
            )

        # ── Проверка владельца ─────────────────────────────────────
        owner = (await session.execute(
            select(User).where(User.id == ad.user_id)
        )).scalar_one_or_none()

        if not owner or owner.telegram_id != user_id_tg:
            return web.json_response({"error": "Forbidden"}, status=403)

        # ── Подготовить merged dict для валидации ──────────────────
        # Берём текущие значения объявления и мержим с присланными,
        # чтобы валидатор проверял полную картину.
        current_data = {}
        for field in allowed_fields:
            val = getattr(ad, field, None)
            # Enum → строковое значение для валидатора
            if hasattr(val, "value"):
                val = val.value
            current_data[field] = val
        merged = {**current_data, **body}

        # ── Валидация ──────────────────────────────────────────────
        errors = validator_fn(merged)
        if errors:
            return web.json_response({"errors": errors}, status=400)

        # ── Применить обновления ───────────────────────────────────
        updated = False
        for field, value in body.items():
            if field not in allowed_fields:
                continue

            converter = field_converters.get(field)
            if converter:
                value = converter(value, ad)
            else:
                value = str(value).strip() if value is not None else None

            setattr(ad, field, value)
            updated = True

        # ── Если было APPROVED — сбросить на PENDING для повторной модерации
        if updated and ad.status == AdStatus.APPROVED:
            ad.status = AdStatus.PENDING

        await session.commit()

    return web.json_response({"ok": True})


async def edit_car_ad_endpoint(request: web.Request) -> web.Response:
    """PUT /api/ads/car/{ad_id}?user_id=<telegram_id> — редактирование авто-объявления."""
    return await _edit_ad(
        request, CarAd, validate_car_ad, _CAR_ALLOWED_FIELDS, _CAR_FIELD_CONVERTERS,
    )


async def edit_plate_ad_endpoint(request: web.Request) -> web.Response:
    """PUT /api/ads/plate/{ad_id}?user_id=<telegram_id> — редактирование номер-объявления."""
    return await _edit_ad(
        request, PlateAd, validate_plate_ad, _PLATE_ALLOWED_FIELDS, _PLATE_FIELD_CONVERTERS,
    )


async def _delete_ad(request: web.Request, model_class) -> web.Response:
    """Общая логика мягкого удаления объявления (car или plate).

    Мягкое удаление: статус → REJECTED, rejection_reason = "Удалено владельцем".
    Это позволяет сохранить данные для истории / аналитики, но объявление
    пропадёт из каталога и из модерации.

    HTTP-ошибки: 400 (невалидные параметры), 403 (не владелец), 404 (не найдено)
    """
    ad_id = _safe_int(request.match_info.get("ad_id"), 0)
    if not ad_id:
        return web.json_response({"error": "Invalid ad_id"}, status=400)

    user_id_tg = _safe_int(request.query.get("user_id"), 0)
    if not user_id_tg:
        return web.json_response({"error": "Missing user_id"}, status=400)

    pool = request.app["session_pool"]
    async with pool() as session:
        ad = (await session.execute(
            select(model_class).where(model_class.id == ad_id)
        )).scalar_one_or_none()

        if not ad:
            return web.json_response({"error": "Ad not found"}, status=404)

        # ── Проверка владельца ─────────────────────────────────────
        owner = (await session.execute(
            select(User).where(User.id == ad.user_id)
        )).scalar_one_or_none()

        if not owner or owner.telegram_id != user_id_tg:
            return web.json_response({"error": "Forbidden"}, status=403)

        # ── Мягкое удаление ────────────────────────────────────────
        ad.status = AdStatus.REJECTED
        ad.rejection_reason = "Удалено владельцем"
        await session.commit()

    return web.json_response({"ok": True})


async def delete_car_ad_endpoint(request: web.Request) -> web.Response:
    """DELETE /api/ads/car/{ad_id}?user_id=<telegram_id> — мягкое удаление авто-объявления."""
    return await _delete_ad(request, CarAd)


async def delete_plate_ad_endpoint(request: web.Request) -> web.Response:
    """DELETE /api/ads/plate/{ad_id}?user_id=<telegram_id> — мягкое удаление номер-объявления."""
    return await _delete_ad(request, PlateAd)


# --- Photo upload endpoint (Mini App) ---


async def handle_photo_upload(request: web.Request) -> web.Response:
    """POST /api/photos/upload — загрузка одного фото через multipart.

    Принимает multipart/form-data с полем "photo".
    Возвращает {"ok": true, "photo_id": "loc_uuid"}.

    Query params:
        user_id — telegram_id пользователя (обязательный, для rate limit)

    Лимит: 5MB, только JPEG/PNG/WebP.
    Rate limit: используется тот же лимитер что и для submit.
    """
    user_id = _safe_int(request.query.get("user_id"), 0)
    if not user_id:
        return web.json_response({"ok": False, "error": "Missing user_id"}, status=400)

    # Rate limit (используем тот же лимитер, ключ "photo:{user_id}")
    denied, reason = submit_limiter.check(f"photo:{user_id}")
    if denied:
        return web.json_response({"ok": False, "error": reason}, status=429)

    try:
        reader = await request.multipart()
        field = await reader.next()

        if field is None or field.name != "photo":
            return web.json_response({"ok": False, "error": "Missing 'photo' field"}, status=400)

        # Извлекаем Content-Type из заголовков multipart-поля
        content_type = field.headers.get("Content-Type", "").split(";")[0].strip()
        if content_type not in ALLOWED_TYPES:
            return web.json_response(
                {"ok": False, "error": "Неподдерживаемый формат. Допустимы: JPEG, PNG, WebP"},
                status=400,
            )

        # Читаем файл порциями с проверкой размера
        data = bytearray()
        while True:
            chunk = await field.read_chunk(8192)
            if not chunk:
                break
            data.extend(chunk)
            if len(data) > MAX_PHOTO_SIZE:
                return web.json_response(
                    {"ok": False, "error": f"Файл слишком большой (макс. {MAX_PHOTO_SIZE // 1024 // 1024}MB)"},
                    status=400,
                )

        if not data:
            return web.json_response({"ok": False, "error": "Пустой файл"}, status=400)

        # Сохраняем на диск и возвращаем идентификатор
        photo_id = save_photo(bytes(data), content_type)
        return web.json_response({"ok": True, "photo_id": photo_id})

    except ValueError as e:
        return web.json_response({"ok": False, "error": str(e)}, status=400)
    except Exception:
        logger.exception("[api/photos/upload] Error uploading photo")
        return web.json_response({"ok": False, "error": "Ошибка загрузки"}, status=500)


# --- Submit endpoint (sendData fallback) ---


async def handle_submit(request: web.Request) -> web.Response:
    """POST /api/submit — create ad from Mini App (fallback for sendData).

    Body: {type: "car_ad"|"plate_ad", user_id: int, ...ad fields...}
    """
    # Check Content-Type
    content_type = request.content_type or ""
    if "application/json" not in content_type:
        return web.json_response(
            {"ok": False, "error": "Content-Type must be application/json"},
            status=415,
        )

    # Check body size (max 10 KB)
    if request.content_length and request.content_length > MAX_SUBMIT_BODY_SIZE:
        return web.json_response(
            {"ok": False, "error": "Request body too large"},
            status=413,
        )

    try:
        raw_body = await request.read()
        if len(raw_body) > MAX_SUBMIT_BODY_SIZE:
            return web.json_response(
                {"ok": False, "error": "Request body too large"},
                status=413,
            )
        data = json.loads(raw_body)
    except (json.JSONDecodeError, Exception):
        return web.json_response({"ok": False, "error": "Invalid JSON"}, status=400)

    ad_type = data.get("type")
    user_id_tg = data.get("user_id")

    if ad_type not in ("car_ad", "plate_ad"):
        return web.json_response({"ok": False, "error": "Invalid ad type"}, status=400)
    if not user_id_tg:
        return web.json_response({"ok": False, "error": "Missing user_id"}, status=400)

    try:
        user_id_tg = int(user_id_tg)
    except (ValueError, TypeError):
        return web.json_response({"ok": False, "error": "Invalid user_id"}, status=400)

    # Rate limit check
    denied, reason = submit_limiter.check(f"user:{user_id_tg}")
    if denied:
        logger.warning("[api/submit] Rate limited user_id=%d: %s", user_id_tg, reason)
        return web.json_response({"ok": False, "error": reason}, status=429)

    # --- Validate fields ---
    if ad_type == "car_ad":
        validation_errors = validate_car_ad(data)
    else:
        validation_errors = validate_plate_ad(data)

    if validation_errors:
        return web.json_response(
            {"ok": False, "errors": validation_errors}, status=400,
        )

    pool = request.app["session_pool"]
    bot = request.app.get("bot")
    storage = request.app.get("storage")

    try:
        # Извлекаем photo_ids из данных (если Mini App отправил фото заранее)
        photo_ids = data.get("photo_ids", [])
        has_photos = False  # флаг: есть ли валидные фото для авто-публикации

        async with pool() as session:
            # Get or create user
            user = await get_or_create_user(
                session,
                telegram_id=user_id_tg,
                username=None,
                full_name=None,
            )

            # Create ad
            contact_tg = data.get("contact_telegram")
            if isinstance(contact_tg, str):
                contact_tg = contact_tg.strip() or None

            if ad_type == "car_ad":
                fuel = FUEL_TYPE_MAP.get(data.get("fuel_type", ""), FuelType.PETROL)
                trans = TRANSMISSION_MAP.get(data.get("transmission", ""), Transmission.MANUAL)

                ad = await create_car_ad(
                    session,
                    user_id=user.id,
                    brand=str(data.get("brand", "")).strip() or "Без марки",
                    model=str(data.get("model", "")).strip() or "Без модели",
                    year=_safe_int(data.get("year"), 2020),
                    mileage=_safe_int(data.get("mileage"), 0),
                    engine_volume=_safe_float(data.get("engine_volume"), 0),
                    fuel_type=fuel,
                    transmission=trans,
                    color=str(data.get("color", "")).strip(),
                    price=_safe_int(data.get("price"), 0),
                    description=str(data.get("description", "")).strip(),
                    city=str(data.get("city", "")).strip() or "Другой",
                    contact_phone=str(data.get("contact_phone", "")).strip(),
                    contact_telegram=contact_tg,
                )
            else:
                ad = await create_plate_ad(
                    session,
                    user_id=user.id,
                    plate_number=str(data.get("plate_number", "")).strip(),
                    price=_safe_int(data.get("price"), 0),
                    description=str(data.get("description", "")).strip(),
                    city=str(data.get("city", "")).strip() or "Другой",
                    contact_phone=str(data.get("contact_phone", "")).strip(),
                    contact_telegram=contact_tg,
                )

            # ── Обработка photo_ids (фото загруженные через /api/photos/upload) ──
            # Если Mini App отправил photo_ids — прикрепляем фото к объявлению
            # и автоматически одобряем + публикуем (без FSM-flow).
            if photo_ids and isinstance(photo_ids, list):
                # Валидация: проверяем что каждый photo_id существует на диске
                valid_photos = []
                for pid in photo_ids[:10]:  # максимум 10 фото
                    if isinstance(pid, str) and is_local_photo(pid) and get_photo_path(pid):
                        valid_photos.append(pid)

                if valid_photos:
                    # Прикрепить фото к объявлению в той же транзакции
                    photo_ad_type_enum = AdType.CAR if ad_type == "car_ad" else AdType.PLATE
                    for i, pid in enumerate(valid_photos):
                        photo = AdPhoto(
                            ad_type=photo_ad_type_enum,
                            ad_id=ad.id,
                            file_id=pid,
                            position=i,
                        )
                        session.add(photo)

                    # Авто-одобрение: фото есть → публикуем сразу
                    ad.status = AdStatus.APPROVED
                    has_photos = True

            await session.commit()

        # ── Пост-коммит логика: зависит от наличия фото ──────────────
        if has_photos:
            # Фото есть → уведомляем и публикуем в канал
            if bot:
                await bot.send_message(user_id_tg, "🎉 Объявление опубликовано!")
                cb_type = "car" if ad_type == "car_ad" else "plate"
                # Для публикации нужна новая сессия (старая закрыта)
                async with pool() as pub_session:
                    await publish_to_channel(bot, ad, cb_type, pub_session)

            return web.json_response({"ok": True, "ad_id": ad.id, "published": True})

        # ── Фото нет — старый flow: просим прислать фото через Telegram ──
        if bot:
            if ad_type == "car_ad":
                await bot.send_message(user_id_tg, WEB_APP_CAR_CREATED)
            else:
                await bot.send_message(user_id_tg, WEB_APP_PLATE_CREATED)

            skip_kb = ReplyKeyboardMarkup(
                keyboard=[[KeyboardButton(text=WEB_APP_SKIP_PHOTOS)]],
                resize_keyboard=True,
                one_time_keyboard=True,
            )
            await bot.send_message(user_id_tg, WEB_APP_SEND_PHOTOS, reply_markup=skip_kb)

        # Set FSM state for photo collection (только если фото не были загружены)
        if storage and bot:
            bot_id = int(settings.bot_token.split(":")[0])
            key = StorageKey(
                bot_id=bot_id,
                chat_id=user_id_tg,
                user_id=user_id_tg,
            )
            await storage.set_state(key=key, state=PhotoCollectStates.waiting_photos)
            await storage.set_data(key=key, data={
                "ad_id": ad.id,
                "ad_type": ad_type,
                "photo_count": 0,
            })

        return web.json_response({"ok": True, "ad_id": ad.id})

    except Exception:
        logger.exception("[api/submit] Error creating ad")
        return web.json_response({"ok": False, "error": "Server error"}, status=500)


# --- Admin endpoints ---


async def admin_get_pending(request: web.Request) -> web.Response:
    """GET /api/admin/pending — list all pending ads for moderation."""
    if not _check_admin_access(request):
        raise web.HTTPForbidden(text="Access denied")

    pool = request.app["session_pool"]
    async with pool() as session:
        # Pending car ads
        car_stmt = (
            select(CarAd)
            .where(CarAd.status == AdStatus.PENDING)
            .order_by(CarAd.created_at)
        )
        car_ads = (await session.execute(car_stmt)).scalars().all()

        # Pending plate ads
        plate_stmt = (
            select(PlateAd)
            .where(PlateAd.status == AdStatus.PENDING)
            .order_by(PlateAd.created_at)
        )
        plate_ads = (await session.execute(plate_stmt)).scalars().all()

        # Get first photos for all ads
        car_ids = [ad.id for ad in car_ads]
        plate_ids = [ad.id for ad in plate_ads]
        photos_map: dict[str, dict[int, str]] = {"car": {}, "plate": {}}

        if car_ids:
            photo_stmt = (
                select(AdPhoto)
                .where(AdPhoto.ad_type == AdType.CAR, AdPhoto.ad_id.in_(car_ids))
                .order_by(AdPhoto.position)
            )
            photos_map["car"] = _get_first_photos(
                (await session.execute(photo_stmt)).scalars().all()
            )

        if plate_ids:
            photo_stmt = (
                select(AdPhoto)
                .where(AdPhoto.ad_type == AdType.PLATE, AdPhoto.ad_id.in_(plate_ids))
                .order_by(AdPhoto.position)
            )
            photos_map["plate"] = _get_first_photos(
                (await session.execute(photo_stmt)).scalars().all()
            )

        items = []
        for ad in car_ads:
            items.append({
                "ad_type": "car",
                "id": ad.id,
                "title": f"{ad.brand} {ad.model} ({ad.year})",
                "brand": ad.brand,
                "model": ad.model,
                "year": ad.year,
                "price": ad.price,
                "city": ad.city,
                "mileage": ad.mileage,
                "engine_volume": ad.engine_volume,
                "fuel_type": ad.fuel_type.value,
                "transmission": ad.transmission.value,
                "color": ad.color,
                "description": ad.description,
                "contact_phone": ad.contact_phone,
                "contact_telegram": ad.contact_telegram,
                "photo": photos_map["car"].get(ad.id),
                "created_at": ad.created_at.isoformat() if ad.created_at else None,
            })
        for ad in plate_ads:
            items.append({
                "ad_type": "plate",
                "id": ad.id,
                "title": ad.plate_number,
                "plate_number": ad.plate_number,
                "price": ad.price,
                "city": ad.city,
                "description": ad.description,
                "contact_phone": ad.contact_phone,
                "contact_telegram": ad.contact_telegram,
                "photo": photos_map["plate"].get(ad.id),
                "created_at": ad.created_at.isoformat() if ad.created_at else None,
            })

    return web.json_response({"items": items, "total": len(items)})


async def admin_get_stats(request: web.Request) -> web.Response:
    """GET /api/admin/stats — ad statistics."""
    if not _check_admin_access(request):
        raise web.HTTPForbidden(text="Access denied")

    pool = request.app["session_pool"]
    async with pool() as session:
        stats = {}
        for label, status in [
            ("pending", AdStatus.PENDING),
            ("approved", AdStatus.APPROVED),
            ("rejected", AdStatus.REJECTED),
        ]:
            car_count = (
                await session.execute(
                    select(func.count()).select_from(CarAd).where(CarAd.status == status)
                )
            ).scalar_one()
            plate_count = (
                await session.execute(
                    select(func.count()).select_from(PlateAd).where(PlateAd.status == status)
                )
            ).scalar_one()
            stats[label] = car_count + plate_count

        stats["total"] = stats["pending"] + stats["approved"] + stats["rejected"]

    return web.json_response(stats)


async def admin_approve(request: web.Request) -> web.Response:
    """POST /api/admin/approve/{ad_type}/{ad_id} — approve an ad."""
    if not _check_admin_access(request):
        raise web.HTTPForbidden(text="Access denied")

    ad_type = request.match_info["ad_type"]
    ad_id = _safe_int(request.match_info.get("ad_id"), 0)

    if ad_type not in ("car", "plate"):
        raise web.HTTPBadRequest(text="Invalid ad_type")
    if not ad_id:
        raise web.HTTPBadRequest(text="Invalid ad_id")

    pool = request.app["session_pool"]
    async with pool() as session:
        if ad_type == "car":
            from app.services.car_ad_service import approve_car_ad
            ad = await approve_car_ad(session, ad_id)
        else:
            from app.services.plate_ad_service import approve_plate_ad
            ad = await approve_plate_ad(session, ad_id)

        if not ad:
            raise web.HTTPNotFound(text="Ad not found")

        # Commit first so approve persists even if publish/notify fails
        await session.commit()

        # Notify user
        try:
            from app.models.user import User
            user_stmt = select(User).where(User.id == ad.user_id)
            user = (await session.execute(user_stmt)).scalar_one_or_none()
            bot = request.app.get("bot")
            if user and bot:
                from app.texts import USER_AD_APPROVED
                await bot.send_message(user.telegram_id, USER_AD_APPROVED)
        except Exception:
            logger.exception("Failed to notify user about approval")

        # Publish to channel
        bot = request.app.get("bot")
        if bot:
            await publish_to_channel(bot, ad, ad_type, session)

    return web.json_response({"ok": True})


async def admin_reject(request: web.Request) -> web.Response:
    """POST /api/admin/reject/{ad_type}/{ad_id} — reject an ad."""
    if not _check_admin_access(request):
        raise web.HTTPForbidden(text="Access denied")

    ad_type = request.match_info["ad_type"]
    ad_id = _safe_int(request.match_info.get("ad_id"), 0)

    if ad_type not in ("car", "plate"):
        raise web.HTTPBadRequest(text="Invalid ad_type")
    if not ad_id:
        raise web.HTTPBadRequest(text="Invalid ad_id")

    # Parse optional reason from request body
    reason = "Не прошло модерацию"
    try:
        body = await request.json()
        if body.get("reason"):
            reason = body["reason"]
    except Exception:
        pass

    pool = request.app["session_pool"]
    async with pool() as session:
        if ad_type == "car":
            from app.services.car_ad_service import reject_car_ad
            ad = await reject_car_ad(session, ad_id, reason=reason)
        else:
            from app.services.plate_ad_service import reject_plate_ad
            ad = await reject_plate_ad(session, ad_id, reason=reason)

        if not ad:
            raise web.HTTPNotFound(text="Ad not found")

        # Commit first so rejection persists even if notify fails
        await session.commit()

        # Notify user
        try:
            from app.models.user import User
            user_stmt = select(User).where(User.id == ad.user_id)
            user = (await session.execute(user_stmt)).scalar_one_or_none()
            bot = request.app.get("bot")
            if user and bot:
                from app.texts import USER_AD_REJECTED
                await bot.send_message(user.telegram_id, USER_AD_REJECTED)
        except Exception:
            logger.exception("Failed to notify user about rejection")

    return web.json_response({"ok": True})
