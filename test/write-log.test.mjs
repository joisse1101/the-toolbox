import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { logWrite, LOG_FILE } = require('../core/write-log.cjs');

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'write-log-test-'));
const lines = (root) => fs.readFileSync(path.join(root, 'logs', LOG_FILE), 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));

test('a write appends one line with the writer, store, file, size and a short hash, and no content', () => {
  const root = temp();
  logWrite({ writer: 'portal', store: 'proposals', file: 'data.csv', text: 'héllo secret', dataDir: root });
  logWrite({ writer: 'write_proposals', store: 'proposals', file: 'data.csv', text: 'other', dataDir: root });
  const [first, second] = lines(root);
  assert.deepEqual([first.writer, first.store, first.file, first.bytes], ['portal', 'proposals', 'data.csv', 13]);
  assert.match(first.hash, /^[0-9a-f]{12}$/);
  assert.notEqual(first.hash, second.hash);
  assert.ok(!Number.isNaN(Date.parse(first.time)));
  assert.ok(!fs.readFileSync(path.join(root, 'logs', LOG_FILE), 'utf8').includes('secret'), 'the log holds no content');
  assert.equal(second.writer, 'write_proposals', 'lines keep the order of the writes');
});

test('the same content has the same hash', () => {
  const root = temp();
  logWrite({ writer: 'a', store: 's', file: 'f.csv', text: 'same', dataDir: root });
  logWrite({ writer: 'b', store: 's', file: 'f.csv', text: 'same', dataDir: root });
  const [one, two] = lines(root);
  assert.equal(one.hash, two.hash);
});

test('a log folder that cannot be written is reported on stderr and does not throw', (t) => {
  const root = temp();
  fs.writeFileSync(path.join(root, 'logs'), 'a file where the folder should be');
  const messages = [];
  t.mock.method(console, 'error', (m) => messages.push(m));
  assert.doesNotThrow(() => logWrite({ writer: 'portal', store: 'proposals', file: 'data.csv', text: 'x', dataDir: root }));
  assert.equal(messages.length, 1);
  assert.match(messages[0], /could not log the write of proposals\/data\.csv/);
});
