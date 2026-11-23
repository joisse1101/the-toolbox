import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeBacklog, migrate, reviewRow, designRow, designRowsOf, LockedFile, storyLinks, proposalLinks, reviewRowsOf, namedCodes,
} from './migrate-helper.ts';
import type { Disk } from './migrate-helper.ts';
import { serializeDesignIndex } from '#shared/design/design-index-csv.ts';

// Mock backlogs built in memory and migrated with the same shared functions the Migrate flow calls (migrate-helper.ts).
// B1 is the source: epic IAM (frozen B1-IAM-0001, then 0002 to 0005) and epic Reporting (B1-R-0001). Moving B1-IAM-0002
// renumbers the others: 0003 -> 0002, 0004 -> 0003, 0005 -> 0004. B3 is the target with two IAM stories, so the story lands as
// B3-IAM-0003. B2 is a third backlog that names B1-IAM-0002 everywhere.
const IAM = 'Identity Access Management';
const MOVED = 'B1-IAM-0002';

function world(): Disk {
  return new Map([
    ['B1', makeBacklog('B1',
      [
        { epic: IAM, title: 'frozen', frozen: true, code: 'B1-IAM-0001', dependsOn: [MOVED] },
        { epic: IAM, title: 'moved', dependsOn: ['B1-IAM-0004', 'B1-R-0001'] },
        { epic: IAM, title: 'three' },
        { epic: IAM, title: 'four' },
        { epic: IAM, title: 'five', dependsOn: [MOVED] },
        { epic: 'Reporting', title: 'report' },
      ],
      [{ epic: IAM, code: 'NEW-1', title: 'proposed', dependsOn: [MOVED] }],
      [
        reviewRow({ storyId: MOVED, field: 'Title', suggested: 'new title' }),
        reviewRow({ storyId: MOVED, field: 'Depends On', action: 'add', current: '', suggested: 'B1-IAM-0005' }),
        reviewRow({ storyId: MOVED, field: 'Notes', status: 'dismissed' }),
        reviewRow({ storyId: 'B1-IAM-0005', field: 'Title', suggested: 'other' }),
      ],
      [
        designRow({ storyId: MOVED, story: 'moved', criterion: 'It opens.', artboards: ['open-desktop', 'open-mobile'], viewports: ['desktop', 'mobile'] }),
        designRow({ storyId: MOVED, story: 'moved', criterion: 'It refuses a bad name.', kind: 'failure', artboards: ['open-error-desktop'] }),
        designRow({ storyId: MOVED, story: 'moved', criterion: 'It closes.', artboards: [] }),
        designRow({ storyId: 'B1-IAM-0005', story: 'five', criterion: 'Five works.', canvas: 'https://canvas.example/other' }),
      ])],
    ['B2', makeBacklog('B2',
      [{ epic: 'Payments', title: 'pay', dependsOn: [MOVED] }],
      [{ epic: 'Payments', code: 'NEW-1', title: 'proposed pay', dependsOn: [MOVED] }],
      [
        reviewRow({ storyId: 'B2-P-0001', field: 'Depends On', action: 'add', current: '', suggested: MOVED }),
        reviewRow({ storyId: 'B2-P-0001', field: 'Depends On', action: 'add', current: '', suggested: MOVED, status: 'dismissed' }),
      ])],
    ['B3', makeBacklog('B3',
      [
        { epic: IAM, title: 'a' },
        { epic: IAM, title: 'b' },
        { epic: 'Bill Invoice Ledger', title: 'bill', dependsOn: [MOVED] },
      ])],
  ]);
}

test('migration through the helper: the story and the links move as the flow does', () => {
  const disk = world();
  const out = migrate(disk, 'B1', 'B3', [MOVED]);

  assert.deepEqual([...out.forwards], [[MOVED, 'B3-IAM-0003']]);
  assert.deepEqual(storyLinks(disk, 'B1'), {
    'B1-IAM-0001': ['B3-IAM-0003'], 'B1-IAM-0002': [], 'B1-IAM-0003': [], 'B1-IAM-0004': ['B3-IAM-0003'], 'B1-R-0001': [],
  });
  assert.deepEqual(storyLinks(disk, 'B3'), {
    'B3-IAM-0001': [], 'B3-IAM-0002': [], 'B3-IAM-0003': ['B1-IAM-0003', 'B1-R-0001'], 'B3-BIL-0001': ['B3-IAM-0003'],
  });
});

