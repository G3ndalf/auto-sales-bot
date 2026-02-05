// API client for catalog data

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function adminHeaders(): Record<string, string> {
  const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  if (!userId) return {};
  return { 'X-Telegram-User-Id': String(userId) };
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
  adminGetPending: () =>
    fetchJSON<PaginatedResponse<AdminPendingAd>>('/api/admin/pending', {
      headers: adminHeaders(),
    }),
  adminGetStats: () =>
    fetchJSON<AdminStats>('/api/admin/stats', {
      headers: adminHeaders(),
    }),
  adminApprove: (adType: string, adId: number) =>
    fetchJSON<{ ok: boolean }>(`/api/admin/approve/${adType}/${adId}`, {
      method: 'POST',
      headers: adminHeaders(),
    }),
  adminReject: (adType: string, adId: number, reason?: string) =>
    fetchJSON<{ ok: boolean }>(`/api/admin/reject/${adType}/${adId}`, {
      method: 'POST',
      headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Не прошло модерацию' }),
    }),
};
