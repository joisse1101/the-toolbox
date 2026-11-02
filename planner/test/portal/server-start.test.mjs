import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

const server = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'portal', 'server', 'server.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'server-start-test-'));

async function run(configText) {
  const port = String(await freePort());
  const config = path.join(tmp, `config-${Math.random().toString(36).slice(2)}.yaml`);
  fs.writeFileSync(config, configText);
  return spawnSync(process.execPath, [server], {
    env: { ...process.env, PLANNER_CONFIG: config, PORT: port },
    encoding: 'utf8',
    timeout: 20000,
  });
}

test('an invalid config stops the server at startup with a message that names the key', async () => {
  const bad = await run('projectName: X\ndataFolder: nowhere\n');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /dataFolder/);
  assert.doesNotMatch(bad.stdout, /running at/);
});

test('a config with a wrong type names that key too', async () => {
  const bad = await run('dataDir: 5\n');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /dataDir/);
});

test('a valid config prints the project name and the data folder', async () => {
  const { spawn } = await import('node:child_process');
  const data = path.join(tmp, 'data');
  fs.mkdirSync(data);
  const config = path.join(tmp, 'good.yaml');
  fs.writeFileSync(config, `projectName: Gamma\ndataDir: ${JSON.stringify(data)}\n`);
  const child = spawn(process.execPath, [server], { env: { ...process.env, PLANNER_CONFIG: config, PORT: String(await freePort()) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no startup output: ${out}`)), 15000);
      child.stdout.on('data', (c) => {
        out += c;
        if (out.includes('Data folder:')) { clearTimeout(timer); resolve(); }
      });
      child.on('exit', () => reject(new Error(`server exited: ${out}`)));
    });
  } finally {
    child.kill();
  }
  assert.match(out, /Project: Gamma/);
  assert.ok(out.includes(`Data folder: ${data}`), out);
});