// ---------- Links follow migrated stories ----------

test('proposal follows the story: the proposed story stays in B1 and depends on the new ID', () => {
  const disk = world();
  migrate(disk, 'B1', 'B3', [MOVED]);
  assert.deepEqual(proposalLinks(disk, 'B1'), { 'NEW-1': ['B3-IAM-0003'] });
});

test('link becomes internal again: B3 story depends on the migrated story under its B3 ID', () => {
  const disk = world();
  migrate(disk, 'B1', 'B3', [MOVED]);
  assert.deepEqual(storyLinks(disk, 'B3')['B3-BIL-0001'], ['B3-IAM-0003']);
  assert.ok(!namedCodes(disk, 'B3').includes(MOVED));
});

test('both ends migrated together: the copy of the dependent names the copy of the dependency', () => {
  const disk = world();
  const out = migrate(disk, 'B1', 'B3', [MOVED, 'B1-IAM-0005']);
  assert.deepEqual([...out.forwards], [[MOVED, 'B3-IAM-0003'], ['B1-IAM-0005', 'B3-IAM-0004']]);
  assert.deepEqual(storyLinks(disk, 'B3')['B3-IAM-0004'], ['B3-IAM-0003']);
  assert.ok(!namedCodes(disk, 'B3').includes('B1-IAM-0005'));
});

test('migrated out and back: it has a B1 ID again and no link names its B3 ID', () => {
  const disk = world();
  migrate(disk, 'B1', 'B3', [MOVED]);
  const back = migrate(disk, 'B3', 'B1', ['B3-IAM-0003']);

  assert.deepEqual([...back.forwards], [['B3-IAM-0003', 'B1-IAM-0005']]);
  assert.deepEqual(storyLinks(disk, 'B1')['B1-IAM-0004'], ['B1-IAM-0005']);
  assert.deepEqual(storyLinks(disk, 'B3')['B3-BIL-0001'], ['B1-IAM-0005']);
  assert.deepEqual(storyLinks(disk, 'B2')['B2-P-0001'], ['B1-IAM-0005']);
  for (const name of ['B1', 'B2', 'B3']) assert.ok(!namedCodes(disk, name).includes('B3-IAM-0003'), `${name} names the old B3 ID`);
});

test('frozen dependent follows: the frozen story keeps its ID and names the new ID', () => {
  const disk = world();
  migrate(disk, 'B1', 'B3', [MOVED]);
  assert.deepEqual(storyLinks(disk, 'B1')['B1-IAM-0001'], ['B3-IAM-0003']);
});

test('third backlog follows: its story, proposed story and open review suggestion name the new ID', () => {
  const disk = world();
  migrate(disk, 'B1', 'B3', [MOVED]);
  assert.deepEqual(storyLinks(disk, 'B2')['B2-P-0001'], ['B3-IAM-0003']);
  assert.deepEqual(proposalLinks(disk, 'B2'), { 'NEW-1': ['B3-IAM-0003'] });
  const [open, dismissed] = reviewRowsOf(disk, 'B2');
  assert.equal(open.suggested, 'B3-IAM-0003');
  assert.equal(dismissed.suggested, MOVED, 'a dismissed row is history');
});

// ---------- Review suggestions move with their story ----------

test('moved review rows land on the new IDs after the source save, a Depends On row included', () => {
  const disk = world();
  const out = migrate(disk, 'B1', 'B3', [MOVED]);

  assert.equal(out.moved, 2);
  const moved = reviewRowsOf(disk, 'B3');
  assert.deepEqual(moved.map((r) => [r.storyId, r.field, r.status]), [['B3-IAM-0003', 'Title', 'open'], ['B3-IAM-0003', 'Depends On', 'open']]);
  assert.equal(moved[1].suggested, 'B1-IAM-0004', 'B1-IAM-0005 was renumbered once by the migration');

  // The source keeps the dismissed row and the other story's row, which follows its story to the new code.
  assert.deepEqual(reviewRowsOf(disk, 'B1').map((r) => [r.storyId, r.status]), [[MOVED, 'dismissed'], ['B1-IAM-0004', 'open']]);
});

