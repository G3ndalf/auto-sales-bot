"""Photo loading utilities."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.photo import AdPhoto, AdType


async def load_first_photos_map(
    session: AsyncSession,
    ad_type: AdType,
    ad_ids: list[int],
) -> dict[int, str]:
    """Загрузить первые фото для списка объявлений.

    Returns:
        {ad_id: file_id} map with only the first (cover) photo per ad.
    """
    if not ad_ids:
        return {}
    photo_stmt = (
        select(AdPhoto)
        .where(AdPhoto.ad_type == ad_type, AdPhoto.ad_id.in_(ad_ids))
        .order_by(AdPhoto.position)
    )
    all_photos = (await session.execute(photo_stmt)).scalars().all()
    return _get_first_photos(all_photos)


def _get_first_photos(photos_list: list[AdPhoto]) -> dict[int, str]:
    """Build {ad_id: file_id} map keeping only first photo per ad.

    Assumes photos_list is already ordered by position so the first
    occurrence for each ad_id is the cover photo.
    """
    result: dict[int, str] = {}
    for p in photos_list:
        if p.ad_id not in result:
            result[p.ad_id] = p.file_id
    return result
