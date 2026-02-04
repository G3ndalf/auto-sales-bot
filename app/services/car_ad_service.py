from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import ADS_PER_PAGE
from app.models.car_ad import AdStatus, CarAd, FuelType, Transmission
from app.models.photo import AdPhoto, AdType


async def create_car_ad(
    session: AsyncSession,
    *,
    user_id: int,
    brand: str,
    model: str,
    year: int,
    mileage: int,
    engine_volume: float,
    fuel_type: FuelType,
    transmission: Transmission,
    color: str,
    price: int,
    description: str,
    city: str,
    contact_phone: str,
    contact_telegram: str | None = None,
    photo_file_ids: list[str] | None = None,
) -> CarAd:
    """Create a new car ad with photos."""
    ad = CarAd(
        user_id=user_id,
        brand=brand,
        model=model,
        year=year,
        mileage=mileage,
        engine_volume=engine_volume,
        fuel_type=fuel_type,
        transmission=transmission,
        color=color,
        price=price,
        description=description,
        city=city,
        contact_phone=contact_phone,
        contact_telegram=contact_telegram,
    )
    session.add(ad)
    await session.flush()

    if photo_file_ids:
        for i, file_id in enumerate(photo_file_ids):
            photo = AdPhoto(
                ad_type=AdType.CAR,
                ad_id=ad.id,
                file_id=file_id,
                position=i,
            )
            session.add(photo)

    return ad


async def get_car_ad(session: AsyncSession, ad_id: int) -> CarAd | None:
    """Get a single car ad by ID."""
    stmt = select(CarAd).where(CarAd.id == ad_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_car_ad_photos(session: AsyncSession, ad_id: int) -> list[AdPhoto]:
    """Get all photos for a car ad, ordered by position."""
    stmt = (
        select(AdPhoto)
        .where(AdPhoto.ad_type == AdType.CAR, AdPhoto.ad_id == ad_id)
        .order_by(AdPhoto.position)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_approved_car_ads(
    session: AsyncSession,
    *,
    brand: str | None = None,
    model: str | None = None,
    city: str | None = None,
    offset: int = 0,
    limit: int = ADS_PER_PAGE,
) -> list[CarAd]:
    """Get approved car ads with optional filters."""
    stmt = select(CarAd).where(CarAd.status == AdStatus.APPROVED)

    if brand:
        stmt = stmt.where(CarAd.brand == brand)
    if model:
        stmt = stmt.where(CarAd.model == model)
    if city:
        stmt = stmt.where(CarAd.city == city)

    stmt = stmt.order_by(CarAd.created_at.desc()).offset(offset).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_brands(session: AsyncSession) -> list[str]:
    """Get list of brands with approved ads."""
    stmt = (
        select(CarAd.brand)
        .where(CarAd.status == AdStatus.APPROVED)
        .group_by(CarAd.brand)
        .order_by(CarAd.brand)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_models_by_brand(session: AsyncSession, brand: str) -> list[str]:
    """Get list of models for a brand with approved ads."""
    stmt = (
        select(CarAd.model)
        .where(CarAd.status == AdStatus.APPROVED, CarAd.brand == brand)
        .group_by(CarAd.model)
        .order_by(CarAd.model)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_pending_car_ads(session: AsyncSession) -> list[CarAd]:
    """Get all pending car ads for moderation."""
    stmt = (
        select(CarAd)
        .where(CarAd.status == AdStatus.PENDING)
        .order_by(CarAd.created_at)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def approve_car_ad(session: AsyncSession, ad_id: int) -> CarAd | None:
    """Approve a car ad."""
    ad = await get_car_ad(session, ad_id)
    if ad:
        ad.status = AdStatus.APPROVED
    return ad


async def reject_car_ad(
    session: AsyncSession, ad_id: int, reason: str | None = None
) -> CarAd | None:
    """Reject a car ad with optional reason."""
    ad = await get_car_ad(session, ad_id)
    if ad:
        ad.status = AdStatus.REJECTED
        ad.rejection_reason = reason
    return ad


async def get_user_car_ads(session: AsyncSession, user_id: int) -> list[CarAd]:
    """Get all car ads by a user."""
    stmt = (
        select(CarAd)
        .where(CarAd.user_id == user_id)
        .order_by(CarAd.created_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def count_approved_by_brand(session: AsyncSession, brand: str) -> int:
    """Count approved ads for a brand."""
    stmt = (
        select(func.count())
        .select_from(CarAd)
        .where(CarAd.status == AdStatus.APPROVED, CarAd.brand == brand)
    )
    result = await session.execute(stmt)
    return result.scalar_one()
