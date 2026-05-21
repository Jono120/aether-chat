import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

console.log('==========================================================');
console.log('              AETHER SECURE LOCAL PROTOTYPE');
console.log('==========================================================');
console.log();

const nodeModules = join(root, 'node_modules');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  if (!existsSync(nodeModules)) {
    console.log('[INFO] node_modules not found. Restoring packages...');
    await run('npm', ['install']);
  }

  console.log();
  console.log('[INFO] Starting Vite development server and opening default browser...');
  console.log();

  const viteBin =
    process.platform === 'win32'
      ? join(root, 'node_modules', '.bin', 'vite.cmd')
      : join(root, 'node_modules', '.bin', 'vite');

  await new Promise((resolve, reject) => {
    const child = spawn(viteBin, ['--open'], {
      cwd: root,
      stdio: 'inherit',
      shell: false,
    });
    child.on('error', reject);
    child.on('close', (code) => process.exit(code ?? 0));
  });
}

main().catch((err) => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
