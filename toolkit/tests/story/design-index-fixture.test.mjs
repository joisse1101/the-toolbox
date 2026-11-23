import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sampleTree, backlogPath } from './helpers/backlog-tree.mjs';
import { tempProject } from './helpers/temp-project.mjs';
import { loadBacklog } from '../../skills/jois-story-design/lib/backlog/model.mjs';
import { parseDesignIndexCsv, serializeDesignIndex } from '../../skills/jois-story-design/lib/design/design-index-csv.mjs';
import { buildDesignIndex, checkCoverage, compareIndex } from '../../skills/jois-story-design/lib/skill-support/design-index.mjs';

// The mock design files in fixtures/habits/ (a made-up canvas link; nothing is published) match the habits backlog.
function load() {
  const { dataDir } = tempProject();
  sampleTree({ into: dataDir, withDesign: true });
  const dir = backlogPath(dataDir, 'sample');
  const read = (file) => fs.readFileSync(path.join(dir, file), 'utf8');
  const rows = parseDesignIndexCsv(read('design-index.csv'));
  const designs = JSON.parse(read('designs.json')).designs;
  const { stories } = loadBacklog(read('user-stories.csv'), { initials: 'H1' });
  return { rows, designs, stories };
}

test('the mock design index is read through the shared module: one failure row, one desktop-only story', () => {
  const { rows } = load();
  assert.deepEqual(rows.map((r) => [r.storyId, r.kind, r.viewports]), [
    ['H1-HT-0001', 'main', ['desktop', 'mobile']],
    ['H1-HT-0002', 'failure', ['desktop']],
  ]);
  assert.equal(rows[1].artboards.every((stem) => stem.endsWith('-desktop')), true);
});

test('the mock design index is current against the habits backlog, and covered', () => {
  const { rows, designs, stories } = load();
  const index = buildDesignIndex(rows);
  const stale = compareIndex(index, stories, designs);
  assert.deepEqual([stale.changed, stale.missing, stale.new, stale.stale], [[], [], [], false]);
  assert.equal(checkCoverage(index).ok, true);
});

test('the mock design index survives a write and a read unchanged', () => {
  const { rows } = load();
  assert.deepEqual(parseDesignIndexCsv(serializeDesignIndex(rows)), rows);
});
