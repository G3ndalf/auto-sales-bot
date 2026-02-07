from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.car_ad import AdStatus, CarAd
from app.models.plate_ad import PlateAd
from app.models.user import User


async def _find_user(session: AsyncSession, telegram_id: int) -> User | None:
    """Найти пользователя по telegram_id."""
    stmt = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_or_create_user(
    session: AsyncSession,
    telegram_id: int,
    username: str | None,
    full_name: str,
) -> User:
    """Get existing user or create new one.

    Uses INSERT ... ON CONFLICT DO UPDATE to handle race conditions
    atomically without separate SELECT + INSERT.
    """
    stmt = (
        pg_insert(User)
        .values(
            telegram_id=telegram_id,
            username=username,
            full_name=full_name or "User",
        )
        .on_conflict_do_update(
            index_elements=["telegram_id"],
            set_={
                "username": username,
                "full_name": full_name or User.full_name,
            },
        )
        .returning(User)
    )
    result = await session.execute(stmt)
    user = result.scalar_one()
    return user


async def get_user_by_telegram_id(
    session: AsyncSession, telegram_id: int
) -> User | None:
    """Get user by Telegram ID."""
    return await _find_user(session, telegram_id)


async def set_admin(session: AsyncSession, telegram_id: int, is_admin: bool = True) -> User | None:
    """Set user admin status."""
    user = await get_user_by_telegram_id(session, telegram_id)
    if user:
        user.is_admin = is_admin
    return user


async def get_user_active_ads_count(session: AsyncSession, user_id: int) -> int:
    """Подсчитать активные объявления пользователя."""
    car_count = (await session.execute(
        select(func.count()).select_from(CarAd)
        .where(CarAd.user_id == user_id, CarAd.status == AdStatus.APPROVED)
    )).scalar_one()
    plate_count = (await session.execute(
        select(func.count()).select_from(PlateAd)
        .where(PlateAd.user_id == user_id, PlateAd.status == AdStatus.APPROVED)
    )).scalar_one()
    return car_count + plate_count
