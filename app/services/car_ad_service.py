from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
    """Approve a car ad. Returns None if not found or not PENDING."""
    ad = await get_car_ad(session, ad_id)
    if ad and ad.status == AdStatus.PENDING:
        ad.status = AdStatus.APPROVED
        return ad
    return None


async def reject_car_ad(
    session: AsyncSession, ad_id: int, reason: str | None = None
) -> CarAd | None:
    """Reject a car ad. Returns None if not found or not PENDING."""
    ad = await get_car_ad(session, ad_id)
    if ad and ad.status == AdStatus.PENDING:
        ad.status = AdStatus.REJECTED
        ad.rejection_reason = reason
        return ad
    return None
