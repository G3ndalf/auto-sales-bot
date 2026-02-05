"""REST API for Mini App catalog (aiohttp)."""

import logging

from aiohttp import web
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.config import settings
from app.models.car_ad import AdStatus, CarAd
from app.models.photo import AdPhoto, AdType
from app.models.plate_ad import PlateAd
from app.utils.publish import publish_to_channel

logger = logging.getLogger(__name__)


def create_api_app(
    session_pool: async_sessionmaker, bot_token: str, bot=None,
) -> web.Application:
    """Create aiohttp app with API routes."""
    app = web.Application(
        middlewares=[cors_middleware],
    )
    app["session_pool"] = session_pool
    app["bot_token"] = bot_token
    if bot:
        app["bot"] = bot

    # Public routes
    app.router.add_get("/api/brands", get_brands)
    app.router.add_get("/api/brands/{brand}/models", get_models)
    app.router.add_get("/api/cars", get_car_ads)
    app.router.add_get("/api/cars/{ad_id}", get_car_ad)
    app.router.add_get("/api/plates", get_plate_ads)
    app.router.add_get("/api/plates/{ad_id}", get_plate_ad_detail)
    app.router.add_get("/api/cities", get_cities)
    app.router.add_get("/api/photos/{file_id}", proxy_photo)

    # Admin routes
    app.router.add_get("/api/admin/pending", admin_get_pending)
    app.router.add_get("/api/admin/stats", admin_get_stats)
    app.router.add_post("/api/admin/approve/{ad_type}/{ad_id}", admin_approve)
    app.router.add_post("/api/admin/reject/{ad_type}/{ad_id}", admin_reject)

    return app


def _check_admin_access(request: web.Request) -> bool:
    """Check admin access via token or user_id."""
    # Method 1: Secret token (most reliable — doesn't depend on Telegram SDK)
    token = request.query.get("token")
    if token and settings.admin_token and token == settings.admin_token:
        logger.info("[AdminAuth] Access granted via admin_token")
        return True

    # Method 2: user_id from header or query
    uid_str = (
        request.headers.get("X-Telegram-User-Id")
        or request.query.get("user_id")
    )

    # Method 3: parse user_id from initData
    if not uid_str:
        init_data = request.query.get("initData") or request.query.get("tgWebAppData")
        if init_data:
            try:
                import json
                from urllib.parse import parse_qs
                parsed = parse_qs(init_data)
                user_json = parsed.get("user", [None])[0]
                if user_json:
                    user_obj = json.loads(user_json)
                    uid_str = str(user_obj.get("id", ""))
            except Exception:
                pass

    if uid_str:
        try:
            uid = int(uid_str)
            if uid in settings.admin_ids:
                logger.info("[AdminAuth] Access granted for user_id=%d", uid)
                return True
        except (ValueError, TypeError):
            pass

    logger.warning("[AdminAuth] Access denied. query=%s", dict(request.query))
    return False


