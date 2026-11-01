import React, { useState, useEffect, useRef } from 'react';
import { Vehicle, AdminUser, ActivePage, ActivityLog, AdminPermission } from '../types';
import { api } from '../services/api';
import { PREMIUM_BRANDS, NON_PREMIUM_BRANDS } from '../data';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  Lock, 
  LogOut, 
  Car, 
  ShieldCheck, 
  Eye, 
  Image as ImageIcon,
  DollarSign,
  Fuel,
  Search,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Key,
  Users,
  ShieldAlert,
  LayoutDashboard,
  History,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  Copy,
  FileText,
  UserCheck,
  Power,
  User,
  EyeOff
} from 'lucide-react';

interface AdminPortalViewProps {
  setActivePage: (page: ActivePage) => void;
  onVehicleDataChange?: () => void;
}

type AdminTab = 'dashboard' | 'vehicles' | 'admins' | 'roles' | 'logs' | 'account';

const ALL_AVAILABLE_PERMISSIONS: { id: AdminPermission; label: string; desc: string }[] = [
  { id: 'inventory:view', label: 'View Inventory', desc: 'Browse full showroom catalog and fleet analytics' },
  { id: 'inventory:create', label: 'Create Vehicles', desc: 'Add new cars, specs, and photo galleries' },
  { id: 'inventory:edit', label: 'Edit Vehicle Specs', desc: 'Update model, badges, transmission, features & photos' },
  { id: 'inventory:delete', label: 'Delete Vehicles', desc: 'Permanently remove cars from showroom catalog' },
  { id: 'pricing:edit', label: 'Pricing Authority', desc: 'Modify pricing in Lakhs and monthly EMI values' },
  { id: 'logs:view', label: 'Audit & Activity Logs', desc: 'View security actions, login attempts & administrative events' }
];