// ---------- Design rows move with their story ----------

const snapshot = (disk: Disk) => new Map([...disk].map(([name, files]) => [name, { ...files }]));

test('design rows move with their story and end on the new ID in the target, with canvas, kind, artboards and viewports kept', () => {
  const disk = world();
  const out = migrate(disk, 'B1', 'B3', [MOVED]);

  assert.equal(out.designMoved, 3);
  const landed = designRowsOf(disk, 'B3');
  assert.deepEqual(landed.map((r) => [r.storyId, r.criterion, r.kind]), [
    ['B3-IAM-0003', 'It opens.', 'main'], ['B3-IAM-0003', 'It refuses a bad name.', 'failure'], ['B3-IAM-0003', 'It closes.', 'main'],
  ]);
  assert.deepEqual(landed[0].artboards, ['open-desktop', 'open-mobile']);
  assert.deepEqual(landed[0].viewports, ['desktop', 'mobile']);
  assert.ok(landed.every((r) => r.canvas === 'https://canvas.example/mock'), 'the canvas link is kept');
  assert.deepEqual(landed[2].artboards, [], 'a row without artboards stays without');
  assert.ok(designRowsOf(disk, 'B1').every((r) => r.storyId !== MOVED), 'the source no longer holds them');
});

test('the story that stays in the source keeps its design row, renumbered by the own relink', () => {
  const disk = world();
  migrate(disk, 'B1', 'B3', [MOVED]);
  assert.deepEqual(designRowsOf(disk, 'B1').map((r) => [r.storyId, r.canvas]), [['B1-IAM-0004', 'https://canvas.example/other']]);
});

test('two stories with rows land on their own new IDs', () => {
  const disk = world();
  const out = migrate(disk, 'B1', 'B3', [MOVED, 'B1-IAM-0005']);
  assert.equal(out.designMoved, 4);
  assert.deepEqual([...new Set(designRowsOf(disk, 'B3').map((r) => r.storyId))], ['B3-IAM-0003', 'B3-IAM-0004']);
  assert.deepEqual(designRowsOf(disk, 'B1'), []);
});

test('a story without design rows writes neither design file', () => {
  const disk = world();
  const before = snapshot(disk);
  const out = migrate(disk, 'B1', 'B3', ['B1-IAM-0003']);
  assert.equal(out.designMoved, 0);
  assert.equal(disk.get('B3')!.design, before.get('B3')!.design, 'the target has no file and gains none');
  assert.equal(disk.get('B3')!.design, '');
});

test('a target that has design rows of its own keeps them and gains the moved rows', () => {
  const disk = world();
  disk.set('B3', { ...disk.get('B3')!, design: serializeDesignIndex([designRow({ storyId: 'B3-IAM-0001', criterion: 'Own.' })]) });
  migrate(disk, 'B1', 'B3', [MOVED]);
  assert.deepEqual(designRowsOf(disk, 'B3').map((r) => [r.storyId, r.criterion]), [
    ['B3-IAM-0001', 'Own.'], ['B3-IAM-0003', 'It opens.'], ['B3-IAM-0003', 'It refuses a bad name.'], ['B3-IAM-0003', 'It closes.'],
  ]);
});

test('a locked target design file leaves the open backlog and its design index unchanged and names the file', () => {
  const disk = world();
  const before = snapshot(disk);
  assert.throws(
    () => migrate(disk, 'B1', 'B3', [MOVED], 'B3/design-index.csv'),
    (err: unknown) => err instanceof LockedFile && err.file === 'design-index.csv' && /B3\/design-index\.csv/.test(err.message),
  );
  assert.deepEqual(disk.get('B1'), before.get('B1'), 'the open backlog and its design index are unchanged');
  assert.deepEqual(disk.get('B2'), before.get('B2'));
  assert.equal(disk.get('B3')!.design, '', 'no design row reached the target');
  assert.notEqual(disk.get('B3')!.stories, before.get('B3')!.stories, 'the story is now in both backlogs');
});
