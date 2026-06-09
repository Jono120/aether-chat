#!/usr/bin/env node
/** Rebuild SPA (optional) and copy into Capacitor native projects. VITE_* vars inherit from the shell. */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mobile = path.join(root, 'mobile');
const skipBuild =
  process.env.SKIP_SPA_BUILD === '1' || process.env.SKIP_SPA_BUILD === 'true';

if (!skipBuild) {
  execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true, env: process.env });
} else {
  console.log('SKIP_SPA_BUILD set — using existing dist/');
}

execSync('npx cap sync', { cwd: mobile, stdio: 'inherit', shell: true });
