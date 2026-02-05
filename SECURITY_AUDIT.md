# Security Audit — auto-sales-bot

**Date:** 2026-02-05  
**Scope:** Backend Python code (`app/` directory)  
**Status:** ✅ Audit complete, fixes applied

---

## 1. SQL Injection

**Risk: LOW ✅**

All database queries use SQLAlchemy ORM with parameterized queries. No raw SQL strings found anywhere. User input (brand, model, city, etc.) is passed through ORM `.where()` clauses which auto-parameterize.

**Files checked:**
- `app/api.py` — all `select()` queries use ORM filters
- `app/services/car_ad_service.py` — ORM only
- `app/services/plate_ad_service.py` — ORM only
- `app/services/user_service.py` — ORM only

**No issues found.**

---

## 2. Path Traversal in `proxy_photo`

**Risk: MEDIUM → Fixed ✅**

**Before:** `file_id` from URL was passed directly to Telegram Bot API without validation. While Telegram API would reject invalid file_ids, a malicious payload could potentially include unexpected characters.

**Fix applied:** Added regex validation — `file_id` now only allows `[A-Za-z0-9_-]` and max 256 characters. Invalid values return HTTP 400.

```python
_FILE_ID_RE = re.compile(r"^[A-Za-z0-9_\-]+$")
```

---

## 3. ADMIN_TOKEN Leakage

**Risk: LOW-MEDIUM ⚠️**

- The admin token is passed as a URL query parameter (`?token=...`) in admin WebApp buttons (`handlers/start.py`). This is sent only to admin users via Telegram keyboard.
- The token appears in server access logs if standard aiohttp logging is enabled.
- **Fix applied:** Admin auth denial log no longer dumps `request.query` (which could contain the token). Now logs only `request.path`.
- **Fix applied:** Token comparison now uses `hmac.compare_digest()` to prevent timing attacks.

**Recommendation for future:** Consider moving token to `Authorization` header or using HMAC-signed initData validation.

---

## 4. CORS Policy

**Risk: LOW ⚠️ (acceptable for MVP)**

Currently `Access-Control-Allow-Origin: *` is set for all endpoints including admin routes.

**Assessment:** For a Telegram Mini App MVP, this is acceptable because:
- Admin endpoints are protected by token/user_id auth
- The API serves a public catalog and a Mini App that runs in Telegram's iframe
- There's no cookie/session-based auth that could be exploited via CSRF

**Recommendation for production:** Restrict CORS to the specific webapp domain:
```python
response.headers["Access-Control-Allow-Origin"] = settings.webapp_url
```

---

## 5. Error Message Information Disclosure

**Risk: LOW ✅**

- `handle_submit` catches all exceptions and returns generic `"Server error"` — ✅
- Admin endpoints return `"Access denied"`, `"Ad not found"`, `"Invalid ad_type"` — generic, safe ✅
- **Fix applied:** `int()` conversions on URL params (`ad_id`, `offset`, `limit`) that could throw `ValueError` and leak stack traces are now replaced with `_safe_int()` with proper HTTP 400 responses.

---

## 6. Input Validation

**Risk: MEDIUM → Fixed ✅**

**Content-Type check (NEW):** `handle_submit` now validates that `Content-Type: application/json` is present. Returns HTTP 415 otherwise.

**Body size limit (NEW):** `handle_submit` now rejects request bodies larger than 10 KB (HTTP 413). Checks both `Content-Length` header and actual body size.

**file_id sanitization (NEW):** `proxy_photo` now only accepts `[A-Za-z0-9_-]{1,256}` as valid file IDs.

**Query parameter parsing (NEW):** `offset`, `limit`, `ad_id`, `telegram_id` now use `_safe_int()` instead of bare `int()` — prevents unhandled `ValueError` exceptions.

---

## 7. Rate Limiting

**Status: ✅ Already implemented**

`app/utils/rate_limiter.py` provides sliding-window rate limiting for `/api/submit`:
- Max 3 submissions per 5 minutes per user
- Max 10 submissions per hour per user

**Note:** Rate limiting is in-memory — resets on server restart. Acceptable for MVP.

---

## 8. Server-Side Validation

**Status: ✅ Already implemented**

`app/utils/validators.py` validates all ad fields server-side:
- Required fields, length limits, numeric ranges
- Phone number validation
- Fuel type / transmission enum validation

---

## 9. Debug Log Cleanup

**Status: ✅ Cleaned**

Removed excessive `logger.info()` calls that were used during development:

| File | Removed |
|------|---------|
| `app/api.py` | `[api/submit] User ready`, `Car/Plate ad created`, `Photo request sent`, `FSM state set`, `[AdminAuth] Access granted` |
| `app/handlers/web_app.py` | `[web_app] Received web_app_data`, `[Step 1-4]` step-by-step logs, FSM overwrite log |
| `app/handlers/photos.py` | `User skipped/pressed Done/typed done`, per-photo count log |
| `app/utils/notify.py` | Per-admin notification success log |

**Kept:** Error logs (`logger.exception`), security warnings (`[AdminAuth] Access denied`), key business events (auto-approve, publish success/failure).

---

## 10. Admin Token Timing Attack

**Risk: LOW → Fixed ✅**

**Before:** Token comparison used `==` which is vulnerable to timing attacks.

**Fix applied:** Now uses `hmac.compare_digest()` for constant-time comparison.

---

## Summary of Changes

| Category | Severity | Status |
|----------|----------|--------|
| SQL Injection | Low | ✅ No issues |
| Path Traversal (proxy_photo) | Medium | ✅ Fixed — file_id sanitized |
| Admin Token Leakage | Low-Medium | ✅ Improved — logs sanitized, timing-safe comparison |
| CORS `*` policy | Low | ⚠️ Acceptable for MVP, tighten for production |
| Error info disclosure | Low | ✅ Fixed — safe int parsing |
| Content-Type validation | Medium | ✅ Added |
| Body size limit | Medium | ✅ Added (10 KB) |
| Debug log cleanup | N/A | ✅ Done |
| Rate limiting | Low | ✅ Already existed |
| Input validation | Low | ✅ Already existed |

---

## Recommendations for Production

1. **Validate Telegram initData** using HMAC with bot token (official Telegram method)
2. **Restrict CORS** to specific webapp domain
3. **Move admin token** from query params to `Authorization` header
4. **Add persistent rate limiting** (Redis) if scaling beyond single instance
5. **Add request logging middleware** with request ID for traceability (but never log tokens/secrets)
6. **Consider HTTPS enforcement** at the application level (currently handled by reverse proxy)
