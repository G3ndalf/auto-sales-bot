# Code Review: post-sendData flow & Admin API

**Дата:** 2026-02-05
**Scope:** bot.py, handlers/*, api.py, config.py, webapp/src/api.ts

---

## BUG 1 (CRITICAL): `api.ts` — синтаксическая ошибка, `adminReject` не замкнут

**Файл:** `webapp/src/api.ts:175-183`

Метод `adminReject` не закрыт корректно — объект `api` обрывается на запятой вместо закрывающей скобки. После `fetchJSON(...)` стоит `)` с запятой, но отсутствует закрывающая `}` для тела функции и `}` для объекта `api`:

```ts
  adminReject: (adType: string, adId: number, reason?: string) => {
    ...
    return fetchJSON<{ ok: boolean }>(`/api/admin/reject/${adType}/${adId}${q}`, {
      method: 'POST',
      headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Не прошло модерацию' }),
    }),    // <-- ЗАПЯТАЯ вместо );
};         // <-- Закрывает объект api, но тело стрелочной функции adminReject не закрыто
```

**Ожидалось:**
```ts
    }),       // закрыть fetchJSON
  },          // закрыть adminReject
};            // закрыть api
```

**Последствия:** TypeScript-компилятор может не поймать это в зависимости от интерпретации (comma operator возвращает последний аргумент). В рантайме `adminReject` вернёт результат comma expression, а объект `api` окажется некорректно сформирован. Если tsc и проходит — это UB-подобное поведение.

---

## BUG 2 (HIGH): `api.py:526` — двойной commit в admin_approve

**Файл:** `app/api.py:486-528`

В `admin_approve()` вызывается `await session.commit()` явно на строке 526. Но API-эндпоинты используют `async with pool() as session:` — это autocommit-сессия из `async_sessionmaker`. При выходе из `async with` она автоматически **не** коммитит (в отличие от DB middleware в aiogram, которая коммитит за хендлеры).

Однако проблема в другом: `approve_car_ad(session, ad_id)` изменяет статус, потом `_api_publish_to_channel()` читает фотографии из той же сессии. После `session.commit()` объекты `ad` и все связанные фото могут стать detached — если далее будет попытка доступа к lazy-loaded атрибутам, будет `DetachedInstanceError`.

**Также:** `admin_reject()` (строка 575) тоже делает `session.commit()`. Это не баг сам по себе (в API нет middleware), но стоит знать: если `bot.send_message()` упадёт с исключением после `_api_publish_to_channel`, но до `session.commit()` — коммит не произойдёт, и approve пропадёт. А если `_api_publish_to_channel` упадёт — commit всё равно произойдёт (exception ловится внутри `_api_publish_to_channel`).

---

## BUG 3 (HIGH): Race condition — admin notification до завершения фото

**Файлы:** `app/handlers/web_app.py:92-101`

Порядок действий в `handle_web_app_data`:
1. Создаётся ad (status=PENDING) — строка 76-80
2. Отправляется сообщение "Отправьте фото" — строка 90
3. Устанавливается FSM state — строка 93
4. **Нотификация админам** — строка 101

Проблема: админ получает уведомление о новом объявлении **ДО** того, как пользователь загрузит фотографии. Админ может одобрить/отклонить объявление пока пользователь ещё загружает фото. Это race condition:
- Админ одобряет ad без фото → публикуется в канал без фото
- Пользователь отправляет фото → они сохраняются, но объявление уже опубликовано

**Кроме того:** DB middleware коммитит сессию после `handle_web_app_data` завершается (строка 24 в db.py). Значит `_notify_admins` получает ad.id, который ещё в flush, но не в commit. Bot.send_message — это внешний вызов, и если он упадёт, exception может привести к rollback всей транзакции (создание ad + photo FSM state).

---

## BUG 4 (MEDIUM): `ADMIN_IDS=[5849807401]` — парсинг pydantic-settings v2

**Файл:** `app/config.py:7`, `.env:3`

В `.env` записано `ADMIN_IDS=[5849807401]` (с квадратными скобками).

Pydantic-settings v2 с типом `list[int]` парсит JSON из env-переменных. Формат `[5849807401]` — это **валидный JSON**, поэтому парсинг **РАБОТАЕТ КОРРЕКТНО**.

**Но**: если кто-то напишет `ADMIN_IDS=5849807401` (без скобок) или `ADMIN_IDS=5849807401,123456` (через запятую без скобок) — будет ошибка валидации при старте. Это не баг, но gotcha для документации. В pydantic-settings v2, `list[int]` из env требует JSON-формат.

**Статус:** ✅ Текущий формат работает. Не баг, но стоит задокументировать.

---

## BUG 5 (MEDIUM): Порядок роутеров — потенциальный конфликт web_app vs photos

**Файл:** `app/bot.py:34-37`

```python
dp.include_router(admin.router)    # Command("admin", "moderate") + callback "mod:*"
dp.include_router(photos.router)   # PhotoCollectStates.waiting_photos + photo/text
dp.include_router(web_app.router)  # lambda m: m.web_app_data is not None
dp.include_router(start.router)    # CommandStart()
```

Порядок **правильный** для основных сценариев:
- `admin` первый — callback_query с `mod:` не пересекается с другими
- `photos` перед `web_app` — когда FSM state активен, фото-хендлер перехватит сообщения
- `web_app` после photos — web_app_data is not None сработает для Mini App
- `start` последний — /start перехватится только если ничего другое не сработало

**Потенциальная проблема:** Если пользователь в состоянии `PhotoCollectStates.waiting_photos` отправит данные через Mini App (web_app_data), то `photos.router` проверит все свои фильтры:
- `skip_photos`: `m.text == WEB_APP_SKIP_PHOTOS` — нет, это не текст
- `collect_photo`: `m.photo is not None` — нет, web_app_data не содержит photo
- `finish_photos`: `m.text.lower() in (...)` — нет

Все фильтры photos-роутера отклонят web_app_data, и оно **провалится** в `web_app.router`. Но это значит, что пользователь **может** подать второе объявление, пока ещё собирает фото для первого. Это приведёт к перезаписи FSM state (новый ad_id, photo_count=0), и фото для первого объявления будут потеряны.

---

## BUG 6 (MEDIUM): `photos.router` — нет catch-all handler для неожиданных сообщений

**Файл:** `app/handlers/photos.py`

В состоянии `PhotoCollectStates.waiting_photos` обрабатываются:
1. Текст "⏭ Пропустить фото" — skip
2. Photo — collect
3. Текст "готово"/"done"/"стоп" — finish

Но если пользователь отправит **любое другое сообщение** (стикер, документ, видео, произвольный текст, голосовое), оно провалится через photos.router и может быть подхвачено другими роутерами (web_app, start). Пользователь не получит подсказку, что нужно отправлять фото.

---

## BUG 7 (LOW): `admin_approve` и `admin_reject` — отсутствие проверки текущего статуса

**Файлы:** `app/services/car_ad_service.py:138-143`, `app/api.py:486-528`

`approve_car_ad()` просто устанавливает `ad.status = AdStatus.APPROVED` без проверки текущего статуса. Это значит:
- Уже одобренное объявление можно "одобрить" повторно (нет ошибки, но повторно публикуется в канал)
- Уже отклонённое объявление можно одобрить (может быть фичей, а может быть багом)

Аналогично для `reject_car_ad()` и plate-сервисов.

Двойной approve через Admin API триггерит повторную публикацию в канал (`_api_publish_to_channel` вызывается безусловно).

---

## BUG 8 (LOW): `_api_publish_to_channel` — дубликат кода

**Файлы:** `app/api.py:580-641`, `app/handlers/admin.py:210-274`

`_api_publish_to_channel` в `api.py` и `_publish_to_channel` в `admin.py` — практически идентичный код (80+ строк). Если один будет обновлён, а другой забыт — поведение разойдётся. Это не баг, но архитектурный долг.

---

## BUG 9 (INFO): Security — X-Telegram-User-Id можно подделать

**Файл:** `app/api.py:48-59`

`_get_admin_user_id()` принимает user_id из:
1. Заголовка `X-Telegram-User-Id`
2. Query-параметра `user_id`

Оба эти значения могут быть подделаны кем угодно. Нет верификации через `initData` с HMAC (Telegram Bot API предоставляет подпись для проверки подлинности пользователя). Любой HTTP-клиент может отправить `X-Telegram-User-Id: 5849807401` и получить полный доступ к админ-функциям.

**Для MVP это допустимо** (API не публичный, слушает на 0.0.0.0:8080), **но для продакшена** нужна HMAC-валидация initData.

---

## BUG 10 (INFO): `webapp/src/api.ts` — `getAdminUserId` fallback через `initDataUnsafe`

**Файл:** `webapp/src/api.ts:11-25`

`initDataUnsafe` — это данные, которые Telegram предоставляет **без верификации** на стороне клиента. Использование `tg?.initDataUnsafe?.user?.id` для передачи user_id без серверной HMAC-валидации означает, что любой может открыть Mini App URL в браузере и подставить произвольный user_id.

Связано с BUG 9 — вместе они формируют полный bypass авторизации для admin API.

---

## Резюме

| # | Severity | Описание |
|---|----------|----------|
| 1 | CRITICAL | `api.ts` — синтаксическая ошибка в `adminReject`, объект `api` не закрыт |
| 2 | HIGH | Двойной commit + возможный detached instance в admin_approve |
| 3 | HIGH | Race condition — admin нотификация до загрузки фото |
| 4 | MEDIUM | ADMIN_IDS парсинг работает, но формат нужно задокументировать |
| 5 | MEDIUM | Перезапись FSM state при повторной подаче через Mini App |
| 6 | MEDIUM | Нет catch-all handler для неизвестных сообщений в photos FSM |
| 7 | LOW | Нет проверки текущего статуса при approve/reject — дубли в канал |
| 8 | LOW | Дублирование кода publish_to_channel между API и admin handler |
| 9 | INFO | Admin API auth через подделываемый заголовок/query param |
| 10 | INFO | initDataUnsafe без HMAC — bypass авторизации |
