# Числовые константы, лимиты, конфигурационные значения.
# Не хардкодить магические числа в логике — всё сюда.

# Объявления
MAX_AD_TITLE_LENGTH = 100
MAX_AD_DESCRIPTION_LENGTH = 1000
MAX_CAR_PHOTOS = 10
MAX_PLATE_PHOTOS = 5
MAX_AD_PRICE = 999_999_999

# Срок действия объявления (дни)
AD_EXPIRY_DAYS = 30

# Дубликаты: период проверки (дни)
DUPLICATE_CHECK_DAYS = 7

# Пагинация
ADS_PER_PAGE = 10

# API limits
MAX_SUBMIT_BODY_SIZE = 10 * 1024  # 10 KB
MAX_PAGE_SIZE = 50
DEFAULT_PAGE_SIZE = 20

# Поиск
MIN_SEARCH_QUERY_LENGTH = 2

# Описание: максимум символов для превью в канале/модерации
DESCRIPTION_PREVIEW_LENGTH = 300
DESCRIPTION_CHANNEL_LENGTH = 500
