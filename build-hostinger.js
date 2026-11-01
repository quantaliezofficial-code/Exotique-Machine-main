/**
 * build-hostinger.js
 * 
 * Hostinger Static Hosting ke liye build script.
 * Ye script:
 * 1. Vite build run karta hai
 * 2. server/uploads/ se dist/uploads/ mein images copy karta hai
 * 3. Ready-to-upload folder banata hai
 * 
 * Run: node build-hostinger.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const serverUploadsDir = path.join(__dirname, 'server', 'uploads');
const distUploadsDir = path.join(__dirname, 'dist', 'uploads');

console.log('\n🚀 Hostinger Build Script Starting...\n');

// Step 1: Run Vite build
console.log('📦 Step 1: Building React app with Vite...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Vite build successful!\n');
} catch (err) {
  console.error('❌ Build failed!', err.message);
  process.exit(1);
}

// Step 2: Copy uploads folder
console.log('🖼️  Step 2: Copying images from server/uploads → dist/uploads...');
if (!fs.existsSync(serverUploadsDir)) {
  console.warn('⚠️  server/uploads folder not found. Skipping image copy.');
} else {
  // Create dist/uploads if it doesn't exist
  if (!fs.existsSync(distUploadsDir)) {
    fs.mkdirSync(distUploadsDir, { recursive: true });
    console.log('   Created dist/uploads/ directory');
  }

  // Copy all files
  const files = fs.readdirSync(serverUploadsDir);
  let copied = 0;
  let skipped = 0;

  for (const file of files) {
    const src = path.join(serverUploadsDir, file);
    const dest = path.join(distUploadsDir, file);
    const stat = fs.statSync(src);

    if (stat.isFile()) {
      fs.copyFileSync(src, dest);
      copied++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ Images copied: ${copied} files (${skipped} skipped)\n`);
}

// Step 3: Verify
console.log('🔍 Step 3: Verifying dist folder...');
if (fs.existsSync(distDir)) {
  const distFiles = fs.readdirSync(distDir);
  console.log(`   dist/ contains: ${distFiles.join(', ')}`);

  if (fs.existsSync(distUploadsDir)) {
    const uploadFiles = fs.readdirSync(distUploadsDir);
    console.log(`   dist/uploads/ contains: ${uploadFiles.length} images`);
  }
}

console.log('\n🎉 Build Complete!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📁 Upload folder: dist/');
console.log('   → Hostinger File Manager mein "dist/" ka');
console.log('     SARA CONTENT "public_html/" mein upload karo');
console.log('   → index.html aur uploads/ folder dono upload honge');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