export default function AdminPortalView({ setActivePage, onVehicleDataChange }: AdminPortalViewProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('exotique_admin_token'));
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forced Password Change State (When mustChangePassword is true)
  const [forcedNewPassword, setForcedNewPassword] = useState('');
  const [forcedConfirmPassword, setForcedConfirmPassword] = useState('');
  const [forcedPasswordError, setForcedPasswordError] = useState('');
  const [isSavingForcedPassword, setIsSavingForcedPassword] = useState(false);

  // My Account / Change Own Password Form State
  const [ownCurrentPassword, setOwnCurrentPassword] = useState('');
  const [ownNewPassword, setOwnNewPassword] = useState('');
  const [ownConfirmPassword, setOwnConfirmPassword] = useState('');
  const [ownPasswordError, setOwnPasswordError] = useState('');
  const [ownPasswordSuccess, setOwnPasswordSuccess] = useState('');
  const [isSavingOwnPassword, setIsSavingOwnPassword] = useState(false);

  // Profile & Username Update Form State
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Admin Management State (Super Admin Only)
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // Create Admin Modal State
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminTempPassword, setNewAdminTempPassword] = useState('');
  const [newAdminPermissions, setNewAdminPermissions] = useState<AdminPermission[]>([
    'inventory:view',
    'inventory:create',
    'inventory:edit',
    'pricing:edit'
  ]);
  const [createAdminError, setCreateAdminError] = useState('');
  const [createAdminSuccess, setCreateAdminSuccess] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // Edit Admin Modal State
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminUsername, setEditAdminUsername] = useState('');
  const [editAdminPermissions, setEditAdminPermissions] = useState<AdminPermission[]>([]);
  const [editAdminError, setEditAdminError] = useState('');
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);

  // Reset Admin Password Modal State
  const [resetTargetAdmin, setResetTargetAdmin] = useState<AdminUser | null>(null);
  const [resetTempPassword, setResetTempPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Delete Admin Confirmation State
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);

  // Activity Audit Logs State
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilterAction, setLogFilterAction] = useState('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Inventory Management State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'premium' | 'non-premium'>('all');

  // Modal State for Add / Edit Vehicle
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Delete Vehicle Confirmation Modal
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Vehicle Form Fields
  const [brand, setBrand] = useState('BMW');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [badge, setBadge] = useState('');
  const [type, setType] = useState('Luxury SUV');
  const [category, setCategory] = useState<'premium' | 'non-premium'>('premium');
  const [lifestyle, setLifestyle] = useState<'SUV' | 'Sedan' | 'Electric' | 'Luxury' | 'CNG'>('SUV');
  const [fuel, setFuel] = useState<'Petrol' | 'Diesel' | 'Hybrid' | 'Electric' | 'CNG'>('Petrol');
  const [transmission, setTransmission] = useState<'Automatic' | 'Manual'>('Automatic');
  const [price, setPrice] = useState('');
  const [emi, setEmi] = useState('');
  const [seats, setSeats] = useState('5');
  const [engine, setEngine] = useState('');
  const [power, setPower] = useState('');
  const [mileage, setMileage] = useState('');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check token session on mount
  useEffect(() => {
    if (token) {
      api.getMe(token)
        .then(u => {
          if (u) {
            setUser(u);
            loadVehicles();
            if (u.role === 'superadmin') {
              loadAdmins();
            }
            if (u.role === 'superadmin' || u.permissions?.includes('logs:view')) {
              loadLogs();
            }
          } else {
            handleLogout();
          }
        })
        .catch(() => handleLogout());
    }
  }, [token]);

  // Synchronize profile form when user object updates
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileUsername(user.username);
    }
  }, [user]);

  // Load all vehicles from API
  const loadVehicles = async () => {
    setIsLoadingVehicles(true);
    try {
      const list = await api.getVehicles();
      setVehicles(list);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  // Load Admin Accounts
  const loadAdmins = async () => {
    if (!token) return;
    setIsLoadingAdmins(true);
    try {
      const list = await api.getAdmins(token);
      setAdminsList(list);
    } catch (err) {
      console.error('Error loading admins:', err);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  // Load Activity Audit Logs
  const loadLogs = async () => {
    if (!token) return;
    setIsLoadingLogs(true);
    try {
      const logs = await api.getActivityLogs(token, { limit: 150 });
      setActivityLogs(logs);
    } catch (err) {
      console.error('Error loading activity logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const data = await api.login(loginUsername, loginPassword);
      localStorage.setItem('exotique_admin_token', data.token);
      setToken(data.token);
      setUser(data.user);
      loadVehicles();
      if (data.user.role === 'superadmin') {
        loadAdmins();
      }
      if (data.user.role === 'superadmin' || data.user.permissions?.includes('logs:view')) {
        loadLogs();
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid username or password');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('exotique_admin_token');
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
  };

  // Forced Password Change Handler (Must change temporary password upon first login)
  const handleForcedPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setForcedPasswordError('');

    if (forcedNewPassword.length < 8) {
      setForcedPasswordError('Permanent password must be at least 8 characters long.');
      return;
    }

    if (forcedNewPassword !== forcedConfirmPassword) {
      setForcedPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSavingForcedPassword(true);
    try {
      await api.changeOwnPassword({ newPassword: forcedNewPassword }, token);
      // Refresh user profile
      const updatedUser = await api.getMe(token);
      if (updatedUser) {
        setUser(updatedUser);
      }
      setForcedNewPassword('');
      setForcedConfirmPassword('');
    } catch (err: any) {
      setForcedPasswordError(err.message || 'Failed to establish permanent password');
    } finally {
      setIsSavingForcedPassword(false);
    }
  };

  // Change Own Password Handler (Account Settings tab)
  const handleOwnPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setOwnPasswordError('');
    setOwnPasswordSuccess('');

    if (ownNewPassword.length < 8) {
      setOwnPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (ownNewPassword !== ownConfirmPassword) {
      setOwnPasswordError('New passwords do not match.');
      return;
    }

    setIsSavingOwnPassword(true);
    try {
      const res = await api.changeOwnPassword(
        { currentPassword: ownCurrentPassword, newPassword: ownNewPassword },
        token
      );
      setOwnPasswordSuccess(res.message || 'Password updated successfully!');
      setOwnCurrentPassword('');
      setOwnNewPassword('');
      setOwnConfirmPassword('');
      setTimeout(() => setOwnPasswordSuccess(''), 5000);
    } catch (err: any) {
      setOwnPasswordError(err.message || 'Failed to change password');
    } finally {
      setIsSavingOwnPassword(false);
    }
  };

  // Update Profile & Username Handler
  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setProfileError('');
    setProfileSuccess('');

    if (profileUsername.trim().length < 3) {
      setProfileError('Username must be at least 3 characters long.');
      return;
    }

    if (!profilePasswordConfirm) {
      setProfileError('Please enter your current password to confirm changes.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await api.updateOwnProfile(
        {
          name: profileName,
          username: profileUsername,
          currentPassword: profilePasswordConfirm
        },
        token
      );

      setToken(res.token);
      localStorage.setItem('exotique_admin_token', res.token);
      setUser(res.user);
      setProfilePasswordConfirm('');
      setProfileSuccess(res.message || 'Profile and username updated successfully!');
      loadLogs();
      if (res.user.role === 'superadmin') {
        loadAdmins();
      }
      setTimeout(() => setProfileSuccess(''), 5000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update username');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Generate Temporary Secure Password Helper
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Create Admin Submit
  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || user?.role !== 'superadmin') return;
    setCreateAdminError('');
    setCreateAdminSuccess('');

    if (newAdminTempPassword.length < 8) {
      setCreateAdminError('Temporary password must be at least 8 characters long.');
      return;
    }

    setIsSubmittingAdmin(true);
    try {
      await api.createAdmin({
        name: newAdminName,
        username: newAdminUsername,
        temporaryPassword: newAdminTempPassword,
        permissions: newAdminPermissions
      }, token);

      setCreateAdminSuccess(`Admin account "${newAdminUsername}" created successfully!`);
      await loadAdmins();
      await loadLogs();
      setTimeout(() => {
        setIsCreateAdminModalOpen(false);
        setNewAdminName('');
        setNewAdminUsername('');
        setNewAdminTempPassword('');
        setCreateAdminSuccess('');
      }, 1500);
    } catch (err: any) {
      setCreateAdminError(err.message || 'Failed to create admin');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  // Open Edit Admin Modal
  const handleOpenEditAdmin = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditAdminName(admin.name);
    setEditAdminUsername(admin.username);
    setEditAdminPermissions(admin.permissions || []);
    setEditAdminError('');
  };

  // Update Admin Submit
  const handleUpdateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingAdmin || user?.role !== 'superadmin') return;
    setEditAdminError('');
    setIsUpdatingAdmin(true);

    try {
      await api.updateAdmin(editingAdmin.id, {
        name: editAdminName,
        username: editAdminUsername,
        permissions: editAdminPermissions
      }, token);

      await loadAdmins();
      await loadLogs();
      setEditingAdmin(null);
    } catch (err: any) {
      setEditAdminError(err.message || 'Failed to update admin account');
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  // Reset Admin Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !resetTargetAdmin || user?.role !== 'superadmin') return;
    setResetPasswordError('');
    setResetPasswordSuccess('');

    if (resetTempPassword.length < 8) {
      setResetPasswordError('Temporary password must be at least 8 characters long.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await api.resetAdminPassword(resetTargetAdmin.id, resetTempPassword, token);
      setResetPasswordSuccess(res.message);
      await loadAdmins();
      await loadLogs();
      setTimeout(() => {
        setResetTargetAdmin(null);
        setResetTempPassword('');
        setResetPasswordSuccess('');
      }, 2000);
    } catch (err: any) {
      setResetPasswordError(err.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Toggle Admin Status: Active vs Deactivated
  const handleToggleAdminStatus = async (admin: AdminUser) => {
    if (!token || user?.role !== 'superadmin') return;
    const nextStatus = admin.status === 'deactivated' ? 'active' : 'deactivated';
    try {
      await api.toggleAdminStatus(admin.id, nextStatus, token);
      await loadAdmins();
      await loadLogs();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle admin status');
    }
  };

  // Delete Admin Submit
  const handleConfirmDeleteAdmin = async () => {
    if (!token || !deletingAdmin || user?.role !== 'superadmin') return;
    setIsDeletingAdmin(true);
    try {
      await api.deleteAdmin(deletingAdmin.id, token);
      await loadAdmins();
      await loadLogs();
      setDeletingAdmin(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete admin account');
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  // Check permission helper for UI
  const hasPermission = (permission: AdminPermission): boolean => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    return !!user.permissions?.includes(permission);
  };

  // Handle image files selection with live preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files: File[] = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      const newPreviews = files.map((file: File) => URL.createObjectURL(file));
      setFilePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(filePreviews[index]);
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  // Open modal in Create vehicle mode
  const handleOpenCreate = () => {
    if (!hasPermission('inventory:create')) {
      alert('Access denied: You do not possess the "inventory:create" permission.');
      return;
    }
    setEditingVehicleId(null);
    setBrand('BMW');
    setCustomBrand('');
    setModel('');
    setBadge('');
    setType('Luxury SUV');
    setCategory('premium');
    setLifestyle('SUV');
    setFuel('Petrol');
    setTransmission('Automatic');
    setPrice('');
    setEmi('');
    setSeats('5');
    setEngine('');
    setPower('');
    setMileage('');
    setDescription('');
    setFeaturesText('Certified 120-Point Inspection\nSingle 1st Owner History\nOriginal OEM Spares Only\nFull Service History Available');
    setSelectedFiles([]);
    setFilePreviews([]);
    setExistingImages([]);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  // Open modal in Edit vehicle mode
  const handleOpenEdit = (v: Vehicle) => {
    if (!hasPermission('inventory:edit')) {
      alert('Access denied: You do not possess the "inventory:edit" permission.');
      return;
    }
    setEditingVehicleId(v.id);
    const isKnown = [...PREMIUM_BRANDS, ...NON_PREMIUM_BRANDS].includes(v.brand as any);
    if (isKnown) {
      setBrand(v.brand);
      setCustomBrand('');
    } else {
      setBrand('Other');
      setCustomBrand(v.brand);
    }
    setModel(v.model);
    setBadge(v.badge);
    setType(v.type);
    setCategory(v.category || (v.price > 25 ? 'premium' : 'non-premium'));
    setLifestyle(v.lifestyle || 'SUV');
    setFuel(v.fuel);
    setTransmission(v.transmission);
    setPrice(v.price.toString());
    setEmi(v.emi ? v.emi.toString() : '');
    setSeats(v.seats ? v.seats.toString() : '5');
    setEngine(v.engine || '');
    setPower(v.power || '');
    setMileage(v.mileage || '');
    setDescription(v.description || '');
    setFeaturesText(v.features ? v.features.join('\n') : '');
    setExistingImages(v.images || []);
    setSelectedFiles([]);
    setFilePreviews([]);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  // Submit vehicle form (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    try {
      const finalBrand = brand === 'Other' ? customBrand.trim() : brand;
      if (!finalBrand) throw new Error('Brand name is required');
      if (!model.trim()) throw new Error('Vehicle model name is required');
      if (!price || isNaN(Number(price))) throw new Error('Valid price in Lakhs is required');

      const formData = new FormData();
      formData.append('brand', finalBrand);
      formData.append('model', model.trim());
      formData.append('badge', badge.trim() || `${model.trim()} Edition`);
      formData.append('type', type.trim());
      formData.append('category', category);
      formData.append('lifestyle', lifestyle);
      formData.append('fuel', fuel);
      formData.append('transmission', transmission);
      formData.append('price', price);
      if (emi) formData.append('emi', emi);
      formData.append('seats', seats);
      formData.append('engine', engine.trim());
      formData.append('power', power.trim());
      formData.append('mileage', mileage.trim());
      formData.append('description', description.trim());
      
      const featuresArr = featuresText.split('\n').map(s => s.trim()).filter(Boolean);
      formData.append('features', JSON.stringify(featuresArr));

      selectedFiles.forEach(file => {
        formData.append('photos', file);
      });

      if (editingVehicleId) {
        formData.append('imageUrls', JSON.stringify(existingImages));
        formData.append('replaceImages', 'true');
        await api.updateVehicle(editingVehicleId, formData, token);
        setFormSuccess('Vehicle updated successfully!');
      } else {
        await api.createVehicle(formData, token);
        setFormSuccess('New vehicle added to live showroom!');
      }

      await loadVehicles();
      if (onVehicleDataChange) onVehicleDataChange();
      loadLogs();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm delete vehicle
  const handleConfirmDelete = async () => {
    if (!token || !deletingVehicle) return;
    if (!hasPermission('inventory:delete')) {
      alert('Access denied: You do not possess the "inventory:delete" permission.');
      return;
    }
    setIsDeleting(true);
    try {
      await api.deleteVehicle(deletingVehicle.id, token);
      await loadVehicles();
      if (onVehicleDataChange) onVehicleDataChange();
      loadLogs();
      setDeletingVehicle(null);
    } catch (err: any) {
      alert('Failed to delete vehicle: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered vehicles list
  const displayVehicles = vehicles.filter(v => {
    const matchesSearch = 
      v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.badge.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (categoryFilter === 'all') return matchesSearch;
    return matchesSearch && v.category === categoryFilter;
  });

  const premiumCount = vehicles.filter(v => v.category === 'premium').length;
  const nonPremiumCount = vehicles.filter(v => v.category === 'non-premium').length;

  // Filtered admin list
  const displayAdmins = adminsList.filter(a => {
    const q = adminSearchQuery.toLowerCase();
    return a.username.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
  });

  // Filtered logs
  const displayLogs = activityLogs.filter(l => {
    const matchesAction = logFilterAction === 'all' || l.action.toLowerCase() === logFilterAction.toLowerCase();
    const matchesSearch = !logSearchQuery || 
      l.actorUsername.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.target?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.details.toLowerCase().includes(logSearchQuery.toLowerCase());
    return matchesAction && matchesSearch;
  });

  // ==========================================
  // Render: Login View (if unauthenticated)
  // ==========================================
  if (!token || !user) {
    return (
      <div className="relative min-h-[calc(100vh-140px)] flex flex-col justify-center items-center px-4 py-12 sm:py-16 bg-gradient-to-b from-[#FBFBFA] via-[#F4F3EE] to-[#EBE9E2] overflow-hidden font-sans">
        {/* Soft Ambient Radial Background Glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />

        <div className="relative max-w-md w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08),0_0_1px_1px_rgba(0,0,0,0.06)] border border-stone-200/90 p-8 sm:p-10 space-y-7">
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-amber-400 mb-1 shadow-lg shadow-stone-950/20 border border-stone-700/80">
              <Lock className="w-6 h-6 text-amber-400 stroke-[2.2]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-950 uppercase tracking-tight">Dealer Portal</h2>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 tracking-wider font-mono uppercase bg-amber-500/10 border border-amber-600/30 rounded-full px-3 py-1 inline-block">
                (A UNIT OF SAI BABA CAR SALES PVT LTD)
              </span>
            </div>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-medium">{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4.5">
            {/* Decoy fields to prevent Chrome/Edge aggressive credential autofill */}
            <input type="text" name="fake_username_decoy" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
            <input type="password" name="fake_password_decoy" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

            <div>
              <label htmlFor="dealer_portal_login_identifier" className="block text-[10px] font-extrabold uppercase tracking-widest text-stone-500 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  id="dealer_portal_login_identifier"
                  name="dealer_portal_login_identifier"
                  autoComplete="off"
                  spellCheck={false}
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-stone-50/80 hover:bg-stone-50 focus:bg-white border border-stone-200/90 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-stone-900 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 focus:outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="dealer_portal_login_credential" className="block text-[10px] font-extrabold uppercase tracking-widest text-stone-500">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="dealer_portal_login_credential"
                  name="dealer_portal_login_credential"
                  autoComplete="new-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-stone-50/80 hover:bg-stone-50 focus:bg-white border border-stone-200/90 rounded-xl pl-10 pr-10 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-stone-400 hover:text-stone-700 absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-stone-950 hover:bg-stone-900 text-amber-400 hover:text-amber-300 font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-stone-950/20 active:scale-[0.98] flex items-center justify-center space-x-2 border border-stone-850 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
              <span>{isLoggingIn ? 'Verifying Credentials...' : 'Sign In to Portal'}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
            <button
              onClick={() => setActivePage('home')}
              className="hover:text-stone-900 flex items-center space-x-1.5 transition-colors cursor-pointer text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Showroom</span>
            </button>
            <div className="flex items-center space-x-1.5 text-[10px] text-stone-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>256-Bit Encrypted Session</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render: Forced Password Change Screen (if mustChangePassword is true)
  // ==========================================
  if (user.mustChangePassword) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex flex-col justify-center items-center px-4 py-12 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 border-amber-500/40 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/20 text-amber-900 mb-2">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight">Security Setup Required</h2>
            <p className="text-xs text-amber-800 font-semibold uppercase tracking-wider font-mono">
              Temporary Password Detected
            </p>
            <p className="text-xs text-stone-500 pt-1 leading-relaxed">
              Hello <strong className="text-stone-800">{user.name}</strong> ({user.username}). Your account was provisioned with a temporary password. You must establish a private permanent password before accessing the admin dashboard.
            </p>
          </div>

          {forcedPasswordError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{forcedPasswordError}</span>
            </div>
          )}

          <form onSubmit={handleForcedPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">New Permanent Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={forcedNewPassword}
                onChange={(e) => setForcedNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={forcedConfirmPassword}
                onChange={(e) => setForcedConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingForcedPassword}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingForcedPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              <span>{isSavingForcedPassword ? 'Saving Password...' : 'Save Password & Enter Dashboard'}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-stone-100 text-center">
            <button
              onClick={handleLogout}
              className="text-xs text-stone-400 hover:text-stone-700 underline cursor-pointer"
            >
              Log out and return later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render: Authenticated Admin Dashboard
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F7F7F6] text-stone-900 py-8 px-4 sm:px-6 lg:px-8 font-sans" id="admin-portal-view">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Bar */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1 ${
                user.role === 'superadmin' 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                  : 'bg-stone-100 text-stone-700 border border-stone-300'
              }`}>
                {user.role === 'superadmin' ? <ShieldAlert className="w-3 h-3 text-amber-700" /> : <ShieldCheck className="w-3 h-3 text-stone-600" />}
                <span>{user.role === 'superadmin' ? 'Super Admin' : 'Staff Admin'}</span>
              </span>
              <span className="text-stone-400">•</span>
              <span className="text-stone-500">Logged in as <strong className="text-stone-900">{user.name}</strong> ({user.username})</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 uppercase tracking-tight">Showroom Administration Suite</h1>
            <p className="text-xs text-amber-800 font-semibold uppercase tracking-wider font-mono">(A UNIT OF SAI BABA CAR SALES PVT LTD)</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {hasPermission('inventory:create') && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                id="btn-add-vehicle"
              >
                <Plus className="w-4 h-4" />
                <span>Add Vehicle</span>
              </button>
            )}

            <button
              onClick={() => setActivePage('inventory')}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-stone-500" />
              <span>Public Showroom</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2.5 bg-stone-50 hover:bg-red-50 text-stone-500 hover:text-red-600 border border-stone-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-stone-900 text-amber-400 shadow-sm' 
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'vehicles' 
                ? 'bg-stone-900 text-amber-400 shadow-sm' 
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Vehicles Inventory ({vehicles.length})</span>
          </button>

          {user.role === 'superadmin' && (
            <button
              onClick={() => { setActiveTab('admins'); loadAdmins(); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'admins' 
                  ? 'bg-stone-900 text-amber-400 shadow-sm' 
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Admin Management</span>
            </button>
          )}

          {user.role === 'superadmin' && (
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'roles' 
                  ? 'bg-stone-900 text-amber-400 shadow-sm' 
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Roles & Permissions</span>
            </button>
          )}

          {(user.role === 'superadmin' || hasPermission('logs:view')) && (
            <button
              onClick={() => { setActiveTab('logs'); loadLogs(); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'logs' 
                  ? 'bg-stone-900 text-amber-400 shadow-sm' 
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Activity Logs</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'account' 
                ? 'bg-stone-900 text-amber-400 shadow-sm' 
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Account Settings</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Total Fleet Stock</span>
                <p className="text-3xl font-black text-stone-900">{vehicles.length}</p>
                <span className="text-[11px] text-stone-400">Cars in public showroom</span>
              </div>

              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-5 shadow-sm space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Premium Segment</span>
                <p className="text-3xl font-black text-amber-900">{premiumCount}</p>
                <span className="text-[11px] text-amber-800 font-mono">₹5 Lakh – ₹2.5 Crore</span>
              </div>

              <div className="bg-stone-100/70 border border-stone-200 rounded-xl p-5 shadow-sm space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">Non-Premium Segment</span>
                <p className="text-3xl font-black text-stone-900">{nonPremiumCount}</p>
                <span className="text-[11px] text-stone-500 font-mono">₹1 Lakh – ₹25 Lakh</span>
              </div>

              <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Security & RBAC</span>
                <div className="flex items-center space-x-1.5 pt-1 text-emerald-600 font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Backend Enforced</span>
                </div>
                <span className="text-[11px] text-stone-400 font-mono">Port 5000 / Session Live</span>
              </div>
            </div>

            {/* Quick Actions & Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Quick Management Shortcuts */}
              <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
                  <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider">Administrative Quick Actions</h3>
                  <span className="text-xs text-stone-400 font-mono">Role: {user.role.toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveTab('vehicles')}
                    className="p-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-left transition-all space-y-2 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Car className="w-4 h-4" />
                    </div>
                    <p className="font-bold text-xs uppercase tracking-wider text-stone-900">Manage Showroom Stock</p>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Update specifications, pricing, badges, and high-definition photographs.
                    </p>
                  </button>

                  {user.role === 'superadmin' ? (
                    <button
                      onClick={() => { setActiveTab('admins'); setIsCreateAdminModalOpen(true); }}
                      className="p-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-left transition-all space-y-2 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-xs uppercase tracking-wider text-stone-900">Create Staff Admin</p>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        Provision unique login credentials with granular operational permissions.
                      </p>
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('account')}
                      className="p-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-left transition-all space-y-2 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Key className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-xs uppercase tracking-wider text-stone-900">Change My Password</p>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        Securely change your staff password and view active permissions.
                      </p>
                    </button>
                  )}
                </div>

                {/* Permissions Summary for current user */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Your Active Permissions</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {user.role === 'superadmin' ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-900 border border-amber-400">
                        * All System Permissions (Super Admin Full Authority)
                      </span>
                    ) : (
                      user.permissions?.map(p => (
                        <span key={p} className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-white text-stone-800 border border-stone-200 shadow-xs">
                          {p}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Col: Recent Activity Snippet */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
                  <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center space-x-1.5">
                    <History className="w-4 h-4 text-amber-600" />
                    <span>Recent Audit Events</span>
                  </h3>
                  <button 
                    onClick={loadLogs} 
                    className="text-stone-400 hover:text-stone-700 cursor-pointer"
                    title="Refresh logs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {activityLogs.slice(0, 6).map((log) => (
                    <div key={log.id} className="p-3 bg-stone-50 border border-stone-100 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-200 text-stone-800">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-700 font-medium line-clamp-1">{log.details}</p>
                      <p className="text-[10px] text-stone-400 font-mono">Actor: {log.actorUsername} ({log.actorRole})</p>
                    </div>
                  ))}
                  {activityLogs.length === 0 && (
                    <p className="text-xs text-stone-400 text-center py-4">No audit logs recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: FLEET INVENTORY MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            {/* Filters & Search Control Bar */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by brand, model, badge..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-9 pr-4 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-900 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                <span className="text-xs text-stone-400 font-semibold uppercase">Category:</span>
                <div className="inline-flex bg-stone-100 p-1 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      categoryFilter === 'all' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    All ({vehicles.length})
                  </button>
                  <button
                    onClick={() => setCategoryFilter('premium')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      categoryFilter === 'premium' ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Premium ({premiumCount})
                  </button>
                  <button
                    onClick={() => setCategoryFilter('non-premium')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      categoryFilter === 'non-premium' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Non-Prem ({nonPremiumCount})
                  </button>
                </div>

                <button
                  onClick={loadVehicles}
                  className="p-2 border border-stone-200 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors cursor-pointer"
                  title="Refresh inventory"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingVehicles ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Vehicle Fleet Table */}
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Vehicle / Edition</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Powertrain</th>
                      <th className="py-3 px-4">Showroom Price</th>
                      <th className="py-3 px-4">Est. EMI</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {displayVehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-4 flex items-center space-x-3">
                          <img
                            src={v.images[0] || 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=200'}
                            alt={v.model}
                            className="w-12 h-9 object-cover rounded-md border border-stone-200 shrink-0 bg-stone-100"
                          />
                          <div>
                            <div className="font-bold text-stone-900 text-sm">{v.brand} {v.model}</div>
                            <div className="text-[11px] text-stone-400 font-mono">{v.badge}</div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            v.category === 'premium'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-stone-100 text-stone-700 border border-stone-200'
                          }`}>
                            {v.category === 'premium' ? 'Premium (₹5L–2.5Cr)' : 'Non-Prem (₹1L–25L)'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-stone-600 font-medium">
                          <div>{v.fuel} • {v.transmission}</div>
                          <div className="text-[10px] text-stone-400">{v.type}</div>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-stone-900 text-sm">
                          ₹{v.price} Lakh
                        </td>

                        <td className="py-3 px-4 font-mono text-stone-600">
                          ₹{v.emi?.toLocaleString('en-IN')}/mo
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5">
                          {hasPermission('inventory:edit') ? (
                            <button
                              onClick={() => handleOpenEdit(v)}
                              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                              title="Edit Vehicle"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="p-1.5 text-stone-300 inline-block cursor-not-allowed" title="Requires inventory:edit permission">
                              <Edit3 className="w-4 h-4" />
                            </span>
                          )}

                          {hasPermission('inventory:delete') ? (
                            <button
                              onClick={() => setDeletingVehicle(v)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Delete Vehicle"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="p-1.5 text-stone-300 inline-block cursor-not-allowed" title="Requires inventory:delete permission">
                              <Trash2 className="w-4 h-4" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {displayVehicles.length === 0 && (
                <div className="p-8 text-center text-stone-400 text-xs">
                  No vehicles found matching current criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ADMIN MANAGEMENT (SUPER ADMIN ONLY) */}
        {/* ======================================================== */}
        {activeTab === 'admins' && user.role === 'superadmin' && (
          <div className="space-y-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight">Staff & Admin Accounts</h2>
                <p className="text-xs text-stone-500">
                  Provision new Admin accounts, reset temporary passwords, manage operational roles, and activate/deactivate access.
                </p>
              </div>

              <button
                onClick={() => setIsCreateAdminModalOpen(true)}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center space-x-2 cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Create New Admin</span>
              </button>
            </div>

            {/* Admin Accounts Table */}
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">User / Username</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Assigned Permissions</th>
                      <th className="py-3 px-4">Last Login</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {adminsList.map((adm) => (
                      <tr key={adm.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                            <span>{adm.name}</span>
                            {adm.mustChangePassword && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                                Temp Password
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-400 font-mono">@{adm.username}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            adm.role === 'superadmin'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-stone-100 text-stone-700 border border-stone-200'
                          }`}>
                            {adm.role}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            adm.status === 'active' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${adm.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className="capitalize">{adm.status || 'active'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          {adm.role === 'superadmin' ? (
                            <span className="text-[11px] text-stone-400 italic">Full System Access</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {adm.permissions?.map(p => (
                                <span key={p} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-stone-100 text-stone-700 border border-stone-200">
                                  {p.replace('inventory:', 'inv:').replace(':edit', '')}
                                </span>
                              ))}
                              {(!adm.permissions || adm.permissions.length === 0) && (
                                <span className="text-stone-300 italic text-[11px]">No permissions</span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-stone-400 font-mono text-[11px]">
                          {adm.lastLogin ? new Date(adm.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1">
                          {adm.role !== 'superadmin' && (
                            <>
                              <button
                                onClick={() => handleOpenEditAdmin(adm)}
                                className="px-2 py-1 text-[11px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors cursor-pointer"
                                title="Edit Name & Permissions"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => { setResetTargetAdmin(adm); setResetTempPassword(generateTempPassword()); setResetPasswordError(''); setResetPasswordSuccess(''); }}
                                className="px-2 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md transition-colors cursor-pointer"
                                title="Reset Password"
                              >
                                Reset Pass
                              </button>

                              <button
                                onClick={() => handleToggleAdminStatus(adm)}
                                className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                                  adm.status === 'active'
                                    ? 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                }`}
                                title={adm.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                              >
                                {adm.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>

                              <button
                                onClick={() => setDeletingAdmin(adm)}
                                className="px-2 py-1 text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors cursor-pointer"
                                title="Delete Admin Account"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {adm.role === 'superadmin' && (
                            <span className="text-[10px] text-stone-400 italic">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: ROLES & PERMISSIONS MATRIX (SUPER ADMIN ONLY) */}
        {/* ======================================================== */}
        {activeTab === 'roles' && user.role === 'superadmin' && (
          <div className="space-y-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-2">
              <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight">Roles & Authority Specification</h2>
              <p className="text-xs text-stone-500">
                Security architecture and permission boundaries enforced across both the Node.js backend APIs and frontend UI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Role 1: Super Admin */}
              <div className="bg-white border-2 border-amber-400/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-900">
                    <ShieldAlert className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-stone-900 uppercase">Super Admin Role</h3>
                    <p className="text-[11px] text-amber-800 font-mono font-bold">Absolute Authority</p>
                  </div>
                </div>

                <ul className="text-xs text-stone-600 space-y-2 list-disc list-inside">
                  <li>Full authority over the admin management system.</li>
                  <li>Can create, edit, deactivate, and delete staff Admin accounts.</li>
                  <li>Can provision temporary passwords and force reset on next login.</li>
                  <li>Can assign and revoke any granular operational permission.</li>
                  <li>Can view all activity audit logs and brute-force lockout states.</li>
                  <li>Full authority to add, update, and remove vehicles and modify pricing.</li>
                </ul>
              </div>

              {/* Role 2: Staff Admin */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-stone-100 text-stone-800">
                    <ShieldCheck className="w-5 h-5 text-stone-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-stone-900 uppercase">Staff Admin Role</h3>
                    <p className="text-[11px] text-stone-500 font-mono font-bold">Granular Least-Privilege</p>
                  </div>
                </div>

                <ul className="text-xs text-stone-600 space-y-2 list-disc list-inside">
                  <li>Can log in using credentials provided by the Super Admin.</li>
                  <li>Can only access sections and APIs explicitly assigned to them.</li>
                  <li>Cannot create other admins, change other users' passwords, or escalate privileges.</li>
                  <li>Can securely change their own personal password anytime.</li>
                  <li>Forced to establish a personal permanent password upon first login.</li>
                  <li>Actions are continuously recorded in the central activity audit trail.</li>
                </ul>
              </div>
            </div>

            {/* Granular Permission Reference Table */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider">Granular Permission Tokens</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ALL_AVAILABLE_PERMISSIONS.map(p => (
                  <div key={p.id} className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-amber-800">{p.id}</span>
                      <span className="text-[10px] font-bold uppercase text-stone-400">Token</span>
                    </div>
                    <p className="font-bold text-xs text-stone-900">{p.label}</p>
                    <p className="text-[11px] text-stone-500">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: ACTIVITY AUDIT LOGS */}
        {/* ======================================================== */}
        {activeTab === 'logs' && (user.role === 'superadmin' || hasPermission('logs:view')) && (
          <div className="space-y-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight">Security & Activity Audit Logs</h2>
                <p className="text-xs text-stone-500">
                  Comprehensive audit trail of logins, administrative events, vehicle updates, and security modifications.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={logFilterAction}
                  onChange={(e) => setLogFilterAction(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-800 font-bold focus:outline-none"
                >
                  <option value="all">All Action Types</option>
                  <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                  <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                  <option value="ADMIN_CREATED">ADMIN_CREATED</option>
                  <option value="ADMIN_UPDATED">ADMIN_UPDATED</option>
                  <option value="ADMIN_PASSWORD_RESET">ADMIN_PASSWORD_RESET</option>
                  <option value="VEHICLE_CREATED">VEHICLE_CREATED</option>
                  <option value="VEHICLE_UPDATED">VEHICLE_UPDATED</option>
                  <option value="VEHICLE_DELETED">VEHICLE_DELETED</option>
                </select>

                <button
                  onClick={loadLogs}
                  className="p-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                  title="Refresh Audit Logs"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {displayLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50/80 transition-colors font-mono">
                        <td className="py-3 px-4 text-stone-500 text-[11px]">
                          {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                        </td>
                        <td className="py-3 px-4 text-stone-800 font-bold">
                          {log.actorUsername} <span className="text-[10px] text-stone-400 font-normal">({log.actorRole})</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action.includes('FAILED') || log.action.includes('BLOCKED')
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : log.action.includes('ADMIN')
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-stone-100 text-stone-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-700 font-medium">
                          {log.target || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-stone-600 font-sans text-xs max-w-sm">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 text-stone-400 text-[11px]">
                          {log.ip || '127.0.0.1'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {displayLogs.length === 0 && (
                <div className="p-8 text-center text-stone-400 text-xs">
                  No activity logs recorded matching criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: ACCOUNT SETTINGS / MY PROFILE */}
        {/* ======================================================== */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-2">
              <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight">Account & Personal Security</h2>
              <p className="text-xs text-stone-500">
                Manage your credentials and verify the operational permissions granted to your session.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile & Change Username Card */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                  <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center space-x-1.5">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span>My Profile & Username</span>
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    user.role === 'superadmin' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-stone-700'
                  }`}>
                    {user.role}
                  </span>
                </div>

                {profileError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateProfileSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs font-bold">@</span>
                      <input
                        type="text"
                        required
                        minLength={3}
                        value={profileUsername}
                        onChange={(e) => setProfileUsername(e.target.value)}
                        placeholder="Enter new username"
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-7 pr-3 py-2 text-xs text-stone-900 font-mono focus:border-stone-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Minimum 3 characters. This username is used to log in to the Dealer Portal.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">
                      Current Password (To Confirm Identity)
                    </label>
                    <input
                      type="password"
                      required
                      value={profilePasswordConfirm}
                      onChange={(e) => setProfilePasswordConfirm(e.target.value)}
                      placeholder="Enter current password to save changes"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{isSavingProfile ? 'Saving Profile...' : 'Save Profile & Username'}</span>
                  </button>
                </form>

                <div className="pt-3 border-t border-stone-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-400 font-medium">Account Status</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                      {user.status || 'Active'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-400 font-medium">Last Login</span>
                    <span className="text-stone-700 font-mono text-[11px]">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Current Session'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Effective Permissions</span>
                    <div className="flex flex-wrap gap-1">
                      {user.role === 'superadmin' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Full Super Admin Privileges
                        </span>
                      ) : (
                        user.permissions?.map(p => (
                          <span key={p} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-stone-100 text-stone-700 border border-stone-200">
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Change Password Card */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center space-x-1.5">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>Change Password</span>
                </h3>

                {ownPasswordError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{ownPasswordError}</span>
                  </div>
                )}

                {ownPasswordSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{ownPasswordSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleOwnPasswordSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={ownCurrentPassword}
                      onChange={(e) => setOwnCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={ownNewPassword}
                      onChange={(e) => setOwnNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={ownConfirmPassword}
                      onChange={(e) => setOwnConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingOwnPassword}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingOwnPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    <span>{isSavingOwnPassword ? 'Updating Password...' : 'Save New Password'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: CREATE ADMIN ACCOUNT (SUPER ADMIN ONLY) */}
        {/* ======================================================== */}
        {isCreateAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-stone-900 uppercase tracking-tight">Create Staff Admin</h3>
                  <p className="text-xs text-stone-500">Assign credentials and custom operational authority</p>
                </div>
                <button
                  onClick={() => setIsCreateAdminModalOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {createAdminError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createAdminError}</span>
                </div>
              )}

              {createAdminSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{createAdminSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateAdminSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={newAdminUsername}
                      onChange={(e) => setNewAdminUsername(e.target.value)}
                      placeholder="e.g. rahul_admin"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold text-stone-500 uppercase">Temporary Password</label>
                    <button
                      type="button"
                      onClick={() => setNewAdminTempPassword(generateTempPassword())}
                      className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                    >
                      Generate Secure Password
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    minLength={8}
                    value={newAdminTempPassword}
                    onChange={(e) => setNewAdminTempPassword(e.target.value)}
                    placeholder="Enter or generate temporary password"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 font-mono focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    The admin will be required to change this temporary password upon first login.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase mb-2">Granular Permissions</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-stone-200 rounded-xl p-3 bg-stone-50">
                    {ALL_AVAILABLE_PERMISSIONS.map(p => {
                      const isChecked = newAdminPermissions.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-start space-x-2 cursor-pointer hover:bg-stone-100/70 p-1 rounded-md transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewAdminPermissions(prev => [...prev, p.id]);
                              } else {
                                setNewAdminPermissions(prev => prev.filter(x => x !== p.id));
                              }
                            }}
                            className="mt-0.5 rounded text-stone-900 focus:ring-0"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-stone-900">{p.label}</span>
                            <span className="text-[10px] text-stone-400 block font-mono">{p.id}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateAdminModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdmin}
                    className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold uppercase rounded-lg transition-all shadow-md active:scale-95 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAdmin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>{isSubmittingAdmin ? 'Provisioning...' : 'Provision Admin'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: EDIT ADMIN ACCOUNT */}
        {/* ======================================================== */}
        {editingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-stone-900 uppercase tracking-tight">Edit Staff Admin</h3>
                  <p className="text-xs text-stone-500">Update account details and assigned permissions</p>
                </div>
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editAdminError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editAdminError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateAdminSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editAdminName}
                      onChange={(e) => setEditAdminName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={editAdminUsername}
                      onChange={(e) => setEditAdminUsername(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase mb-2">Granular Permissions</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-stone-200 rounded-xl p-3 bg-stone-50">
                    {ALL_AVAILABLE_PERMISSIONS.map(p => {
                      const isChecked = editAdminPermissions.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-start space-x-2 cursor-pointer hover:bg-stone-100/70 p-1 rounded-md transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditAdminPermissions(prev => [...prev, p.id]);
                              } else {
                                setEditAdminPermissions(prev => prev.filter(x => x !== p.id));
                              }
                            }}
                            className="mt-0.5 rounded text-stone-900 focus:ring-0"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-stone-900">{p.label}</span>
                            <span className="text-[10px] text-stone-400 block font-mono">{p.id}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingAdmin(null)}
                    className="px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingAdmin}
                    className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold uppercase rounded-lg transition-all shadow-md active:scale-95 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingAdmin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{isUpdatingAdmin ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: RESET ADMIN PASSWORD */}
        {/* ======================================================== */}
        {resetTargetAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-stone-900 uppercase tracking-tight">Reset Password</h3>
                  <p className="text-xs text-stone-500">Target: @{resetTargetAdmin.username} ({resetTargetAdmin.name})</p>
                </div>
                <button
                  onClick={() => setResetTargetAdmin(null)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {resetPasswordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetPasswordError}</span>
                </div>
              )}

              {resetPasswordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetPasswordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold text-stone-500 uppercase">New Temporary Password</label>
                    <button
                      type="button"
                      onClick={() => setResetTempPassword(generateTempPassword())}
                      className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                    >
                      Generate New
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    minLength={8}
                    value={resetTempPassword}
                    onChange={(e) => setResetTempPassword(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 font-mono focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    The user will be prompted to replace this temporary password immediately upon their next login.
                  </p>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setResetTargetAdmin(null)}
                    className="px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase rounded-lg transition-all shadow-md active:scale-95 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isResettingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                    <span>{isResettingPassword ? 'Updating...' : 'Set Temporary Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: DELETE ADMIN CONFIRMATION */}
        {/* ======================================================== */}
        {deletingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="font-black text-stone-900 text-base uppercase">Revoke & Delete Admin</h4>
                <p className="text-xs text-stone-500">
                  Are you sure you want to permanently delete the admin account for <strong className="text-stone-800">@{deletingAdmin.username}</strong> ({deletingAdmin.name})?
                </p>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDeletingAdmin(null)}
                  className="flex-1 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingAdmin}
                  onClick={handleConfirmDeleteAdmin}
                  className="flex-1 py-2 text-xs font-bold uppercase bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingAdmin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isDeletingAdmin ? 'Deleting...' : 'Delete Account'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: ADD / EDIT VEHICLE */}
        {/* ======================================================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-stone-900 uppercase tracking-tight">
                    {editingVehicleId ? 'Edit Vehicle Specifications' : 'Add New Showroom Vehicle'}
                  </h3>
                  <p className="text-xs text-stone-500">Enter specs, pricing, features & high-resolution photos</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Brand</label>
                    <select
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    >
                      <optgroup label="Premium Brands">
                        {PREMIUM_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                      </optgroup>
                      <optgroup label="Popular Brands">
                        {NON_PREMIUM_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                      </optgroup>
                      <option value="Other">Other (Custom)</option>
                    </select>
                  </div>

                  {brand === 'Other' && (
                    <div>
                      <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Custom Brand Name</label>
                      <input
                        type="text"
                        required
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        placeholder="e.g. Aston Martin"
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Model Name</label>
                    <input
                      type="text"
                      required
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. X5 xDrive40i"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Badge / Variant</label>
                    <input
                      type="text"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      placeholder="e.g. M Sport Edition (2024)"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    >
                      <option value="premium">Premium (₹5L–2.5Cr)</option>
                      <option value="non-premium">Non-Premium (₹1L–25L)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Fuel</label>
                    <select
                      value={fuel}
                      onChange={(e) => setFuel(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Electric">Electric</option>
                      <option value="CNG">CNG</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Transmission</label>
                    <select
                      value={transmission}
                      onChange={(e) => setTransmission(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    >
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Price (₹ Lakhs)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 48.50"
                      disabled={editingVehicleId ? !hasPermission('pricing:edit') : false}
                      className={`w-full border rounded-lg px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none ${
                        editingVehicleId && !hasPermission('pricing:edit') 
                          ? 'bg-stone-100 border-stone-200 cursor-not-allowed text-stone-400' 
                          : 'bg-stone-50 border-stone-200 focus:border-stone-900 focus:bg-white'
                      }`}
                      title={editingVehicleId && !hasPermission('pricing:edit') ? 'Requires pricing:edit permission' : ''}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Est. EMI (₹/mo)</label>
                    <input
                      type="number"
                      value={emi}
                      onChange={(e) => setEmi(e.target.value)}
                      placeholder="Optional"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 font-mono focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Engine</label>
                    <input
                      type="text"
                      value={engine}
                      onChange={(e) => setEngine(e.target.value)}
                      placeholder="e.g. 2.0L TwinPower"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Power Output</label>
                    <input
                      type="text"
                      value={power}
                      onChange={(e) => setPower(e.target.value)}
                      placeholder="e.g. 252 BHP"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Seats</label>
                    <select
                      value={seats}
                      onChange={(e) => setSeats(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    >
                      <option value="2">2 Seater</option>
                      <option value="4">4 Seater</option>
                      <option value="5">5 Seater</option>
                      <option value="7">7 Seater</option>
                      <option value="8">8 Seater</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">Certified Features (1 per line)</label>
                  <textarea
                    rows={3}
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder="120-Point Certified Inspection&#10;Single 1st Owner History&#10;OEM Spares Only"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Photo Uploads */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1">High-Resolution Photos</label>
                  <div className="border-2 border-dashed border-stone-200 rounded-xl p-4 text-center hover:border-stone-400 transition-colors">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Upload className="w-6 h-6 text-stone-400" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                      >
                        Click to select images from device
                      </button>
                      <span className="text-[10px] text-stone-400">JPG, PNG, WEBP (up to 15MB each)</span>
                    </div>
                  </div>

                  {/* Image Previews */}
                  {(existingImages.length > 0 || filePreviews.length > 0) && (
                    <div className="flex flex-wrap gap-2 pt-3">
                      {existingImages.map((src, i) => (
                        <div key={`exist-${i}`} className="relative group w-16 h-12 rounded-md overflow-hidden border border-stone-200">
                          <img src={src} alt="preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(i)}
                            className="absolute inset-0 bg-stone-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {filePreviews.map((src, i) => (
                        <div key={`new-${i}`} className="relative group w-16 h-12 rounded-md overflow-hidden border border-amber-300">
                          <img src={src} alt="new-preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(i)}
                            className="absolute inset-0 bg-stone-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end space-x-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase rounded-lg transition-all shadow-md active:scale-95 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{isSubmitting ? 'Saving Vehicle...' : (editingVehicleId ? 'Update Vehicle' : 'Add Vehicle')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: DELETE VEHICLE CONFIRMATION */}
        {/* ======================================================== */}
        {deletingVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="font-black text-stone-900 text-base uppercase">Confirm Deletion</h4>
                <p className="text-xs text-stone-500">
                  Permanently remove <strong className="text-stone-800">{deletingVehicle.brand} {deletingVehicle.model}</strong> from the showroom catalog?
                </p>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDeletingVehicle(null)}
                  className="flex-1 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2 text-xs font-bold uppercase bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isDeleting ? 'Deleting...' : 'Delete Vehicle'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
