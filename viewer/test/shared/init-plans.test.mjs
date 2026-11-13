import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initPlans } from '../../logic/skill-support/init-plans.mjs';

// "A skill asks before creating .plans": the init step creates `.plans` in the current folder and nothing else.
const SKILLS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'toolkit', 'skills');
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'init-plans-'));

test('creates only .plans in the current folder', () => {
  const cwd = temp();
  fs.writeFileSync(path.join(cwd, 'keep.txt'), 'x');
  const result = initPlans({ cwd });
  assert.deepEqual(result, { ok: true, created: true, dir: path.join(cwd, '.plans') });
  assert.deepEqual(fs.readdirSync(cwd).sort(), ['.plans', 'keep.txt']);
  assert.deepEqual(fs.readdirSync(path.join(cwd, '.plans')), []);
});

test('a second run changes nothing', () => {
  const cwd = temp();
  initPlans({ cwd });
  fs.writeFileSync(path.join(cwd, '.plans', 'mine.txt'), 'x');
  assert.deepEqual(initPlans({ cwd }), { ok: true, created: false, dir: path.join(cwd, '.plans') });
  assert.deepEqual(fs.readdirSync(path.join(cwd, '.plans')), ['mine.txt']);
});

test('refuses a file named .plans and leaves it alone', () => {
  const cwd = temp();
  fs.writeFileSync(path.join(cwd, '.plans'), 'a file');
  const result = initPlans({ cwd });
  assert.equal(result.ok, false);
  assert.match(result.error, /is a file, not a folder/);
  assert.equal(fs.readFileSync(path.join(cwd, '.plans'), 'utf8'), 'a file');
});

test('does not create a missing current folder or touch a parent', () => {
  const cwd = path.join(temp(), 'missing');
  const result = initPlans({ cwd });
  assert.equal(result.ok, false);
  assert.equal(fs.existsSync(cwd), false);
});

for (const skill of ['jois-story-propose', 'jois-story-review', 'jois-story-plan']) {
  test(`${skill}/init-plans.mjs creates .plans in the folder it is run from and refuses a file`, () => {
    const script = path.join(SKILLS_DIR, skill, 'init-plans.mjs');
    const cwd = temp();
    const run = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(fs.readdirSync(cwd), ['.plans']);

    const other = temp();
    fs.writeFileSync(path.join(other, '.plans'), 'a file');
    const refused = spawnSync(process.execPath, [script], { cwd: other, encoding: 'utf8' });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /is a file/);
    assert.equal(fs.statSync(path.join(other, '.plans')).isFile(), true);
  });
}

test('jois-story-explore has no init script', () => {
  assert.equal(fs.existsSync(path.join(SKILLS_DIR, 'jois-story-explore', 'init-plans.mjs')), false);
  assert.equal(fs.existsSync(path.join(SKILLS_DIR, 'jois-story-explore', 'lib', 'skill-support', 'init-plans.mjs')), false);
});
