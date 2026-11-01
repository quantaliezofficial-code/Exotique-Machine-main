import express from 'express';
import cors from 'cors';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'exotique_machines_jwt_secret_token_key_2026';

process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Paths
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
const vehiclesFile = path.join(dataDir, 'vehicles.json');
const usersFile = path.join(dataDir, 'users.json');
const activityLogsFile = path.join(dataDir, 'activity_logs.json');
const distDir = path.join(__dirname, '../dist');

// Ensure directories exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploaded media
app.use('/uploads', express.static(uploadsDir));

// Multer storage setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanBaseName}-${uniqueSuffix}${ext || '.jpg'}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif|svg/;
  const mimeCheck = allowed.test(file.mimetype);
  const extCheck = allowed.test(path.extname(file.originalname).toLowerCase());
  if (mimeCheck || extCheck) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP, GIF, SVG) are permitted'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max per image
});

// Atomic File Helpers
function readJson(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJson(filePath, data) {
  const tempPath = `${filePath}.tmp_${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

// ==========================================
// Brute Force & Rate Limiting Protection
// ==========================================
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes lockout

function checkBruteForce(identifier) {
  const record = loginAttempts.get(identifier);
  if (!record) return { isLocked: false };

  if (record.lockUntil && Date.now() < record.lockUntil) {
    const minutesLeft = Math.ceil((record.lockUntil - Date.now()) / 60000);
    return {
      isLocked: true,
      message: `Account temporarily locked due to consecutive failed attempts. Try again in ${minutesLeft} minute(s).`
    };
  }

  // If lockout expired, reset
  if (record.lockUntil && Date.now() >= record.lockUntil) {
    loginAttempts.delete(identifier);
    return { isLocked: false };
  }

  return { isLocked: false };
}

function recordFailedAttempt(identifier) {
  const now = Date.now();
  const record = loginAttempts.get(identifier) || { count: 0, firstAttempt: now };
  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockUntil = now + LOCK_TIME_MS;
  }
  loginAttempts.set(identifier, record);
}

function clearFailedAttempts(identifier) {
  loginAttempts.delete(identifier);
}

// ==========================================
// Activity Logging System
// ==========================================
function logActivity({ actorId, actorUsername, actorRole, action, target, details, ip }) {
  try {
    const logs = readJson(activityLogsFile, []);
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorId: actorId || 'system',
      actorUsername: actorUsername || 'system',
      actorRole: actorRole || 'system',
      action,
      target: target || 'N/A',
      details: details || '',
      ip: ip || '127.0.0.1'
    };
    // Keep last 1,000 logs
    logs.unshift(newLog);
    if (logs.length > 1000) {
      logs.splice(1000);
    }
    writeJson(activityLogsFile, logs);
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}

// ==========================================
// Authentication & RBAC Middleware
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }

    // Always fetch latest live user status from database to enforce immediate deactivation/revocation
    const users = readJson(usersFile, []);
    const liveUser = users.find(u => u.id === decoded.id);

    if (!liveUser) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    if (liveUser.status === 'deactivated') {
      return res.status(403).json({ error: 'Your account has been deactivated by Super Admin.' });
    }

    req.user = {
      id: liveUser.id,
      username: liveUser.username,
      name: liveUser.name,
      role: liveUser.role,
      permissions: liveUser.permissions || [],
      mustChangePassword: liveUser.mustChangePassword || false,
      status: liveUser.status || 'active'
    };
    next();
  });
}

// SuperAdmin Only Middleware
function requireSuperAdmin(req, res, next) {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    return res.status(403).json({ error: 'Access denied: Super Admin authority required.' });
  }
}

// Granular Permission Middleware
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Super Admin has all permissions
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Check if user has specific permission
    const permissions = req.user.permissions || [];
    if (permissions.includes(permission) || permissions.includes('*')) {
      return next();
    }

    return res.status(403).json({
      error: `Access denied: Missing required permission [${permission}]. Contact Super Admin for access.`
    });
  };
}

// ==========================================
// Authentication Routes
// ==========================================

// Login endpoint with rate limiting, password check, and audit logging
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = username.trim().toLowerCase();

  // Check Brute Force
  const bruteCheck = checkBruteForce(cleanUsername);
  if (bruteCheck.isLocked) {
    logActivity({
      actorUsername: cleanUsername,
      action: 'LOGIN_BLOCKED_BRUTE_FORCE',
      target: cleanUsername,
      details: bruteCheck.message,
      ip: clientIp
    });
    return res.status(429).json({ error: bruteCheck.message });
  }

  const users = readJson(usersFile, []);
  const userIndex = users.findIndex(u => u.username.toLowerCase() === cleanUsername);

  if (userIndex === -1) {
    recordFailedAttempt(cleanUsername);
    logActivity({
      actorUsername: cleanUsername,
      action: 'LOGIN_FAILED',
      target: cleanUsername,
      details: 'Invalid username attempt',
      ip: clientIp
    });
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const user = users[userIndex];

  // Check account status
  if (user.status === 'deactivated') {
    logActivity({
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'LOGIN_REJECTED_DEACTIVATED',
      target: user.username,
      details: 'Deactivated account attempted login',
      ip: clientIp
    });
    return res.status(403).json({ error: 'Account is deactivated. Please contact Super Admin.' });
  }

  // Verify bcrypt password
  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    recordFailedAttempt(cleanUsername);
    logActivity({
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'LOGIN_FAILED',
      target: user.username,
      details: 'Incorrect password provided',
      ip: clientIp
    });
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Clear failed attempts on success
  clearFailedAttempts(cleanUsername);

  // Update lastLogin
  user.lastLogin = new Date().toISOString();
  users[userIndex] = user;
  writeJson(usersFile, users);

  const tokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    permissions: user.permissions || [],
    mustChangePassword: !!user.mustChangePassword
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  logActivity({
    actorId: user.id,
    actorUsername: user.username,
    actorRole: user.role,
    action: 'LOGIN_SUCCESS',
    target: user.username,
    details: `Successful login as ${user.role}. MustChangePassword: ${!!user.mustChangePassword}`,
    ip: clientIp
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: user.permissions || [],
      mustChangePassword: !!user.mustChangePassword,
      status: user.status || 'active',
      lastLogin: user.lastLogin
    }
  });
});

// Verify active session & retrieve fresh profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  return res.json({ user: req.user });
});

// Change own password (available to both Super Admin and Admin)
app.post('/api/auth/change-own-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const users = readJson(usersFile, []);
  const idx = users.findIndex(u => u.id === req.user.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'User account not found' });
  }

  // If user does not have mustChangePassword active, require current password
  if (!users[idx].mustChangePassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to verify identity.' });
    }
    const isCurrentValid = bcrypt.compareSync(currentPassword, users[idx].passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
  }

  const salt = bcrypt.genSaltSync(12);
  users[idx].passwordHash = bcrypt.hashSync(newPassword, salt);
  users[idx].mustChangePassword = false;
  users[idx].updatedAt = new Date().toISOString();
  writeJson(usersFile, users);

  logActivity({
    actorId: req.user.id,
    actorUsername: req.user.username,
    actorRole: req.user.role,
    action: 'PASSWORD_CHANGED_OWN',
    target: req.user.username,
    details: 'User updated their personal password successfully.',
    ip: clientIp
  });

  return res.json({
    success: true,
    message: 'Your password has been changed securely.'
  });
});

// Update own profile & username (available to both Super Admin and Admin)
app.post('/api/auth/update-own-profile', authenticateToken, (req, res) => {
  const { name, username, currentPassword } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
  }

  const cleanUsername = username.trim().toLowerCase();

  const users = readJson(usersFile, []);
  const idx = users.findIndex(u => u.id === req.user.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'User account not found' });
  }

  // Require current password for security verification
  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required to verify identity before changing username.' });
  }

  const isCurrentValid = bcrypt.compareSync(currentPassword, users[idx].passwordHash);
  if (!isCurrentValid) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  // Check username uniqueness if changed
  if (cleanUsername !== users[idx].username.toLowerCase()) {
    if (users.some(u => u.id !== req.user.id && u.username.toLowerCase() === cleanUsername)) {
      return res.status(400).json({ error: `Username "${username}" is already in use by another account.` });
    }
  }

  const oldUsername = users[idx].username;
  users[idx].username = cleanUsername;
  if (name && name.trim()) {
    users[idx].name = name.trim();
  }
  users[idx].updatedAt = new Date().toISOString();
  writeJson(usersFile, users);

  // Issue new refreshed token with updated username and name
  const tokenPayload = {
    id: users[idx].id,
    username: users[idx].username,
    role: users[idx].role,
    name: users[idx].name,
    permissions: users[idx].permissions || [],
    mustChangePassword: !!users[idx].mustChangePassword
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  logActivity({
    actorId: req.user.id,
    actorUsername: req.user.username,
    actorRole: req.user.role,
    action: 'USERNAME_CHANGED_OWN',
    target: cleanUsername,
    details: `User updated identity: username changed from "${oldUsername}" to "${cleanUsername}", name: "${users[idx].name}".`,
    ip: clientIp
  });

  return res.json({
    success: true,
    message: `Username updated to "@${cleanUsername}" successfully!`,
    token,
    user: {
      id: users[idx].id,
      username: users[idx].username,
      name: users[idx].name,
      role: users[idx].role,
      permissions: users[idx].permissions || [],
      mustChangePassword: !!users[idx].mustChangePassword,
      status: users[idx].status || 'active',
      lastLogin: users[idx].lastLogin
    }
  });
});

// ==========================================
// Super Admin - Admin Management Routes
// ==========================================

// Get all admin accounts
app.get('/api/auth/admins', authenticateToken, requireSuperAdmin, (req, res) => {
  const users = readJson(usersFile, []);
  const safeAdmins = users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    permissions: u.permissions || [],
    status: u.status || 'active',
    mustChangePassword: !!u.mustChangePassword,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin
  }));
  return res.json({ success: true, admins: safeAdmins });
});

// Create new Admin account (Super Admin only)
app.post('/api/auth/admins', authenticateToken, requireSuperAdmin, (req, res) => {
  const { username, name, temporaryPassword, permissions } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (!username || !temporaryPassword) {
    return res.status(400).json({ error: 'Username and temporary password are required' });
  }

  if (temporaryPassword.length < 8) {
    return res.status(400).json({ error: 'Temporary password must be at least 8 characters long' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const users = readJson(usersFile, []);

  if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return res.status(400).json({ error: `Username "${username}" is already in use.` });
  }

  const salt = bcrypt.genSaltSync(12);
  const passwordHash = bcrypt.hashSync(temporaryPassword, salt);

  const defaultPermissions = [
    'inventory:view',
    'inventory:create',
    'inventory:edit',
    'pricing:edit'
  ];

  const assignedPermissions = Array.isArray(permissions) && permissions.length > 0 
    ? permissions 
    : defaultPermissions;

  const newAdmin = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    username: cleanUsername,
    name: name ? name.trim() : 'Staff Admin',
    passwordHash,
    role: 'admin',
    permissions: assignedPermissions,
    status: 'active',
    mustChangePassword: true,
    createdAt: new Date().toISOString()
  };

  users.push(newAdmin);
  writeJson(usersFile, users);

  logActivity({
    actorId: req.user.id,
    actorUsername: req.user.username,
    actorRole: req.user.role,
    action: 'ADMIN_CREATED',
    target: cleanUsername,
    details: `Created Admin account with permissions: [${assignedPermissions.join(', ')}]. Temporary password assigned with mustChangePassword=true.`,
    ip: clientIp
  });

  return res.status(201).json({
    success: true,
    message: `Admin account "${cleanUsername}" created successfully.`,
    admin: {
      id: newAdmin.id,
      username: newAdmin.username,
      name: newAdmin.name,
      role: newAdmin.role,
      permissions: newAdmin.permissions,
      status: newAdmin.status,
      mustChangePassword: newAdmin.mustChangePassword,
      createdAt: newAdmin.createdAt
    }
  });
});

// Update Admin account (Super Admin only: edit name, username, permissions)
app.put('/api/auth/admins/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const { username, name, permissions } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  const users = readJson(usersFile, []);
  const idx = users.findIndex(u => u.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Admin account not found' });
  }

  const target = users[idx];

  // Prevent changing Super Admin role or stripping Super Admin permissions
  if (target.role === 'superadmin' && target.id !== req.user.id) {
    return res.status(403).json({ error: 'Cannot modify another Super Admin account.' });
  }

  if (username && username.trim().toLowerCase() !== target.username.toLowerCase()) {
    const cleanUsername = username.trim().toLowerCase();
    if (users.some(u => u.id !== id && u.username.toLowerCase() === cleanUsername)) {
      return res.status(400).json({ error: `Username "${username}" is already taken.` });
    }
    target.username = cleanUsername;
  }

  if (name !== undefined) target.name = name.trim();
  if (target.role !== 'superadmin' && Array.isArray(permissions)) {
    target.permissions = permissions;
  }

  target.updatedAt = new Date().toISOString();
  users[idx] = target;
  writeJson(usersFile, users);

  logActivity({
    actorId: req.user.id,
    actorUsername: req.user.username,
    actorRole: req.user.role,
    action: 'ADMIN_UPDATED',
    target: target.username,
    details: `Updated name/username/permissions for ${target.username}.`,
    ip: clientIp
  });

  return res.json({
    success: true,
    message: `Admin account "${target.username}" updated successfully.`,
    admin: {
      id: target.id,
      username: target.username,
      name: target.name,
      role: target.role,
      permissions: target.permissions,
      status: target.status,
      mustChangePassword: target.mustChangePassword
    }
  });
});

// Reset an Admin's password (Super Admin only: sets temporary password and sets mustChangePassword=true)
app.post('/api/auth/admins/:id/reset-password', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const { temporaryPassword } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (!temporaryPassword || temporaryPassword.length < 8) {
    return res.status(400).json({ error: 'Temporary password must be at least 8 characters long.' });
  }

  const users = readJson(usersFile, []);
  const idx = users.findIndex(u => u.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Admin account not found' });
  }

  const salt = bcrypt.genSaltSync(12);
  users[idx].passwordHash = bcrypt.hashSync(temporaryPassword, salt);
  // If target is staff admin, require them to change it on next login
  if (users[idx].role === 'admin') {
    users[idx].mustChangePassword = true;
  }
  users[idx].updatedAt = new Date().toISOString();
  writeJson(usersFile, users);

  logActivity({
    actorId: req.user.id,
    actorUsername: req.user.username,
    actorRole: req.user.role,
    action: 'ADMIN_PASSWORD_RESET',
    target: users[idx].username,
    details: `Super Admin reset password for ${users[idx].username}. mustChangePassword set to ${users[idx].mustChangePassword}.`,
    ip: clientIp
  });

  return res.json({
    success: true,
    message: `Password reset successfully for ${users[idx].username}. They will be prompted to choose a new password upon login.`
  });
});

// Toggle Admin Account Status: active vs deactivated (Super Admin only)
app.patch('/api/auth/admins/:id/status', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (!['active', 'deactivated'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "active" or "deactivated".' });
  }

  const users = readJson(usersFile, []);
  const idx = users.findIndex(u => u.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Admin account not found' });
  }

  if (users[idx].role === 'superadmin') {
    return res.status(403).json({ error: 'Super Admin account cannot be deactivated.' });
  }

  users[idx].status = status;
  users[idx].updatedAt = new Date().toISOString();
  writeJson(usersFile, users);

  logActivity({
    actorId: req.user.id,
    actorUsername: req.user.username,
    actorRole: req.user.role,
    action: status === 'active' ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED',
    target: users[idx].username,
    details: `Super Admin changed status of ${users[idx].username} to ${status}.`,
    ip: clientIp
  });

  return res.json({
    success: true,
    message: `Admin account "${users[idx].username}" is now ${status}.`,
    status
  });
});

// Delete Admin account (Super Admin only)
app.delete('/api/auth/admins/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  const users = readJson(usersFile, []);
  const idx = users.findIndex(u => u.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Admin account not found' });
  }

  if (users[idx].role === 'superadmin') {
    return res.status(403).json({ error: 'Super Admin account cannot be deleted.' });
  }

  const [deletedUser] = users.splice(idx, 1);
  writeJson(usersFile, users);

  logActivity({
    actorId: req.user.id,
    actorUsername: req.user.username,
    actorRole: req.user.role,
    action: 'ADMIN_DELETED',
    target: deletedUser.username,
    details: `Super Admin deleted admin account ${deletedUser.username} (${deletedUser.name}).`,
    ip: clientIp
  });

  return res.json({
    success: true,
    message: `Admin account "${deletedUser.username}" deleted successfully.`
  });
});

// ==========================================
// Activity Audit Logs Routes
// ==========================================

// Get activity logs (Super Admin or any admin with 'logs:view')
app.get('/api/activity-logs', authenticateToken, requirePermission('logs:view'), (req, res) => {
  const logs = readJson(activityLogsFile, []);
  const { limit = 100, action, actor } = req.query;

  let filtered = logs;
  if (action && action !== 'all') {
    filtered = filtered.filter(l => l.action.toLowerCase() === action.toLowerCase());
  }
  if (actor && actor !== 'all') {
    filtered = filtered.filter(l => l.actorUsername.toLowerCase().includes(actor.toLowerCase()));
  }

  const parsedLimit = parseInt(limit, 10) || 100;
  return res.json({
    success: true,
    count: filtered.length,
    logs: filtered.slice(0, parsedLimit)
  });
});

// ==========================================
// Vehicle Management Routes (Enforcing RBAC)
// ==========================================

// Get all vehicles (Public read)
app.get('/api/vehicles', (req, res) => {
  try {
    let vehicles = readJson(vehiclesFile, []);
    const { category, brand, fuel, search, recent } = req.query;

    if (category && category !== 'all') {
      vehicles = vehicles.filter(v => v.category === category);
    }

    if (brand && brand !== 'All') {
      vehicles = vehicles.filter(v => v.brand.toLowerCase() === brand.toLowerCase());
    }

    if (fuel && fuel !== 'All') {
      vehicles = vehicles.filter(v => v.fuel.toLowerCase() === fuel.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      vehicles = vehicles.filter(v =>
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.badge.toLowerCase().includes(q)
      );
    }

    if (recent === 'true') {
      vehicles = [...vehicles].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return res.json({
      success: true,
      count: vehicles.length,
      vehicles
    });
  } catch (err) {
    console.error('Error fetching vehicles:', err);
    return res.status(500).json({ error: 'Failed to retrieve vehicles' });
  }
});

// Get single vehicle (Public read)
app.get('/api/vehicles/:id', (req, res) => {
  const vehicles = readJson(vehiclesFile, []);
  const vehicle = vehicles.find(v => v.id === req.params.id);

  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  return res.json({ success: true, vehicle });
});

// Standalone image upload route
app.post('/api/upload', authenticateToken, upload.array('photos', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No image files uploaded' });
  }

  const urls = req.files.map(f => `/uploads/${f.filename}`);
  return res.json({
    success: true,
    urls,
    count: urls.length
  });
});

// Create new vehicle (Requires 'inventory:create' permission)
app.post('/api/vehicles', authenticateToken, requirePermission('inventory:create'), upload.array('photos', 10), (req, res) => {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const vehicles = readJson(vehiclesFile, []);
    const body = req.body;

    if (!body.brand || !body.model || !body.price) {
      return res.status(400).json({ error: 'Brand, Model, and Price are required' });
    }

    const priceNum = parseFloat(body.price);
    const category = body.category || (priceNum > 25 ? 'premium' : 'non-premium');

    let features = [];
    if (body.features) {
      if (Array.isArray(body.features)) {
        features = body.features;
      } else {
        try {
          features = JSON.parse(body.features);
        } catch {
          features = body.features.split('\n').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    let colors = [];
    if (body.colors) {
      if (Array.isArray(body.colors)) {
        colors = body.colors;
      } else {
        try {
          colors = JSON.parse(body.colors);
        } catch {
          colors = [{ name: 'Standard Showroom Finish', hex: '#111111' }];
        }
      }
    }
    if (colors.length === 0) {
      colors = [{ name: 'Obsidian Black', hex: '#0B0C0E' }, { name: 'Polar White', hex: '#FDFCFA' }];
    }

    let images = [];
    if (req.files && req.files.length > 0) {
      images.push(...req.files.map(f => `/uploads/${f.filename}`));
    }
    if (body.imageUrls) {
      let extra = [];
      try {
        extra = JSON.parse(body.imageUrls);
      } catch {
        extra = body.imageUrls.split(',').map(s => s.trim()).filter(Boolean);
      }
      images.push(...extra);
    }
    if (images.length === 0) {
      images = ['https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=1200'];
    }

    const baseSlug = `${body.brand}-${body.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let id = baseSlug;
    let counter = 1;
    while (vehicles.some(v => v.id === id)) {
      id = `${baseSlug}-${counter++}`;
    }

    const emiNum = body.emi ? parseInt(body.emi, 10) : Math.round((priceNum * 100000 * 0.015) / 100) * 100;

    const newVehicle = {
      id,
      brand: body.brand.trim(),
      model: body.model.trim(),
      badge: body.badge ? body.badge.trim() : `${body.model} Edition`,
      type: body.type ? body.type.trim() : (category === 'premium' ? 'Luxury SUV' : 'Compact SUV'),
      category,
      lifestyle: body.lifestyle || 'SUV',
      fuel: body.fuel || 'Petrol',
      transmission: body.transmission || 'Automatic',
      price: priceNum,
      emi: emiNum,
      seats: body.seats ? parseInt(body.seats, 10) : 5,
      engine: body.engine ? body.engine.trim() : 'Performance Powertrain',
      power: body.power ? body.power.trim() : 'Certified Performance',
      mileage: body.mileage ? body.mileage.trim() : 'Verified Showroom Mileage',
      images,
      colors,
      description: body.description ? body.description.trim() : `Exotique Machines certified ${body.brand} ${body.model} in pristine condition.`,
      features: features.length > 0 ? features : ['120-Point Certified Inspection', 'Single Ownership History', 'Original OEM Spares Only'],
      rating: body.rating ? parseFloat(body.rating) : 5.0,
      createdAt: new Date().toISOString(),
      isRecent: true
    };

    vehicles.unshift(newVehicle);
    writeJson(vehiclesFile, vehicles);

    logActivity({
      actorId: req.user.id,
      actorUsername: req.user.username,
      actorRole: req.user.role,
      action: 'VEHICLE_CREATED',
      target: `${newVehicle.brand} ${newVehicle.model} (${newVehicle.id})`,
      details: `Added new vehicle priced at ₹${newVehicle.price} Lakhs (${newVehicle.category}).`,
      ip: clientIp
    });

    return res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      vehicle: newVehicle
    });
  } catch (err) {
    console.error('Error adding vehicle:', err);
    return res.status(500).json({ error: 'Failed to create vehicle: ' + err.message });
  }
});

