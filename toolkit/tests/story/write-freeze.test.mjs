import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tempData, putFile, pathOf, putSampleInitials, FIXTURE_BACKLOG_CSV } from './helpers/backlog-tree.mjs';
import { writeFreeze, checkFreeze } from '../../skills/jois-story-plan/write-freeze.mjs';
import { loadBacklog, serializeBacklog } from '../../skills/jois-story-plan/lib/backlog/model.js';
import { parseCsv, toCsv } from '../../skills/jois-story-plan/lib/backlog/csv.js';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills/jois-story-plan/write-freeze.mjs');

// The sample backlog (initials H1) with H1-HT-0001 frozen; H1-HT-0002 and H1-FT-0001 are not. The accepted backlog freezes nothing, so the test freezes one story itself.
const SAMPLE = fs.readFileSync(FIXTURE_BACKLOG_CSV, 'utf8').replace(/^(H1-HT-0001,.*),,,$/m, '$1,,Yes,');
const TWO = { id: 'H1-HT-0002', title: 'See the best streak' };
const RPT = { id: 'H1-FT-0001', title: 'Count focus sessions by category' };

function temp(csv = SAMPLE) {
  const root = tempData('freeze-test-');
  putFile(root, 'sample', 'backlog', csv);
  putSampleInitials(root, 'sample');
  return root;
}
const csvPath = (root) => pathOf(root, 'sample', 'backlog');
const run = (root, items) => writeFreeze({ dataDir: root, name: 'sample', input: JSON.stringify(items) });
const check = (root, items) => checkFreeze({ dataDir: root, name: 'sample', input: JSON.stringify(items) });
const cell = (text, id, column) => {
  const rows = parseCsv(text);
  const col = rows[0].indexOf(column);
  return rows.slice(1).find((r) => r[0] === id)[col];
};

test('freezes the named stories and changes no other cell', () => {
  const root = temp();
  const before = parseCsv(fs.readFileSync(csvPath(root), 'utf8'));
  const r = run(root, [TWO, RPT]);
  assert.deepEqual([r.ok, r.changed, r.toFreeze], [true, true, ['H1-HT-0002', 'H1-FT-0001']]);
  const after = parseCsv(fs.readFileSync(csvPath(root), 'utf8'));
  const frozen = before[0].indexOf('Frozen');
  assert.equal(after.length, before.length);
  after.forEach((row, i) => row.forEach((c, j) => {
    if (i > 0 && j === frozen && ['H1-HT-0002', 'H1-FT-0001'].includes(row[0])) assert.equal(c, 'Yes');
    else assert.equal(c, before[i][j], `row ${i} column ${j}`);
  }));
  assert.deepEqual(fs.readdirSync(path.dirname(csvPath(root))), ['backlog.json', 'user-stories.csv'], 'no temp file left behind');
});

test('--check writes nothing', () => {
  const root = temp();
  const before = fs.readFileSync(csvPath(root));
  const r = check(root, [TWO]);
  assert.deepEqual([r.ok, r.toFreeze], [true, ['H1-HT-0002']]);
  assert.deepEqual(fs.readFileSync(csvPath(root)), before);
});

test('freezing twice leaves the file as the first run left it', () => {
  const root = temp();
  run(root, [TWO]);
  const once = fs.readFileSync(csvPath(root));
  const r = run(root, [TWO]);
  assert.deepEqual([r.ok, r.changed, r.already], [true, false, ['H1-HT-0002']]);
  assert.deepEqual(fs.readFileSync(csvPath(root)), once);
});

test('a story that is already frozen is left as it is', () => {
  const root = temp();
  const before = fs.readFileSync(csvPath(root));
  const r = run(root, [{ id: 'H1-HT-0001', title: 'See the current streak' }]);
  assert.deepEqual([r.ok, r.changed, r.already], [true, false, ['H1-HT-0001']]);
  assert.deepEqual(fs.readFileSync(csvPath(root)), before);
});

test('a story with no ID is refused and the others are still frozen', () => {
  const root = temp(`${SAMPLE.trimEnd()}\n,,,Orphan story,,,,,,,,\n`);
  const r = run(root, [TWO, { id: '', title: 'Orphan story' }]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.toFreeze, ['H1-HT-0002']);
  assert.equal(r.refused.length, 1);
  assert.match(r.refused[0].reason, /Orphan story.*no ID/);
  assert.match(r.text, /refused and not frozen/);
});

test('an ID without the backlog initials is refused and the story stays not frozen', () => {
  const old = SAMPLE.replace('H1-HT-0002', 'HT-0002');
  const root = temp(old);
  const r = run(root, [{ id: 'HT-0002', title: 'See the best streak' }]);
  assert.equal(r.ok, true);
  assert.equal(r.changed, false);
  assert.match(r.refused[0].reason, /initials \(H1\).*Open the backlog in the portal first/);
  assert.equal(fs.readFileSync(csvPath(root), 'utf8'), old);
});