@web.middleware
async def cors_middleware(request: web.Request, handler):
    """Add CORS headers to all responses."""
    if request.method == "OPTIONS":
        response = web.Response()
    else:
        response = await handler(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
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
    """GET /api/cars — list approved car ads with filters."""
    pool = request.app["session_pool"]
    brand = request.query.get("brand")
    model = request.query.get("model")
    city = request.query.get("city")
    offset = int(request.query.get("offset", 0))
    limit = min(int(request.query.get("limit", 20)), 50)

    async with pool() as session:
        stmt = select(CarAd).where(CarAd.status == AdStatus.APPROVED)
        count_stmt = select(func.count()).select_from(CarAd).where(CarAd.status == AdStatus.APPROVED)

        if brand:
            stmt = stmt.where(CarAd.brand == brand)
            count_stmt = count_stmt.where(CarAd.brand == brand)
        if model:
            stmt = stmt.where(CarAd.model == model)
            count_stmt = count_stmt.where(CarAd.model == model)
        if city:
            stmt = stmt.where(CarAd.city == city)
            count_stmt = count_stmt.where(CarAd.city == city)

        total = (await session.execute(count_stmt)).scalar_one()
        ads = (
            await session.execute(
                stmt.order_by(CarAd.created_at.desc()).offset(offset).limit(limit)
            )
        ).scalars().all()

        # Get first photo for each ad
        ad_ids = [ad.id for ad in ads]
        photos_map = {}
        if ad_ids:
            photo_stmt = (
                select(AdPhoto)
                .where(AdPhoto.ad_type == AdType.CAR, AdPhoto.ad_id.in_(ad_ids))
                .order_by(AdPhoto.position)
            )
            all_photos = (await session.execute(photo_stmt)).scalars().all()
            for p in all_photos:
                if p.ad_id not in photos_map:
                    photos_map[p.ad_id] = p.file_id

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
    ad_id = int(request.match_info["ad_id"])
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
    """GET /api/plates — list approved plate ads."""
    pool = request.app["session_pool"]
    city = request.query.get("city")
    offset = int(request.query.get("offset", 0))
    limit = min(int(request.query.get("limit", 20)), 50)

    async with pool() as session:
        stmt = select(PlateAd).where(PlateAd.status == AdStatus.APPROVED)
        count_stmt = select(func.count()).select_from(PlateAd).where(PlateAd.status == AdStatus.APPROVED)

        if city:
            stmt = stmt.where(PlateAd.city == city)
            count_stmt = count_stmt.where(PlateAd.city == city)

        total = (await session.execute(count_stmt)).scalar_one()
        ads = (
            await session.execute(
                stmt.order_by(PlateAd.created_at.desc()).offset(offset).limit(limit)
            )
        ).scalars().all()

        # Photos
        ad_ids = [ad.id for ad in ads]
        photos_map = {}
        if ad_ids:
            photo_stmt = (
                select(AdPhoto)
                .where(AdPhoto.ad_type == AdType.PLATE, AdPhoto.ad_id.in_(ad_ids))
                .order_by(AdPhoto.position)
            )
            all_photos = (await session.execute(photo_stmt)).scalars().all()
            for p in all_photos:
                if p.ad_id not in photos_map:
                    photos_map[p.ad_id] = p.file_id

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
    ad_id = int(request.match_info["ad_id"])
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
    """GET /api/photos/{file_id} — proxy Telegram photo."""
    import aiohttp

    file_id = request.match_info["file_id"]
    bot_token = request.app["bot_token"]

    # Get file path from Telegram
    api_url = f"https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}"

    async with aiohttp.ClientSession() as client:
        async with client.get(api_url) as resp:
            if resp.status != 200:
                raise web.HTTPNotFound()
            data = await resp.json()
            if not data.get("ok"):
                raise web.HTTPNotFound()
            file_path = data["result"]["file_path"]

        # Download file
        download_url = f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
        async with client.get(download_url) as resp:
            if resp.status != 200:
                raise web.HTTPNotFound()
            content = await resp.read()
            content_type = resp.headers.get("Content-Type", "image/jpeg")

    return web.Response(
        body=content,
        content_type=content_type,
        headers={
            "Cache-Control": "public, max-age=86400",
        },
    )


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
            for p in (await session.execute(photo_stmt)).scalars().all():
                if p.ad_id not in photos_map["car"]:
                    photos_map["car"][p.ad_id] = p.file_id

        if plate_ids:
            photo_stmt = (
                select(AdPhoto)
                .where(AdPhoto.ad_type == AdType.PLATE, AdPhoto.ad_id.in_(plate_ids))
                .order_by(AdPhoto.position)
            )
            for p in (await session.execute(photo_stmt)).scalars().all():
                if p.ad_id not in photos_map["plate"]:
                    photos_map["plate"][p.ad_id] = p.file_id

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
    ad_id = int(request.match_info["ad_id"])

    if ad_type not in ("car", "plate"):
        raise web.HTTPBadRequest(text="Invalid ad_type")

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
    ad_id = int(request.match_info["ad_id"])

    if ad_type not in ("car", "plate"):
        raise web.HTTPBadRequest(text="Invalid ad_type")

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
