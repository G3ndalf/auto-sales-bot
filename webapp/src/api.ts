// API client for catalog data

const API_BASE = import.meta.env.VITE_API_URL || '';

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
}

export interface PlateAdPreview {
  id: number;
  plate_number: string;
  price: number;
  city: string;
  photo: string | null;
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

// Get user_id from URL (set by bot in KeyboardButton: ?uid=12345)
export function getUserId(): number | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    if (uid) return parseInt(uid, 10);
    // Fallback to Telegram SDK
    const tgUid = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (tgUid) return tgUid;
  } catch { /* ignore */ }
  return null;
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
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// API calls
export const api = {
  getBrands: () => fetchJSON<Brand[]>('/api/brands'),
  getModels: (brand: string) => fetchJSON<Model[]>(`/api/brands/${encodeURIComponent(brand)}/models`),
  getCarAds: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJSON<PaginatedResponse<CarAdPreview>>(`/api/cars${qs}`);
  },
  getCarAd: (id: number) => fetchJSON<CarAdFull>(`/api/cars/${id}`),
  getPlateAds: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJSON<PaginatedResponse<PlateAdPreview>>(`/api/plates${qs}`);
  },
  getPlateAd: (id: number) => fetchJSON<PlateAdFull>(`/api/plates/${id}`),
  getCities: () => fetchJSON<City[]>('/api/cities'),
  photoUrl: (fileId: string) => `${API_BASE}/api/photos/${fileId}`,

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
};
