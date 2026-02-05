# Все тексты бота для пользователя.
# Хендлеры и клавиатуры импортируют строки отсюда — не хардкодить текст в логике.

# --- /start ---
START_WELCOME = (
    "🚘 <b>Авто СКФО</b>\n"
    "━━━━━━━━━━━━━━━\n\n"
    "🏪 Площадка для продажи авто и номеров\n"
    "в Кабардино-Балкарии и СКФО\n\n"
    "📋 <b>Каталог</b> — смотрите объявления\n"
    "📸 <b>Подать</b> — продайте авто или номер\n"
    "👤 <b>Профиль</b> — ваши объявления\n\n"
    "👇 Нажмите кнопку, чтобы начать:"
)

# --- Web App data ---
WEB_APP_CAR_CREATED = "✅ Объявление об авто создано!"
WEB_APP_PLATE_CREATED = "✅ Объявление о номере создано!"
WEB_APP_INVALID_DATA = "❌ Некорректные данные. Попробуйте ещё раз."
WEB_APP_ERROR = "❌ Произошла ошибка. Попробуйте позже."
WEB_APP_SEND_PHOTOS = (
    "📸 Теперь отправьте фотографии для объявления.\n"
    "Отправляйте по одной или нажмите кнопку, чтобы пропустить."
)
WEB_APP_SKIP_PHOTOS = "⏭ Пропустить фото"

# --- Photos ---
PHOTOS_SAVED = "✅ Сохранено {count} фото!"
PHOTOS_LIMIT_REACHED = "📸 Достигнут лимит — {max} фото."
PHOTOS_SKIPPED = "👌 Без фото."
PHOTOS_COUNT = "📸 Фото {count}/{max}. Отправьте ещё или напишите «готово»."
PHOTOS_UNEXPECTED = "📸 Отправьте фото или нажмите «⏭ Пропустить фото»"
WEB_APP_FSM_OVERWRITE = "⚠️ У вас есть незавершённая загрузка фото. Пропускаем её."

# --- Admin ---
ADMIN_NO_ACCESS = "🚫 У вас нет доступа к модерации."
ADMIN_NO_PENDING = "✨ Нет объявлений на модерации. Всё чисто!"

ADMIN_CAR_AD_CARD = (
    "🚗 <b>Авто #{id}</b>\n"
    "━━━━━━━━━━━━━━━\n"
    "<b>{brand} {model}</b> ({year})\n"
    "📍 {city}\n"
    "💰 {price} ₽\n"
    "🛣 {mileage} км\n"
    "⛽ {fuel} | 🔧 {transmission}\n"
    "🎨 {color} | 🏎 {engine}л\n"
    "📞 {phone}\n"
    "📱 {telegram}\n"
    "━━━━━━━━━━━━━━━\n"
    "📝 {description}"
)

ADMIN_PLATE_AD_CARD = (
    "🔢 <b>Номер #{id}</b>\n"
    "━━━━━━━━━━━━━━━\n"
    "<b>{plate}</b>\n"
    "📍 {city}\n"
    "💰 {price} ₽\n"
    "📞 {phone}\n"
    "📱 {telegram}\n"
    "━━━━━━━━━━━━━━━\n"
    "📝 {description}"
)

ADMIN_APPROVED = "✅ Одобрено!"
ADMIN_REJECTED = "❌ Отклонено."
ADMIN_AD_NOT_FOUND = "Объявление не найдено."
ADMIN_NEXT = "Следующее..."
ADMIN_PANEL_BTN = "⚙️ Админ-панель"

# --- User notifications ---
USER_AD_APPROVED = "🎉 Ваше объявление одобрено и опубликовано!"
USER_AD_REJECTED = "😔 Ваше объявление не прошло модерацию."

# --- Keyboards ---
# BTN_* — тексты кнопок

# --- Errors ---
# ERR_* — тексты ошибок
