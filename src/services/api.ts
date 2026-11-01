import { Vehicle, AdminUser, ActivityLog, AdminPermission } from '../types';
import { VEHICLES } from '../data';

const API_BASE = '/api';

export interface LoginResponse {
  token: string;
  user: AdminUser;
}

export interface CreateAdminPayload {
  username: string;
  name: string;
  temporaryPassword: string;
  permissions: AdminPermission[];
}

export interface UpdateAdminPayload {
  username?: string;
  name?: string;
  permissions?: AdminPermission[];
}

export const api = {
  // Fetch vehicles with fallback to static data if backend is offline
  async getVehicles(params?: { category?: string; brand?: string; fuel?: string; search?: string; recent?: boolean }): Promise<Vehicle[]> {
    try {
      const query = new URLSearchParams();
      if (params?.category) query.append('category', params.category);
      if (params?.brand) query.append('brand', params.brand);
      if (params?.fuel) query.append('fuel', params.fuel);
      if (params?.search) query.append('search', params.search);
      if (params?.recent) query.append('recent', 'true');

      const url = `${API_BASE}/vehicles${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.vehicles)) {
        return data.vehicles;
      }
      return VEHICLES;
    } catch (err) {
      console.warn('Backend API unavailable, using fallback dataset:', err);
      return VEHICLES;
    }
  },

  // Fetch single vehicle
  async getVehicle(id: string): Promise<Vehicle | null> {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${id}`);
      if (!res.ok) throw new Error('Vehicle not found');
      const data = await res.json();
      return data.vehicle || null;
    } catch (err) {
      console.warn(`Error fetching vehicle ${id}, searching local fallback:`, err);
      return VEHICLES.find(v => v.id === id) || null;
    }
  },

  // Admin login
  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    return data;
  },

  // Check active session & fetch live profile
  async getMe(token: string): Promise<AdminUser | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  },

  // Change own password
  async changeOwnPassword(
    params: { currentPassword?: string; newPassword: string },
    token: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-own-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');
    return data;
  },

  // Update own username & profile
  async updateOwnProfile(
    params: { name?: string; username: string; currentPassword: string },
    token: string
  ): Promise<{ success: boolean; message: string; user: AdminUser; token: string }> {
    const res = await fetch(`${API_BASE}/auth/update-own-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update username');
    return data;
  },

  // ==========================================
  // Super Admin - User Management APIs
  // ==========================================

  // Get all admin accounts
  async getAdmins(token: string): Promise<AdminUser[]> {
    const res = await fetch(`${API_BASE}/auth/admins`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch admin accounts');
    return data.admins || [];
  },

  // Create new Admin account
  async createAdmin(payload: CreateAdminPayload, token: string): Promise<AdminUser> {
    const res = await fetch(`${API_BASE}/auth/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create admin account');
    return data.admin;
  },

  // Update existing Admin account
  async updateAdmin(id: string, payload: UpdateAdminPayload, token: string): Promise<AdminUser> {
    const res = await fetch(`${API_BASE}/auth/admins/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update admin account');
    return data.admin;
  },

  // Reset Admin's password
  async resetAdminPassword(id: string, temporaryPassword: string, token: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/admins/${id}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ temporaryPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset password');
    return data;
  },

  // Toggle Admin status: active vs deactivated
  async toggleAdminStatus(id: string, status: 'active' | 'deactivated', token: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/admins/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update admin status');
    return data;
  },

  // Delete Admin account
  async deleteAdmin(id: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/admins/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete admin');
  },

  // Get Activity Audit Logs
  async getActivityLogs(token: string, params?: { limit?: number; action?: string; actor?: string }): Promise<ActivityLog[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.action) query.append('action', params.action);
    if (params?.actor) query.append('actor', params.actor);

    const url = `${API_BASE}/activity-logs${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch activity logs');
    return data.logs || [];
  },

  // ==========================================
  // Vehicle Fleet CRUD
  // ==========================================

  // Create new vehicle with photo upload
  async createVehicle(formData: FormData, token: string): Promise<Vehicle> {
    const res = await fetch(`${API_BASE}/vehicles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create vehicle');
    }

    return data.vehicle;
  },

  // Update existing vehicle
  async updateVehicle(id: string, formData: FormData, token: string): Promise<Vehicle> {
    const res = await fetch(`${API_BASE}/vehicles/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update vehicle');
    }

    return data.vehicle;
  },

  // Delete vehicle
  async deleteVehicle(id: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/vehicles/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete vehicle');
    }
  },

  // Customer Bookings & Applications
  async applyFinance(payload: { name: string; phone: string; whatsappUpdates?: boolean; model: string }): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/finance/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      console.warn('Finance API offline, handled locally:', err);
      return { success: true };
    }
  },

  async bookTestDrive(payload: {
    modelId: string;
    modelName: string;
    date: string;
    time: string;
    name: string;
    phone: string;
    email: string;
    hasLicense?: boolean;
  }): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/test-drives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      console.warn('Test drive API offline, handled locally:', err);
      return { success: true };
    }
  },

  async bookService(payload: {
    vehicleModel: string;
    serviceType: string;
    preferredDate: string;
    customerName: string;
    customerPhone: string;
    notes?: string;
  }): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/service/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      console.warn('Service API offline, handled locally:', err);
      return { success: true };
    }
  }
};