test('the initials come from backlog.json', () => {
  const root = temp();
  fs.writeFileSync(path.join(path.dirname(csvPath(root)), 'backlog.json'), JSON.stringify({ initials: 'ZZ' }));
  const r = run(root, [TWO]);
  assert.equal(r.ok, true);
  assert.match(r.refused[0].reason, /initials \(ZZ\)/);
});

test('an ID that is not in the file, or a Title that does not match, stops the run with nothing written', () => {
  const root = temp();
  const before = fs.readFileSync(csvPath(root));
  const missing = run(root, [TWO, { id: 'H1-HT-0099', title: 'Nothing' }]);
  assert.equal(missing.ok, false);
  const wrongTitle = run(root, [TWO, { id: 'H1-FT-0001', title: 'Something else' }]);
  assert.equal(wrongTitle.ok, false);
  assert.match(wrongTitle.errors[0], /H1-FT-0001 is now "Count focus sessions by category"/);
  const noTitle = run(root, [{ id: 'H1-FT-0001' }]);
  assert.equal(noTitle.ok, false);
  assert.deepEqual(fs.readFileSync(csvPath(root)), before);
});

test('an ID the portal would rewrite stops the run with nothing written', () => {
  // The stored ID H1-FOC-0001 is not the one the portal derives (H1-FT-0001), which the test sets up itself.
  const root = temp(fs.readFileSync(FIXTURE_BACKLOG_CSV, 'utf8').replace('H1-FT-0001', 'H1-FOC-0001'));
  const before = fs.readFileSync(csvPath(root));
  const r = run(root, [{ id: 'H1-FOC-0001', title: 'Count focus sessions by category' }]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /the portal would give the story another ID/);
  assert.deepEqual(fs.readFileSync(csvPath(root)), before);
});

test('input that is not a JSON array is rejected', () => {
  const root = temp();
  assert.equal(writeFreeze({ dataDir: root, name: 'sample', input: '{oops' }).ok, false);
  assert.equal(writeFreeze({ dataDir: root, name: 'sample', input: '[]' }).ok, false);
  assert.equal(writeFreeze({ dataDir: root, name: 'nope', input: JSON.stringify([TWO]) }).ok, false);
});

test('a name that leaves the data folder is refused', () => {
  const root = temp();
  assert.equal(writeFreeze({ dataDir: root, name: '../sample', input: JSON.stringify([TWO]) }).ok, false);
});

test('a file with no Frozen column gets one, empty for every other row', () => {
  // Without a frozen story the portal derives other IDs, so build the file from the IDs it derives.
  const loaded = loadBacklog(SAMPLE.replace(',Yes,', ',,'), { initials: 'H1' });
  const rows = parseCsv(serializeBacklog(loaded));
  const frozenAt = rows[0].indexOf('Frozen');
  const text = toCsv(rows.map((r) => r.filter((_, j) => j !== frozenAt)));
  const [first, second] = loaded.stories;
  const root = temp(text);
  const r = run(root, [{ id: first.code, title: first.title }]);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const out = fs.readFileSync(csvPath(root), 'utf8');
  assert.equal(parseCsv(out)[0].at(-1), 'Frozen');
  assert.equal(cell(out, first.code, 'Frozen'), 'Yes');
  assert.equal(cell(out, second.code, 'Frozen'), '');
  assert.ok(out.includes(String.fromCharCode(13, 10)));
});

test('the command line reads stdin, supports --check and exits 1 on a problem', () => {
  const root = temp();
  const env = { ...process.env, PLANNER_CONFIG: '' };
  fs.writeFileSync(path.join(root, 'planner.config.yaml'), `dataDir: ${JSON.stringify(root)}\n`);
  env.PLANNER_CONFIG = path.join(root, 'planner.config.yaml');
  const call = (args, input) => spawnSync(process.execPath, [SCRIPT, ...args], { input, env, encoding: 'utf8' });
  const ok = call(['sample', '--check'], JSON.stringify([TWO]));
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Check passed; nothing was written/);
  const wrote = call(['sample'], JSON.stringify([TWO]));
  assert.equal(wrote.status, 0, wrote.stderr);
  assert.match(wrote.stdout, /Read back/);
  assert.equal(cell(fs.readFileSync(csvPath(root), 'utf8'), 'H1-HT-0002', 'Frozen'), 'Yes');
  const bad = call(['sample'], JSON.stringify([{ id: 'H1-HT-0099', title: 'x' }]));
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Nothing was written/);
  assert.equal(call([], '').status, 2);
});