// Update vehicle (Requires 'inventory:edit', and if price is altered requires 'pricing:edit')
app.put('/api/vehicles/:id', authenticateToken, requirePermission('inventory:edit'), upload.array('photos', 10), (req, res) => {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const vehicles = readJson(vehiclesFile, []);
    const idx = vehicles.findIndex(v => v.id === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const current = vehicles[idx];
    const body = req.body;

    // Check pricing permission if price is being altered
    if (body.price !== undefined && parseFloat(body.price) !== current.price) {
      const permissions = req.user.permissions || [];
      if (req.user.role !== 'superadmin' && !permissions.includes('pricing:edit') && !permissions.includes('*')) {
        return res.status(403).json({
          error: 'Access denied: You do not possess the "pricing:edit" permission to modify vehicle prices. Contact Super Admin.'
        });
      }
    }

    let images = current.images || [];
    if (body.replaceImages === 'true') {
      images = [];
    }
    if (req.files && req.files.length > 0) {
      images.push(...req.files.map(f => `/uploads/${f.filename}`));
    }
    if (body.imageUrls) {
      let extra = [];
      try {
        extra = JSON.parse(body.imageUrls);
      } catch {
        extra = body.imageUrls.split(',').map(s => s.trim()).filter(Boolean);
      }
      images.push(...extra);
    }

    let features = current.features;
    if (body.features) {
      if (Array.isArray(body.features)) {
        features = body.features;
      } else {
        try {
          features = JSON.parse(body.features);
        } catch {
          features = body.features.split('\n').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    const priceNum = body.price !== undefined ? parseFloat(body.price) : current.price;
    const category = body.category || (priceNum > 25 ? 'premium' : 'non-premium');

    const updatedVehicle = {
      ...current,
      brand: body.brand !== undefined ? body.brand.trim() : current.brand,
      model: body.model !== undefined ? body.model.trim() : current.model,
      badge: body.badge !== undefined ? body.badge.trim() : current.badge,
      type: body.type !== undefined ? body.type.trim() : current.type,
      category,
      lifestyle: body.lifestyle || current.lifestyle,
      fuel: body.fuel || current.fuel,
      transmission: body.transmission || current.transmission,
      price: priceNum,
      emi: body.emi !== undefined ? parseInt(body.emi, 10) : current.emi,
      seats: body.seats !== undefined ? parseInt(body.seats, 10) : current.seats,
      engine: body.engine !== undefined ? body.engine.trim() : current.engine,
      power: body.power !== undefined ? body.power.trim() : current.power,
      mileage: body.mileage !== undefined ? body.mileage.trim() : current.mileage,
      description: body.description !== undefined ? body.description.trim() : current.description,
      features,
      images,
      updatedAt: new Date().toISOString()
    };

    vehicles[idx] = updatedVehicle;
    writeJson(vehiclesFile, vehicles);

    logActivity({
      actorId: req.user.id,
      actorUsername: req.user.username,
      actorRole: req.user.role,
      action: 'VEHICLE_UPDATED',
      target: `${updatedVehicle.brand} ${updatedVehicle.model} (${updatedVehicle.id})`,
      details: `Updated vehicle specs/price. Price: ₹${updatedVehicle.price} Lakhs.`,
      ip: clientIp
    });

    return res.json({
      success: true,
      message: 'Vehicle updated successfully',
      vehicle: updatedVehicle
    });
  } catch (err) {
    console.error('Error updating vehicle:', err);
    return res.status(500).json({ error: 'Failed to update vehicle: ' + err.message });
  }
});

// Delete vehicle (Requires 'inventory:delete' permission)
app.delete('/api/vehicles/:id', authenticateToken, requirePermission('inventory:delete'), (req, res) => {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const vehicles = readJson(vehiclesFile, []);
    const targetIdx = vehicles.findIndex(v => v.id === req.params.id);

    if (targetIdx === -1) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const [deleted] = vehicles.splice(targetIdx, 1);
    writeJson(vehiclesFile, vehicles);

    if (deleted.images && Array.isArray(deleted.images)) {
      deleted.images.forEach(imgPath => {
        if (imgPath.startsWith('/uploads/')) {
          const diskPath = path.join(uploadsDir, path.basename(imgPath));
          if (fs.existsSync(diskPath)) {
            try {
              fs.unlinkSync(diskPath);
            } catch (err) {
              console.warn('Could not delete image file:', diskPath, err);
            }
          }
        }
      });
    }

    logActivity({
      actorId: req.user.id,
      actorUsername: req.user.username,
      actorRole: req.user.role,
      action: 'VEHICLE_DELETED',
      target: `${deleted.brand} ${deleted.model} (${req.params.id})`,
      details: `Vehicle permanently removed from showroom inventory.`,
      ip: clientIp
    });

    return res.json({
      success: true,
      message: `${deleted.brand} ${deleted.model} deleted successfully`,
      deletedId: req.params.id
    });
  } catch (err) {
    console.error('Error deleting vehicle:', err);
    return res.status(500).json({ error: 'Failed to delete vehicle: ' + err.message });
  }
});

// Production: Serve Frontend SPA
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    next();
  });
}

// Express Global Error Handler
app.use((err, req, res, next) => {
  console.error('Express Error Handler caught:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Exotique Machines Backend running on port ${PORT}`);
  console.log(`🛡️  RBAC & Security: Superadmin & Granular Admin Roles active`);
  console.log(`📡 API Endpoints: http://localhost:${PORT}/api/vehicles`);
  console.log(`📁 Uploads Directory: ${uploadsDir}`);
  console.log(`====================================================`);
});
