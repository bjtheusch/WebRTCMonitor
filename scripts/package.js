#!/usr/bin/env node

/**
 * Package script for creating a distributable zip file
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_DIR = 'dist';
const PACKAGE_NAME = 'webrtc-monitor-v1.0.0.zip';

// Files to include in the package
const FILES = [
  'manifest.json',
  'background.js',
  'content.js',
  'database.js',
  'api-client.js',
  'webrtc-monitor.js',
  'quality-analyzer.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'options.html',
  'options.css',
  'options.js',
  'icons',
  'LICENSE',
  'README.md'
];

console.log('📦 Packaging WebRTC Monitor extension...\n');

// Create dist directory if it doesn't exist
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR);
  console.log('✓ Created dist directory');
}

// Create zip file
try {
  const fileList = FILES.join(' ');
  execSync(`zip -r ${DIST_DIR}/${PACKAGE_NAME} ${fileList}`, {
    stdio: 'inherit'
  });
  
  console.log(`\n✓ Package created: ${DIST_DIR}/${PACKAGE_NAME}`);
  console.log('\nYou can now upload this file to the Chrome Web Store!');
  
} catch (error) {
  console.error('✗ Error creating package:', error.message);
  console.log('\nNote: This script requires the "zip" command to be available.');
  console.log('On Linux/Mac: zip should be pre-installed');
  console.log('On Windows: Install zip or use 7-Zip manually');
  process.exit(1);
}
