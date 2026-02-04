# Auto Sales Bot

Telegram-бот + Mini App — маркетплейс для продажи автомобилей и автомобильных номеров в Кабардино-Балкарской Республике.

## Продукт

### Для кого
Жители КБР и Северного Кавказа, которые хотят продать/купить автомобиль или автомобильный номер. Альтернатива Avito и инстаграм-барахолкам.

### Два типа объявлений

**1. Автомобили:**
- Марка (LADA, BMW, Mercedes…)
- Модель (Granta, Vesta, X5…)
- Год выпуска
- Пробег (км)
- Объём двигателя
- Тип топлива (бензин, дизель, газ, электро, гибрид)
- Тип КПП (механика, автомат, робот, вариатор)
- Цвет
- Цена (₽)
- Описание (свободный текст — доп. детали от продавца)
- До 10 фотографий
- Регион/город (Нальчик, Баксан, Прохладный, Тырныауз и т.д.)
- Контакт продавца (телефон и/или Telegram)

**2. Автомобильные номера:**
- Номер (текст, например "А777АА 07")
- Цена (₽)
- Описание
- До 5 фотографий
- Регион/город
- Контакт продавца

### Ключевые фичи

**Подача объявления** — через Telegram Mini App:
- Пользователь нажимает кнопку → открывается Mini App
- Видит форму со всеми полями, загружает фотографии
- Отправляет → объявление уходит на модерацию

**Модерация (админ-панель):**
- Астемир (владелец) лично проверяет каждое объявление
- Одобрить / отклонить (с причиной)
- Объявление публикуется только после одобрения

**Каталог для покупателей:**
- Выбор: Автомобили или Номера
- Автомобили: Марка → Модель → Список объявлений
- Номера: Список всех номеров
- Фильтр по региону/городу
- Каждое объявление — фотографии + полное описание + контакт

**Размещение — БЕСПЛАТНОЕ**

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
├── models/         # SQLAlchemy models (user, car_ad, plate_ad, photo)
├── services/       # Business logic (ad_service, moderation_service)
└── utils/          # Helpers
webapp/             # Telegram Mini App (React + Vite + TS)
├── src/
│   ├── main.tsx    # Entry point
│   ├── App.tsx     # Root component with routing
│   ├── pages/      # CreateAd, Catalog, AdDetail
│   ├── components/ # Form fields, PhotoUpload, AdCard
│   ├── api/        # Backend communication
│   ├── constants/  # texts.ts, config.ts
│   └── assets/     # Static assets
├── public/
├── index.html
├── vite.config.ts
└── package.json
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

## Модели (схема БД)

### User
- telegram_id (BigInt, unique)
- username (nullable)
- full_name
- phone (nullable)
- is_admin (bool, default false)
- created_at, updated_at

### CarAd
- user_id (FK → User)
- brand (str) — марка
- model (str) — модель
- year (int) — год выпуска
- mileage (int) — пробег км
- engine_volume (float) — объём двигателя
- fuel_type (enum: бензин, дизель, газ, электро, гибрид)
- transmission (enum: механика, автомат, робот, вариатор)
- color (str)
- price (int) — цена ₽
- description (text) — свободное описание
- city (str) — город КБР
- contact_phone (str)
- contact_telegram (str, nullable)
- status (enum: pending, approved, rejected)
- rejection_reason (nullable)
- created_at, updated_at

### PlateAd
- user_id (FK → User)
- plate_number (str) — номер
- price (int)
- description (text)
- city (str)
- contact_phone (str)
- contact_telegram (str, nullable)
- status (enum: pending, approved, rejected)
- rejection_reason (nullable)
- created_at, updated_at

### AdPhoto
- ad_type (enum: car, plate)
- ad_id (int) — FK к CarAd или PlateAd
- file_id (str) — Telegram file_id
- position (int) — порядок фото
- created_at

## Current State
- Бот запускается, /start работает (`handlers/start.py`)
- Структура папок создана
- Модели ещё не созданы
- Миграций нет
- Mini App: базовый Vite + React проект в webapp/

## Next Steps
- [x] Создать `app/texts.py` и `app/constants.py`
- [x] Создать `webapp/src/constants/texts.ts` и `webapp/src/constants/config.ts`
- [x] Модели: User, CarAd, PlateAd, AdPhoto в models/
- [x] Alembic init + первая миграция
- [x] CRUD-сервисы (car_ad_service, plate_ad_service, user_service)
- [x] DB middleware (auto commit/rollback)
- [x] Mini App: форма подачи объявления (авто) — CreateCarAd
- [x] Mini App: форма подачи объявления (номера) — CreatePlateAd
- [x] Бот: хендлер приёма данных из Mini App (web_app_data)
- [x] Бот: хендлер загрузки фото после отправки формы (FSM)
- [x] Админ-хендлер модерации (approve/reject с inline-кнопками)
- [x] REST API для каталога (aiohttp, /api/brands, /api/cars, /api/plates, фото-прокси)
- [x] Mini App: каталог (марка → модель → объявления)
- [x] Mini App: страница объявления (фото-галерея + детали)
- [x] Mini App: список номеров + страница номера
- [x] Фильтр по городу
- [ ] Деплой Mini App (ngrok/сервер)
- [ ] .env с токеном бота, DATABASE_URL, ADMIN_IDS
- [ ] Тестирование полного флоу
