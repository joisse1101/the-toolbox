// One command to run the app:  npm start [-- --dev] [-- --build] [-- --no-open]
//   (default)  builds app/dist when it is missing or older than the sources, then runs the server and opens the browser
//   --dev      runs the server plus the Vite dev server (hot reload) and opens the Vite page
//   --build    forces a rebuild first
//   --no-open  does not open the browser
// PORT and TLT_DATA_DIR are passed through to the server. Ctrl+C stops everything.

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const dev = args.has('--dev');
const port = Number(process.env.PORT) || 3000;
const VITE_PORT = 5173;
const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const viteConfig = path.join(ROOT, 'app', 'frontend', 'vite.config.mjs');

if (!fs.existsSync(viteBin)) {
  console.error('Dependencies are not installed. Run `npm install` first.');
  process.exit(1);
}

function newestMtime(dir) {
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(full) : fs.statSync(full).mtimeMs);
  }
  return newest;
}

function needsBuild() {
  const built = path.join(ROOT, 'app', 'dist', 'index.html');
  if (!fs.existsSync(built)) return true;
  const builtAt = fs.statSync(built).mtimeMs;
  return ['app/frontend', 'core', 'ai/guidelines'].some((d) => newestMtime(path.join(ROOT, d)) > builtAt);
}

if (!dev && (args.has('--build') || needsBuild())) {
  console.log('Building the app...');
  const build = spawnSync(process.execPath, [viteBin, 'build', '--config', viteConfig], { cwd: ROOT, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const children = [];
const run = (label, script, scriptArgs) => {
  const child = spawn(process.execPath, [script, ...scriptArgs], { cwd: ROOT, stdio: 'inherit' });
  child.on('exit', (code) => {
    console.log(`${label} stopped${code ? ` (exit ${code})` : ''}.`);
    stop(code ?? 0);
  });
  children.push(child);
};

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) c.kill();
  process.exit(code);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

run('The server', path.join(ROOT, 'app', 'backend', 'server.cjs'), []);
if (dev) run('The Vite dev server', viteBin, ['--config', viteConfig, '--port', String(VITE_PORT), '--strictPort']);

if (!args.has('--no-open')) {
  const url = dev ? `http://localhost:${VITE_PORT}/` : `http://localhost:${port}/`;
  setTimeout(() => spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref(), 1500);
}
