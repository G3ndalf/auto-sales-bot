from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
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

    Обрабатывает race condition: если между SELECT и INSERT другой
    запрос уже создал пользователя с тем же telegram_id, ловим
    IntegrityError и повторно ищем.
    """
    # 1. Попробовать найти
    user = await _find_user(session, telegram_id)
    if user:
        # Обновить username и full_name если изменились
        if username is not None and user.username != username:
            user.username = username
        if full_name is not None and user.full_name != full_name:
            user.full_name = full_name
        return user

    # 2. Создать нового
    try:
        user = User(
            telegram_id=telegram_id,
            username=username,
            full_name=full_name or "User",
        )
        session.add(user)
        await session.flush()
        return user
    except IntegrityError:
        # Race condition: другой запрос уже создал пользователя
        await session.rollback()
        user = await _find_user(session, telegram_id)
        if user:
            return user
        raise  # Если и после rollback не нашли — что-то серьёзное


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
