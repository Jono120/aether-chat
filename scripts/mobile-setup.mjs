#!/usr/bin/env node
/**
 * First-time Capacitor setup: build SPA, install mobile deps, add Android platform, sync.
 * iOS: run `npx cap add ios` from mobile/ on macOS after this script.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mobile = path.join(root, 'mobile');

function run(cmd, cwd = root) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

run('npm run build');

if (!existsSync(path.join(mobile, 'node_modules'))) {
  run('npm install', mobile);
}

if (!existsSync(path.join(mobile, 'android'))) {
  console.log('\nAdding Android platform…');
  run('npx cap add android', mobile);
} else {
  console.log('\nAndroid platform already present — skipping cap add');
}

run('npx cap sync', mobile);

console.log('\nDone. Open Android Studio: npm run mobile:open:android');
console.log('On macOS, add iOS: cd mobile && npx cap add ios && npx cap sync');
