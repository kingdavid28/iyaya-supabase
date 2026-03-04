#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building APK for iYaya...');

try {
  // Clean previous builds
  if (fs.existsSync('android/app/build')) {
    console.log('🧹 Cleaning previous build...');
    execSync('rd /s /q "android\\app\\build"', { stdio: 'inherit' });
  }

  // Run gradlew assembleRelease
  console.log('📱 Building release APK...');
  const result = execSync('cd android && gradlew assembleRelease --no-daemon --max-workers=1', { 
    stdio: 'inherit',
    encoding: 'utf8'
  });

  console.log('✅ Build completed!');
  
  // Check if APK was created
  const apkPath = 'android/app/build/outputs/apk/release/app-release.apk';
  if (fs.existsSync(apkPath)) {
    const stats = fs.statSync(apkPath);
    console.log(`📦 APK created: ${apkPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.error('❌ APK not found at expected location');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
