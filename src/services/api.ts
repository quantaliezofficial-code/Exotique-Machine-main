import type {
  ListingInfo,
  Vehicle, AdminUser, ActivityLog, AdminPermission, HomePayload, Offer, Review, SiteSettings,
} from '../types';

const API_BASE = '/api';

/**
 * Admin sessions use an httpOnly cookie set by the server; the token is never visible to
 * JavaScript. Every request sends X-Requested-With, which the server requires on
 * state-changing cookie requests (CSRF protection).
 */
export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-Requested-With', 'XMLHttpRequest');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path.startsWith('/') ? path : `${API_BASE}/${path}`, {
    ...init,
    headers,
    credentials: 'same-origin',
  });
  let data: any = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 200) }; }
  }
  if (!res.ok) {
    const message =
      (data && (data.error || (typeof data.detail === 'string' ? data.detail : data.detail?.message))) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data?.detail);
  }
  return data as T;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export interface CreateAdminPayload {
  username: string;
  name: string;
  temporaryPassword: string;
  permissions?: AdminPermission[];
  rolePreset?: string | null;
}

export interface UpdateAdminPayload {
  username?: string;
  name?: string;
  permissions?: AdminPermission[];
  rolePreset?: string | null;
}

export const api = {
  request,

  // ------------------------------------------------------------ public content
  async getVehicles(): Promise<Vehicle[]> {
    const data = await request<{ vehicles: Vehicle[] }>(`${API_BASE}/vehicles`);
    return Array.isArray(data.vehicles) ? data.vehicles : [];
  },
  async getListing(params: { brand?: string; collection?: string }): Promise<ListingInfo | null> {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    try {
      return await request<ListingInfo>(`${API_BASE}/public/listing${q ? `?${q}` : ''}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  async getVehicle(id: string): Promise<Vehicle | null> {
    try {
      const data = await request<{ vehicle: Vehicle }>(`${API_BASE}/vehicles/${encodeURIComponent(id)}`);
      return data.vehicle || null;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  getHome: (preview = false) => request<HomePayload>(`${API_BASE}/public/home${preview ? '?preview=1' : ''}`),
  getSiteSettings: () => request<{ settings: SiteSettings }>(`${API_BASE}/public/site-settings`),
  getOffers: (preview = false) => request<{ offers: Offer[] }>(`${API_BASE}/public/offers${preview ? '?preview=1' : ''}`),
  getOffer: (slug: string) => request<{ offer: Offer; vehicle: Vehicle | null }>(`${API_BASE}/public/offers/${slug}`),
  getReviews: (limit = 20) => request<{ reviews: Review[] }>(`${API_BASE}/public/reviews?limit=${limit}`),
  submitReview: (payload: { customerName: string; customerTitle?: string; rating?: number; body: string; vehicleId?: string; website?: string }) =>
    request<{ success: boolean; message: string }>(`${API_BASE}/public/reviews`, json('POST', payload)),

  // ------------------------------------------------------------ lead forms
  applyFinance: (payload: { name: string; phone: string; whatsappUpdates?: boolean; model: string; website?: string }) =>
    request<{ success: boolean; reference: string }>(`${API_BASE}/finance/apply`, json('POST', payload)),
  bookTestDrive: (payload: {
    modelId: string; modelName: string; date: string; time: string; name: string; phone: string; email: string;
    hasLicense?: boolean; website?: string;
  }) => request<{ success: boolean; reference: string }>(`${API_BASE}/test-drives`, json('POST', payload)),
  bookService: (payload: {
    vehicleModel: string; serviceType: string; preferredDate: string; customerName: string; customerPhone: string;
    notes?: string; website?: string;
  }) => request<{ success: boolean; reference: string }>(`${API_BASE}/service/book`, json('POST', payload)),
  sendEnquiry: (payload: { name: string; phone: string; email?: string; vehicleInterest?: string; message?: string; source?: string; website?: string }) =>
    request<{ success: boolean; reference: string }>(`${API_BASE}/enquiries`, json('POST', payload)),

  // ------------------------------------------------------------ auth
  login: (username: string, password: string) =>
    request<{ user: AdminUser }>(`${API_BASE}/auth/login`, json('POST', { username, password })),
  logout: () => request(`${API_BASE}/auth/logout`, json('POST')),
  async getMe(): Promise<AdminUser | null> {
    try {
      const data = await request<{ user: AdminUser | null }>(`${API_BASE}/auth/session`);
      return data.user || null;
    } catch {
      return null;
    }
  },
  changeOwnPassword: (params: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string; user: AdminUser }>(`${API_BASE}/auth/change-own-password`, json('POST', params)),
  updateOwnProfile: (params: { name?: string; username: string; currentPassword: string }) =>
    request<{ success: boolean; message: string; user: AdminUser }>(`${API_BASE}/auth/update-own-profile`, json('POST', params)),
  getPermissionCatalogue: () =>
    request<{ permissions: Record<string, string>; presets: Record<string, { label: string; permissions: AdminPermission[] }> }>(
      `${API_BASE}/auth/permissions`),

  // ------------------------------------------------------------ staff management
  async getAdmins(): Promise<AdminUser[]> {
    return (await request<{ admins: AdminUser[] }>(`${API_BASE}/auth/admins`)).admins || [];
  },
  async createAdmin(payload: CreateAdminPayload): Promise<AdminUser> {
    return (await request<{ admin: AdminUser }>(`${API_BASE}/auth/admins`, json('POST', payload))).admin;
  },
  async updateAdmin(id: string, payload: UpdateAdminPayload): Promise<AdminUser> {
    return (await request<{ admin: AdminUser }>(`${API_BASE}/auth/admins/${id}`, json('PUT', payload))).admin;
  },
  resetAdminPassword: (id: string, temporaryPassword: string) =>
    request<{ success: boolean; message: string }>(`${API_BASE}/auth/admins/${id}/reset-password`, json('POST', { temporaryPassword })),
  toggleAdminStatus: (id: string, status: 'active' | 'deactivated') =>
    request<{ success: boolean; message: string }>(`${API_BASE}/auth/admins/${id}/status`, json('PATCH', { status })),
  deleteAdmin: (id: string) => request(`${API_BASE}/auth/admins/${id}`, json('DELETE')),
  async getActivityLogs(params?: { limit?: number; action?: string; actor?: string }): Promise<ActivityLog[]> {
    const q = new URLSearchParams();
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.action) q.append('action', params.action);
    if (params?.actor) q.append('actor', params.actor);
    return (await request<{ logs: ActivityLog[] }>(`${API_BASE}/activity-logs${[...q].length ? `?${q}` : ''}`)).logs || [];
  },

  // ------------------------------------------------------------ inventory
  async getAdminVehicles(): Promise<Vehicle[]> {
    return (await request<{ vehicles: Vehicle[] }>(`${API_BASE}/admin/vehicles`)).vehicles || [];
  },
  async createVehicle(formData: FormData): Promise<Vehicle> {
    return (await request<{ vehicle: Vehicle }>(`${API_BASE}/vehicles`, { method: 'POST', body: formData })).vehicle;
  },
  async updateVehicle(id: string, formData: FormData): Promise<Vehicle> {
    return (await request<{ vehicle: Vehicle }>(`${API_BASE}/vehicles/${encodeURIComponent(id)}`, { method: 'PUT', body: formData })).vehicle;
  },
  deleteVehicle: (id: string) => request(`${API_BASE}/vehicles/${encodeURIComponent(id)}`, json('DELETE')),

  // ------------------------------------------------------------ CMS (admin)
  admin: {
    get: <T = any>(path: string) => request<T>(`${API_BASE}/admin/${path}`),
    post: <T = any>(path: string, body?: unknown) => request<T>(`${API_BASE}/admin/${path}`, json('POST', body ?? {})),
    put: <T = any>(path: string, body: unknown) => request<T>(`${API_BASE}/admin/${path}`, json('PUT', body)),
    patch: <T = any>(path: string, body: unknown) => request<T>(`${API_BASE}/admin/${path}`, json('PATCH', body)),
    del: <T = any>(path: string) => request<T>(`${API_BASE}/admin/${path}`, json('DELETE')),
    upload: <T = any>(path: string, form: FormData) => request<T>(`${API_BASE}/admin/${path}`, { method: 'POST', body: form }),
  },
};
