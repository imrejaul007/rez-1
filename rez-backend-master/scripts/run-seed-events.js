#!/usr/bin/env node

/**
 * Script to seed events data
 * Usage: node scripts/run-seed-events.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🌱 Starting event seeding process...');

// Run the TypeScript seeding script
const seedProcess = spawn('npx', ['ts-node', 'src/scripts/seedEvents.ts'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

seedProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Event seeding completed successfully!');
  } else {
    console.error('❌ Event seeding failed with code:', code);
    process.exit(1);
  }
});

seedProcess.on('error', (error) => {
  console.error('❌ Error running event seeding:', error);
  process.exit(1);
});

