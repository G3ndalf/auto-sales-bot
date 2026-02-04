"""REST API for Mini App catalog (aiohttp)."""

import logging

from aiohttp import web
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.car_ad import AdStatus, CarAd
from app.models.photo import AdPhoto, AdType
from app.models.plate_ad import PlateAd

logger = logging.getLogger(__name__)


def create_api_app(session_pool: async_sessionmaker, bot_token: str) -> web.Application:
    """Create aiohttp app with API routes."""
    app = web.Application(
        middlewares=[cors_middleware],
    )
    app["session_pool"] = session_pool
    app["bot_token"] = bot_token

    app.router.add_get("/api/brands", get_brands)
    app.router.add_get("/api/brands/{brand}/models", get_models)
    app.router.add_get("/api/cars", get_car_ads)
    app.router.add_get("/api/cars/{ad_id}", get_car_ad)
    app.router.add_get("/api/plates", get_plate_ads)
    app.router.add_get("/api/plates/{ad_id}", get_plate_ad_detail)
    app.router.add_get("/api/cities", get_cities)
    app.router.add_get("/api/photos/{file_id}", proxy_photo)

    return app


@web.middleware
async def cors_middleware(request: web.Request, handler):
    """Add CORS headers to all responses."""
    if request.method == "OPTIONS":
        response = web.Response()
    else:
        response = await handler(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
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
