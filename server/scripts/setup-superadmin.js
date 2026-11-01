/**
 * Exotique Machines - Secure Super Admin CLI Setup Script
 *
 * Usage:
 *   node server/scripts/setup-superadmin.js
 *   node server/scripts/setup-superadmin.js --username myadmin --password MySecretPassword123! --name "Showroom Owner"
 *
 * Environment variables:
 *   SUPERADMIN_USERNAME
 *   SUPERADMIN_PASSWORD
 *   SUPERADMIN_NAME
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
const usersFile = path.join(dataDir, 'users.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Parse args
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return fallback;
}

const username = getArg('username', process.env.SUPERADMIN_USERNAME || 'superadmin');
const password = getArg('password', process.env.SUPERADMIN_PASSWORD || 'superadmin123');
const name = getArg('name', process.env.SUPERADMIN_NAME || 'Super Admin (Owner)');

if (!username || !password || password.length < 8) {
  console.error('❌ Error: Superadmin password must be at least 8 characters long.');
  process.exit(1);
}

// Read current users
let users = [];
if (fs.existsSync(usersFile)) {
  try {
    users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  } catch (e) {
    users = [];
  }
}

const salt = bcrypt.genSaltSync(12);
const passwordHash = bcrypt.hashSync(password, salt);

const allPermissions = [
  'inventory:view',
  'inventory:create',
  'inventory:edit',
  'inventory:delete',
  'pricing:edit',
  'logs:view'
];

const existingSuperIndex = users.findIndex(u => u.role === 'superadmin');

if (existingSuperIndex >= 0) {
  users[existingSuperIndex] = {
    ...users[existingSuperIndex],
    username: username.trim(),
    name: name.trim(),
    passwordHash,
    permissions: allPermissions,
    status: 'active',
    mustChangePassword: false,
    updatedAt: new Date().toISOString()
  };
  console.log(`✅ Existing Super Admin account updated: ${username}`);
} else {
  const newSuper = {
    id: `usr_super_${Date.now()}`,
    username: username.trim(),
    name: name.trim(),
    passwordHash,
    role: 'superadmin',
    permissions: allPermissions,
    status: 'active',
    mustChangePassword: false,
    createdAt: new Date().toISOString()
  };
  users.unshift(newSuper);
  console.log(`✅ New Super Admin account created: ${username}`);
}

fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
console.log('🔒 Super Admin credentials securely hashed and saved.');
