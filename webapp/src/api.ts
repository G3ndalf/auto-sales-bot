// API client for catalog data

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Telegram user IDs с правами администратора (должен совпадать с ADMIN_IDS на бэкенде) */
export const ADMIN_IDS = [5849807401];

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function getAdminToken(): string | null {
  // Token is passed in the webapp URL by the bot: /admin?v=123&token=xxx
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  } catch {
    return null;
  }
}

function adminQueryParams(): string {
  const parts: string[] = [];

  // Pass secret token from URL (set by bot in KeyboardButton)
  const token = getAdminToken();
  if (token) {
    parts.push(`token=${encodeURIComponent(token)}`);
  }

  // Also try Telegram SDK user_id as fallback
  const tg = window.Telegram?.WebApp;
  const userId = tg?.initDataUnsafe?.user?.id;
  if (userId) {
    parts.push(`user_id=${userId}`);
  }

  return parts.length > 0 ? '?' + parts.join('&') : '';
}

// Types
export interface Brand {
  brand: string;
  count: number;
}

export interface Model {
  model: string;
  count: number;
}

export interface CarAdPreview {
  id: number;
  brand: string;
  model: string;
  year: number;
  price: number;
  city: string;
  mileage: number;
  fuel_type: string;
  transmission: string;
  photo: string | null;
  view_count: number;
}

export interface CarAdFull {
  id: number;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  engine_volume: number;
  fuel_type: string;
  transmission: string;
  color: string;
  city: string;
  description: string;
  contact_phone: string;
  contact_telegram: string | null;
  photos: string[];
  created_at: string | null;
  view_count: number;
}

export interface PlateAdPreview {
  id: number;
  plate_number: string;
  price: number;
  city: string;
  photo: string | null;
  view_count: number;
}

export interface PlateAdFull {
  id: number;
  plate_number: string;
  price: number;
  city: string;
  description: string;
  contact_phone: string;
  contact_telegram: string | null;
  photos: string[];
  created_at: string | null;
  view_count: number;
}

/** Элемент списка избранных объявлений */
export interface FavoriteItem {
  ad_type: 'car' | 'plate';
  id: number;
  title: string;
  price: number;
  city: string;
  photo: string | null;
  view_count: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface City {
  city: string;
  count: number;
}

export interface AdminPendingAd {
  ad_type: 'car' | 'plate';
  id: number;
  title: string;
  price: number;
  city: string;
  description: string;
  contact_phone: string;
  contact_telegram: string | null;
  photo: string | null;
  created_at: string | null;
  brand?: string;
  model?: string;
  year?: number;
  mileage?: number;
  engine_volume?: number;
  fuel_type?: string;
  transmission?: string;
  color?: string;
  plate_number?: string;
}

export interface AdminStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

/**
 * Объявление пользователя (универсальный тип для "Мои объявления").
 * Может быть авто или номером — определяется по ad_type.
 */
export interface UserAd {
  id: number;
  ad_type: 'car' | 'plate';
  brand?: string;
  model?: string;
  plate_number?: string;
  status: 'pending' | 'approved' | 'rejected';
  price: number;
  city: string;
  photo: string | null;
  created_at: string | null;
}

export interface UserProfile {
  name: string;
  username: string | null;
  member_since: string | null;
  ads: {
    total: number;
    active: number;
    pending: number;
    rejected: number;
    cars: number;
    plates: number;
  };
}

/**
 * Кэш user_id на уровне модуля.
 *
 * При первом вызове getUserId() считывается из URL (?uid=) или Telegram SDK,
 * затем кэшируется. Это гарантирует, что uid не теряется при навигации
 * внутри HashRouter (hash меняется, но search params остаются — однако
 * для надёжности кэшируем явно).
 */
let _cachedUid: number | null = null;

/**
 * Получить Telegram user_id текущего пользователя.
 *
 * Приоритет:
 * 1. Кэшированное значение (из предыдущего вызова)
 * 2. URL query param ?uid=12345 (устанавливается ботом в web_app URL)
 * 3. Telegram WebApp SDK initDataUnsafe.user.id
 *
 * Результат кэшируется — безопасно вызывать многократно.
 */
export function getUserId(): number | null {
  // Возвращаем кэш если есть
  if (_cachedUid) return _cachedUid;

  try {
    // 1. Из URL query params (?uid=12345)
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    if (uid) {
      _cachedUid = parseInt(uid, 10);
      return _cachedUid;
    }

    // 2. Fallback: Telegram SDK (работает когда Mini App открыт через бот)
    const tgUid = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (tgUid) {
      _cachedUid = tgUid;
      return _cachedUid;
    }
  } catch { /* ignore */ }

  return null;
}

/**
 * Получить Telegram username текущего пользователя.
 */
export function getUsername(): string | null {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.username || null;
  } catch { return null; }
}

// Custom error class for submit errors
export class SubmitError extends Error {
  type: 'validation' | 'rate_limit' | 'duplicate' | 'generic';
  errors?: string[];

  constructor(
    message: string,
    type: 'validation' | 'rate_limit' | 'duplicate' | 'generic',
    errors?: string[],
  ) {
    super(message);
    this.name = 'SubmitError';
    this.type = type;
    this.errors = errors;
  }
}

