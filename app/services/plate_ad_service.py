from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.car_ad import AdStatus
from app.models.photo import AdPhoto, AdType
from app.models.plate_ad import PlateAd


async def create_plate_ad(
    session: AsyncSession,
    *,
    user_id: int,
    plate_number: str,
    price: int,
    description: str,
    region: str | None = None,
    city: str,
    contact_phone: str,
    contact_telegram: str | None = None,
    photo_file_ids: list[str] | None = None,
) -> PlateAd:
    """Create a new plate ad with photos."""
    ad = PlateAd(
        user_id=user_id,
        plate_number=plate_number,
        price=price,
        description=description,
        region=region,
        city=city,
        contact_phone=contact_phone,
        contact_telegram=contact_telegram,
    )
    session.add(ad)
    await session.flush()

    if photo_file_ids:
        for i, file_id in enumerate(photo_file_ids):
            photo = AdPhoto(
                ad_type=AdType.PLATE,
                ad_id=ad.id,
                file_id=file_id,
                position=i,
            )
            session.add(photo)

    return ad


async def get_plate_ad(session: AsyncSession, ad_id: int) -> PlateAd | None:
    """Get a single plate ad by ID."""
    stmt = select(PlateAd).where(PlateAd.id == ad_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_pending_plate_ads(session: AsyncSession) -> list[PlateAd]:
    """Get all pending plate ads for moderation."""
    stmt = (
        select(PlateAd)
        .where(PlateAd.status == AdStatus.PENDING)
        .order_by(PlateAd.created_at)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def approve_plate_ad(session: AsyncSession, ad_id: int) -> PlateAd | None:
    """Approve a plate ad. Returns None if not found or not PENDING."""
    ad = await get_plate_ad(session, ad_id)
    if ad and ad.status == AdStatus.PENDING:
        ad.status = AdStatus.APPROVED
        return ad
    return None


async def reject_plate_ad(
    session: AsyncSession, ad_id: int, reason: str | None = None
) -> PlateAd | None:
    """Reject a plate ad. Returns None if not found or not PENDING."""
    ad = await get_plate_ad(session, ad_id)
    if ad and ad.status == AdStatus.PENDING:
        ad.status = AdStatus.REJECTED
        ad.rejection_reason = reason
        return ad
    return None
