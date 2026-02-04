from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_or_create_user(
    session: AsyncSession,
    telegram_id: int,
    username: str | None,
    full_name: str,
) -> User:
    """Get existing user or create new one."""
    stmt = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            telegram_id=telegram_id,
            username=username,
            full_name=full_name,
        )
        session.add(user)
        await session.flush()
    else:
        # Update username and full_name if changed
        if user.username != username:
            user.username = username
        if user.full_name != full_name:
            user.full_name = full_name

    return user


async def get_user_by_telegram_id(
    session: AsyncSession, telegram_id: int
) -> User | None:
    """Get user by Telegram ID."""
    stmt = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def set_admin(session: AsyncSession, telegram_id: int, is_admin: bool = True) -> User | None:
    """Set user admin status."""
    user = await get_user_by_telegram_id(session, telegram_id)
    if user:
        user.is_admin = is_admin
    return user
