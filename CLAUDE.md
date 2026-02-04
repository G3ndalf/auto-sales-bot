# Auto Sales Bot

Telegram-бот для объявлений о продаже автомобилей.

## Tech Stack

### Backend
- **Python 3.11+** с aiogram 3
- **PostgreSQL 17** — база данных
- **SQLAlchemy 2** (async) + Alembic — ORM и миграции
- **pydantic-settings** — конфигурация через .env

### Frontend (Mini App)
- **React 19** + **TypeScript 5.9**
- **Vite 7** — сборка и dev-сервер
- **@tma.js/sdk-react** — Telegram Mini Apps SDK

## Project Structure
```
app/
├── bot.py          # Entry point, dispatcher setup
├── config.py       # Settings from .env
├── database.py     # SQLAlchemy engine & session
├── handlers/       # Aiogram routers (start, ads, search, admin)
├── keyboards/      # Inline & reply keyboards
├── middlewares/     # DB session, auth middlewares
├── models/         # SQLAlchemy models
├── services/       # Business logic
└── utils/          # Helpers
webapp/             # Telegram Mini App (React + Vite + TS)
├── src/
│   ├── main.tsx    # Entry point
│   ├── App.tsx     # Root component
│   └── assets/     # Static assets
├── public/         # Public static files
├── index.html      # HTML entry
├── vite.config.ts  # Vite config
└── package.json    # Dependencies
migrations/         # Alembic migrations
tests/              # Pytest tests
```

## Commands

### Backend
- `uv run python -m app.bot` — запуск бота
- `uv run alembic upgrade head` — применить миграции
- `uv run alembic revision --autogenerate -m "description"` — новая миграция
- `uv run pytest` — тесты
- `uv run ruff check .` — линтер

### Frontend (webapp/)
- `npm run dev` — dev-сервер (из webapp/)
- `npm run build` — сборка (tsc + vite build)
- `npm run lint` — ESLint
- `npm run preview` — превью production-сборки

## Conventions

### Паттерны и стиль
- **Перед написанием нового кода** — прочитай соседние файлы в той же папке и следуй тем же паттернам (именование, структура, импорты)
- Все хендлеры — отдельные Router в handlers/ (см. `handlers/start.py` как образец)
- Бизнес-логика в services/, не в хендлерах
- Модели SQLAlchemy в models/
- Клавиатуры в keyboards/
- Фронтенд: функциональные компоненты React, TypeScript strict mode
- Mini App взаимодействует с ботом через @tma.js/sdk-react

### Тексты и константы — ВЫНОСИТЬ В ОТДЕЛЬНЫЕ ФАЙЛЫ
- **Все тексты бота** (сообщения пользователю) → `app/texts.py`
- **Все тексты Mini App** (UI-строки) → `webapp/src/constants/texts.ts`
- **Магические числа и конфиги** (лимиты, размеры, таймауты) → `app/constants.py` / `webapp/src/constants/config.ts`
- **Названия кнопок** → `app/texts.py` (секция keyboards) / `webapp/src/constants/texts.ts`
- Никогда не хардкодить строки прямо в хендлерах, компонентах или сервисах
- Пиши на русском в текстах для пользователя, код и имена переменных на английском

## Current State
- Бот запускается, /start работает (`handlers/start.py`)
- Структура папок создана (handlers, services, models, keyboards, middlewares, utils)
- Модели ещё не созданы
- Миграций нет
- Mini App: базовый Vite + React проект в webapp/, без бизнес-логики

## Next Steps
- [x] Создать `app/texts.py` и `app/constants.py` — вынести тексты из start.py
- [x] Создать `webapp/src/constants/texts.ts` и `webapp/src/constants/config.ts`
- [ ] Модели: User, Ad, AdPhoto в models/
- [ ] Alembic init + первая миграция
- [ ] CRUD-сервис для объявлений (services/ad_service.py)
- [ ] FSM-хендлер создания объявления
- [ ] Хендлер поиска / просмотра объявлений
- [ ] Mini App: страница списка объявлений
