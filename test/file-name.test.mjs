import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { validateName } = createRequire(import.meta.url)('../core/file-name.cjs');

test('csv is the default and is forced', () => {
  assert.equal(validateName('backlog'), 'backlog.csv');
  assert.equal(validateName('  Backlog.CSV '), 'Backlog.CSV');
});

test('a markdown name gets .md, not .csv', () => {
  assert.equal(validateName('IAM', '.md'), 'IAM.md');
  assert.equal(validateName('IAM.MD', '.md'), 'IAM.MD');
  assert.equal(validateName('IAM.csv', '.md'), 'IAM.csv.md');
});

test('the same rules apply to every file type', () => {
  for (const ext of ['.csv', '.md']) {
    for (const bad of ['../x', 'sub/x', 'a\b', 'a:b', 'x.', 'CON', 'nul', '', '   ', ext, 'a'.repeat(130)]) {
      assert.throws(() => validateName(bad, ext), { name: 'Error', status: 400 }, `${JSON.stringify(bad)} for ${ext}`);
    }
  }
  assert.throws(() => validateName(42, '.md'), { status: 400 });
});