// Submit ad via API (sendData fallback)
export async function submitAd(data: Record<string, unknown>): Promise<{ ok: boolean; ad_id?: number }> {
  const uid = getUserId();
  if (!uid) throw new Error('user_id not available');
  const body = { ...data, user_id: uid };
  const res = await fetch(`${API_BASE}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

    if (res.status === 409 && payload.error_type === 'duplicate') {
      throw new SubmitError(
        payload.error || 'Похожее объявление уже существует',
        'duplicate',
      );
    }

    if (res.status === 400 && Array.isArray(payload.errors)) {
      throw new SubmitError(
        payload.errors.join('; '),
        'validation',
        payload.errors,
      );
    }

    if (res.status === 429) {
      throw new SubmitError(
        payload.error || 'Слишком много запросов',
        'rate_limit',
      );
    }

    throw new SubmitError(
      payload.error || `HTTP ${res.status}`,
      'generic',
    );
  }
  return res.json();
}

/**
 * Загрузить одно фото на сервер.
 * Возвращает photo_id для использования в submitAd.
 *
 * Используется компонентом PhotoUploader — загружает файл через multipart/form-data.
 * Content-Type НЕ ставим вручную — браузер сам добавит с правильным boundary.
 */
export async function uploadPhoto(file: File): Promise<string> {
  const uid = getUserId();
  if (!uid) throw new Error('user_id not available');

  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch(`${API_BASE}/api/photos/upload?user_id=${uid}`, {
    method: 'POST',
    body: formData,
    // НЕ ставим Content-Type — браузер сам добавит с boundary
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new SubmitError(
      payload.error || `Ошибка загрузки (${res.status})`,
      res.status === 429 ? 'rate_limit' : 'generic',
    );
  }

  const data = await res.json();
  return data.photo_id;
}

// API calls
export const api = {
  getBrands: () => fetchJSON<Brand[]>('/api/brands'),
  getModels: (brand: string) => fetchJSON<Model[]>(`/api/brands/${encodeURIComponent(brand)}/models`),
  getCarAds: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJSON<PaginatedResponse<CarAdPreview>>(`/api/cars${qs}`);
  },
  getCarAd: (id: number) => {
    const uid = getUserId();
    const qs = uid ? `?user_id=${uid}` : '';
    return fetchJSON<CarAdFull>(`/api/cars/${id}${qs}`);
  },
  getPlateAds: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJSON<PaginatedResponse<PlateAdPreview>>(`/api/plates${qs}`);
  },
  getPlateAd: (id: number) => {
    const uid = getUserId();
    const qs = uid ? `?user_id=${uid}` : '';
    return fetchJSON<PlateAdFull>(`/api/plates/${id}${qs}`);
  },
  getCities: () => fetchJSON<City[]>('/api/cities'),
  photoUrl: (fileId: string) => `${API_BASE}/api/photos/${fileId}`,
  getProfile: (telegramId: number) => fetchJSON<UserProfile>(`/api/profile/${telegramId}`),

  // ===== Мои объявления =====

  /** Получить все объявления пользователя (авто + номера) */
  getUserAds: (telegramId: number) =>
    fetchJSON<{ cars: UserAd[]; plates: UserAd[] }>(`/api/user/${telegramId}/ads`),

  /** Обновить объявление авто (PUT). После редактирования — повторная модерация */
  updateCarAd: (adId: number, data: Record<string, unknown>) => {
    const uid = getUserId();
    return fetchJSON<{ ok: boolean }>(`/api/ads/car/${adId}?user_id=${uid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /** Обновить объявление номера (PUT). После редактирования — повторная модерация */
  updatePlateAd: (adId: number, data: Record<string, unknown>) => {
    const uid = getUserId();
    return fetchJSON<{ ok: boolean }>(`/api/ads/plate/${adId}?user_id=${uid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /** Удалить объявление (авто или номер) */
  deleteAd: (adType: 'car' | 'plate', adId: number) => {
    const uid = getUserId();
    return fetchJSON<{ ok: boolean }>(`/api/ads/${adType}/${adId}?user_id=${uid}`, {
      method: 'DELETE',
    });
  },

  // ===== Избранное =====

  /** Добавить объявление в избранное */
  addFavorite: (adType: string, adId: number) => {
    const uid = getUserId();
    return fetchJSON<{ ok: boolean }>(`/api/favorites?user_id=${uid}&ad_type=${adType}&ad_id=${adId}`, { method: 'POST' });
  },

  /** Удалить объявление из избранного */
  removeFavorite: (adType: string, adId: number) => {
    const uid = getUserId();
    return fetchJSON<{ ok: boolean }>(`/api/favorites?user_id=${uid}&ad_type=${adType}&ad_id=${adId}`, { method: 'DELETE' });
  },

  /** Получить список избранных объявлений текущего пользователя */
  getFavorites: () => {
    const uid = getUserId();
    return fetchJSON<{ items: FavoriteItem[] }>(`/api/favorites?user_id=${uid}`);
  },

  // Admin
  adminGetPending: () => {
    return fetchJSON<PaginatedResponse<AdminPendingAd>>(`/api/admin/pending${adminQueryParams()}`);
  },
  adminGetStats: () => {
    return fetchJSON<AdminStats>(`/api/admin/stats${adminQueryParams()}`);
  },
  adminApprove: (adType: string, adId: number) => {
    return fetchJSON<{ ok: boolean }>(`/api/admin/approve/${adType}/${adId}${adminQueryParams()}`, {
      method: 'POST',
    });
  },
  adminReject: (adType: string, adId: number, reason?: string) => {
    return fetchJSON<{ ok: boolean }>(`/api/admin/reject/${adType}/${adId}${adminQueryParams()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Не прошло модерацию' }),
    });
  },

  /** Сгенерировать тестовое объявление с рандомными данными и фото */
  adminGenerateAd: () => {
    return fetchJSON<{
      ok: boolean;
      ad?: { id: number; title: string; price: number; city: string; photos_attached: number };
    }>(`/api/admin/generate${adminQueryParams()}`, { method: 'POST' });
  },
};
