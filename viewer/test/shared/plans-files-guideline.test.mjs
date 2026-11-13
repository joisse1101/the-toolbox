import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLANS_FILES, LIFECYCLES } from '../../logic/skill-support/plans-files.mjs';

// The readable table in the guideline and the data module hold the same paths, writers and lifecycles.
const GUIDELINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'guidelines', 'plans-files.md');

function guidelineRows() {
  const text = fs.readFileSync(GUIDELINE, 'utf8').replace(/\r\n/g, '\n');
  return text.split('\n').filter((line) => /^\| `/.test(line)).map((line) => {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    assert.equal(cells.length, 3, line);
    return { path: cells[0].replace(/^`|`$/g, ''), writer: cells[1], lifecycle: cells[2].split(',').map((s) => s.trim()) };
  });
}

test('the guideline table lists the same rows as plans-files.mjs, in the same order', () => {
  assert.deepEqual(guidelineRows(), PLANS_FILES.map(({ path: p, writer, lifecycle }) => ({ path: p, writer, lifecycle })));
});

test('the guideline explains each lifecycle', () => {
  const text = fs.readFileSync(GUIDELINE, 'utf8');
  for (const lifecycle of LIFECYCLES) assert.ok(text.includes(`\`${lifecycle}\` files`), `no paragraph for ${lifecycle}`);
});
