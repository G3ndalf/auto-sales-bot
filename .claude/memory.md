# Claude Code Memory — Auto Sales Bot

## Стиль кода
- Перед написанием нового сервиса → прочитай существующие в `app/services/` и используй тот же стиль
- Перед написанием хендлера → прочитай `app/handlers/start.py` как эталон
- Перед изменением модели → прочитай `app/models/` для консистентности
- Type hints обязательны везде
- Async/await — всегда, синхронного кода в проекте нет

## Архитектура
- Хендлеры в `app/handlers/` — каждый файл = Router
- Сервисы в `app/services/` — бизнес-логика отдельно от хендлеров
- Модели в `app/models/` — SQLAlchemy 2 async, DeclarativeBase
- Mini App в `webapp/` — React + TypeScript + Vite
- API (aiohttp) в `app/api.py` — внутри процесса бота на порту 8080

## Контекст проекта
- Бот: @autoskfo_bot (aiogram 3)
- БД: PostgreSQL, async через asyncpg
- Два типа объявлений: CarAd и PlateAd
- Фото через Telegram file_id (не загружаются на сервер)
- Модерация: inline кнопки ✅❌ → публикация в канал
- Mini App отправляет данные через sendData() (KeyboardButton)

## Деплой
- Сервер: 45.156.21.36 (Debian 12)
- Путь: /opt/auto-sales-bot
- Команда: `git push && ssh root@45.156.21.36 'cd /opt/auto-sales-bot && git pull && cd webapp && npx vite build && systemctl restart auto-sales-bot'`

## Текущий баг
- sendData из Mini App не доходит до бота
- Гипотеза: sendData() не вызывается (Mini App показывает success до закрытия)
- Нужно: проверить что sendData реально вызывается, добавить try/catch

## Привычки
- После каждого изменения — запускай `uv run python -c "from app.models import *; print('Models OK')"` для проверки импортов
- Перед коммитом — проверяй `uv run alembic check` для рассинхрона миграций
- При изменении webapp — проверяй `cd webapp && npx tsc --noEmit` для type-check
- Не забывай подключать новые роутеры в `app/bot.py`
