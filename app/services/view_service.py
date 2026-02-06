"""Ad view tracking utilities."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ad_view import AdView
from app.models.photo import AdType


async def record_unique_view(
    session: AsyncSession,
    viewer_id: int,
    ad_type: AdType,
    ad_id: int,
    ad,  # CarAd или PlateAd
) -> bool:
    """Записать уникальный просмотр. Возвращает True если новый."""
    if not viewer_id:
        return False

    existing = await session.execute(
        select(AdView).where(
            AdView.user_id == viewer_id,
            AdView.ad_type == ad_type,
            AdView.ad_id == ad_id,
        )
    )
    if existing.scalar_one_or_none():
        return False

    session.add(AdView(user_id=viewer_id, ad_type=ad_type, ad_id=ad_id))
    ad.view_count = (ad.view_count or 0) + 1
    return True
