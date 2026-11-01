export interface ColorOption {
  name: string;
  hex: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  badge: string;
  type: string;
  category?: 'premium' | 'non-premium';
  lifestyle: 'SUV' | 'Sedan' | 'Electric' | 'Luxury' | 'CNG';
  fuel: 'Petrol' | 'Diesel' | 'Electric' | 'CNG' | 'Hybrid';
  transmission: 'Automatic' | 'Manual';
  price: number; // in Lakhs
  emi: number; // monthly EMI in INR
  seats: number;
  engine: string;
  power: string;
  mileage: string; // or range for electric
  images: string[];
  colors: ColorOption[];
  description: string;
  features: string[];
  rating: number;
  createdAt?: string;
  updatedAt?: string;
  isRecent?: boolean;
}

export type ActivePage = 'home' | 'inventory' | 'details' | 'finance' | 'tradein' | 'testdrive' | 'service' | 'offers' | 'admin';

export type AdminRole = 'superadmin' | 'admin';

export type AdminPermission = 
  | 'inventory:view'
  | 'inventory:create'
  | 'inventory:edit'
  | 'inventory:delete'
  | 'pricing:edit'
  | 'logs:view';

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  permissions?: AdminPermission[];
  status?: 'active' | 'deactivated';
  mustChangePassword?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  target?: string;
  details: string;
  ip?: string;
}

export interface FinanceApplication {
  name: string;
  phone: string;
  whatsappUpdates: boolean;
  model: string;
  status: 'pending' | 'approved';
  id?: string;
}

export interface TradeInEstimation {
  brand: string;
  model: string;
  year: number;
  kms: number;
  condition: 'Excellent' | 'Good' | 'Fair';
}

export interface TestDriveBooking {
  id: string;
  modelId: string;
  modelName: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  hasLicense: boolean;
  status: 'scheduled' | 'Cancelled';
  createdAt: string;
}

export interface ServiceBooking {
  id: string;
  name: string;
  phone: string;
  model: string;
  serviceType: string;
  date: string;
  status: 'Scheduled' | 'Cancelled';
}
