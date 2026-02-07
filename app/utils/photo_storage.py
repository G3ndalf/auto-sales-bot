"""Утилита для хранения загруженных фото на диске.

Фото из Mini App сохраняются в UPLOAD_DIR/{uuid}.{ext}
Идентификатор: "loc_{uuid}" — отличается от Telegram file_id форматом.

# TODO F7: Добавить периодический cleanup для orphaned фото — файлы на диске без записи в AdPhoto

Формат loc_ + hex UUID проходит валидацию _FILE_ID_RE = [A-Za-z0-9_-]+
"""
import os
import uuid
from pathlib import Path

# Директория для загруженных фото (рядом с проектом)
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/opt/auto-sales-bot/uploads"))

# Для локальной разработки — fallback
if not UPLOAD_DIR.exists():
    UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Допустимые MIME-типы и расширения
ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5 MB
LOCAL_PREFIX = "loc_"


def save_photo(data: bytes, content_type: str) -> str:
    """Сохранить фото на диск. Вернуть photo_id (loc_{uuid}).

    Аргументы:
        data — байты изображения
        content_type — MIME-тип (image/jpeg, image/png, image/webp)

    Возвращает:
        photo_id в формате "loc_{hex_uuid}"

    Исключения:
        ValueError — если тип не поддерживается или файл слишком большой
    """
    ext = ALLOWED_TYPES.get(content_type)
    if not ext:
        raise ValueError(f"Unsupported content type: {content_type}")
    if len(data) > MAX_PHOTO_SIZE:
        raise ValueError(f"File too large: {len(data)} bytes (max {MAX_PHOTO_SIZE})")

    photo_uuid = uuid.uuid4().hex
    filename = f"{photo_uuid}{ext}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(data)
    return f"{LOCAL_PREFIX}{photo_uuid}"


def get_photo_path(photo_id: str) -> Path | None:
    """Получить путь к фото по photo_id. None если не найден.

    Аргументы:
        photo_id — идентификатор фото (loc_{hex_uuid})

    Возвращает:
        Path к файлу или None, если файл не найден или photo_id не локальный
    """
    if not photo_id.startswith(LOCAL_PREFIX):
        return None
    uid = photo_id[len(LOCAL_PREFIX):]
    # Ищем файл с любым расширением (jpg, png, webp)
    upload_root = UPLOAD_DIR.resolve()
    for ext in ALLOWED_TYPES.values():
        path = (UPLOAD_DIR / f"{uid}{ext}").resolve()
        # Defense-in-depth: убедиться что путь внутри UPLOAD_DIR
        if not str(path).startswith(str(upload_root)):
            return None
        if path.exists():
            return path
    return None


def is_local_photo(photo_id: str) -> bool:
    """Проверить, является ли photo_id локальным (не Telegram file_id).

    Локальные фото начинаются с префикса "loc_".
    Telegram file_id не имеют такого префикса.
    """
    return photo_id.startswith(LOCAL_PREFIX)
