// API client for catalog data

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function getAdminUserId(): string | null {
  const tg = window.Telegram?.WebApp;

  // Debug: log all available sources
  console.log('[AdminAuth] initData:', tg?.initData);
  console.log('[AdminAuth] initDataUnsafe:', JSON.stringify(tg?.initDataUnsafe));
  console.log('[AdminAuth] user:', JSON.stringify(tg?.initDataUnsafe?.user));
  console.log('[AdminAuth] location.hash:', window.location.hash);

  // Source 1: initDataUnsafe.user.id (standard SDK path)
  const userId = tg?.initDataUnsafe?.user?.id;
  if (userId) {
    console.log('[AdminAuth] Got user_id from initDataUnsafe:', userId);
    return String(userId);
  }

  // Source 2: parse from initData string
  try {
    const params = new URLSearchParams(tg?.initData || '');
    const userJson = params.get('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user.id) {
        console.log('[AdminAuth] Got user_id from initData parse:', user.id);
        return String(user.id);
      }
    }
  } catch (e) {
    console.warn('[AdminAuth] Failed to parse initData:', e);
  }

  // Source 3: parse from URL hash (#tgWebAppData=...)
  try {
    const hash = window.location.hash.slice(1); // remove #
    const hashParams = new URLSearchParams(hash);
    const tgWebAppData = hashParams.get('tgWebAppData');
    if (tgWebAppData) {
      const dataParams = new URLSearchParams(tgWebAppData);
      const userJson = dataParams.get('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user.id) {
          console.log('[AdminAuth] Got user_id from URL hash:', user.id);
          return String(user.id);
        }
      }
    }
  } catch (e) {
    console.warn('[AdminAuth] Failed to parse URL hash:', e);
  }

  console.error('[AdminAuth] Could not extract user_id from any source');
  return null;
}

function adminHeaders(): Record<string, string> {
  const userId = getAdminUserId();
  if (!userId) return {};
  return { 'X-Telegram-User-Id': userId };
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
    const uid = getAdminUserId();
    const q = uid ? `?user_id=${uid}` : '';
    return fetchJSON<PaginatedResponse<AdminPendingAd>>(`/api/admin/pending${q}`, {
      headers: adminHeaders(),
    });
  },
  adminGetStats: () => {
    const uid = getAdminUserId();
    const q = uid ? `?user_id=${uid}` : '';
    return fetchJSON<AdminStats>(`/api/admin/stats${q}`, {
      headers: adminHeaders(),
    });
  },
  adminApprove: (adType: string, adId: number) => {
    const uid = getAdminUserId();
    const q = uid ? `?user_id=${uid}` : '';
    return fetchJSON<{ ok: boolean }>(`/api/admin/approve/${adType}/${adId}${q}`, {
      method: 'POST',
      headers: adminHeaders(),
    });
  },
  adminReject: (adType: string, adId: number, reason?: string) => {
    const uid = getAdminUserId();
    const q = uid ? `?user_id=${uid}` : '';
    return fetchJSON<{ ok: boolean }>(`/api/admin/reject/${adType}/${adId}${q}`, {
      method: 'POST',
      headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Не прошло модерацию' }),
    });
  },
};
