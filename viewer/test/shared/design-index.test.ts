import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBacklog } from '#shared/backlog/model.ts';
import { parseDesignIndexCsv, retargetDesignRows, serializeDesignIndex } from '#shared/design/design-index-csv.ts';
import type { DesignIndexRow } from '#shared/design/design-index-csv.ts';
import { buildDesignIndex, checkCoverage, compareIndex, IndexError } from '#shared/skill-support/design-index.ts';
import type { DesignEntry, DesignIndex } from '#shared/skill-support/design-index.ts';

const AC_STREAK = 'Given a habit checked off on each of the last 3 days, when I open the habit list, then it shows a streak of 3.';
const AC_BEST = 'Given a habit whose longest run was 5 days, when I open the habit list, then it shows a best streak of 5.';
const AC_DUPLICATE = 'Given a habit named Run, when I add a habit named Run, then it says the name is taken.';
const CANVAS = 'https://claude.ai/artifact/habits1';

const LINES = [
  'ID,Epic,Feature,Title,User Story,Sprint points,Depends On,User Acceptance Criteria,Notes,Frozen,Clarifications',
  `H1-H-0001,Habits,Streaks,See my streak,,3,,"AC1: ${AC_STREAK}\nAC2: ${AC_DUPLICATE}",,,`,
  `H1-H-0002,Habits,Streaks,See my best streak,,2,,"AC1: ${AC_BEST}",,,`,
  'H1-H-0003,Habits,Reminders,Remind me,,2,,"AC1: Given a reminder, when the time comes, then I am told.",,,',
];
const csvOf = (...lines: string[]): string => lines.join('\n');
const CSV = csvOf(...LINES);

const backlog = (csv = CSV) => loadBacklog(csv, { initials: 'H1' }).stories;

const designs: DesignEntry[] = [{ scope: { type: 'feature', epic: 'Habits', feature: 'Streaks' }, url: CANVAS }];

const row = (over: Partial<DesignIndexRow>): DesignIndexRow => ({
  storyId: 'H1-H-0001',
  story: 'See my streak',
  criterion: AC_STREAK,
  kind: 'main',
  artboards: ['streaks-card-default-desktop', 'streaks-card-default-mobile'],
  viewports: ['desktop', 'mobile'],
  canvas: CANVAS,
  extra: {},
  ...over,
});

const rows = (): DesignIndexRow[] => [
  row({}),
  row({ criterion: AC_DUPLICATE, kind: 'failure', artboards: ['streaks-card-error-desktop', 'streaks-card-error-mobile'] }),
  row({ storyId: 'H1-H-0002', story: 'See my best streak', criterion: AC_BEST, artboards: ['streaks-best-default-desktop'], viewports: ['desktop'] }),
];

const index = (): DesignIndex => buildDesignIndex(rows());

test('the index is built from rows: one story per ID, criteria in row order, viewports per criterion', () => {
  const built = index();
  assert.deepEqual(built.stories.map((s) => s.storyId), ['H1-H-0001', 'H1-H-0002']);
  assert.deepEqual(built.stories[0].criteria.map((c) => c.text), [AC_STREAK, AC_DUPLICATE]);
  assert.deepEqual(built.stories[0].canvases, [CANVAS]);
  assert.deepEqual(built.stories[1].criteria[0].viewports, ['desktop']);
});

test('a clean index has nothing stale and full coverage', () => {
  const result = compareIndex(index(), backlog(), designs);
  assert.deepEqual(result, { changed: [], missing: [], new: [], stale: false });
  assert.equal(checkCoverage(index()).ok, true);
});

test('a reworded criterion reports the story as changed with the criteria that differ', () => {
  const csv = CSV.replace('then it shows a streak of 3.', 'then it shows a streak of 3 days.');
  const result = compareIndex(index(), backlog(csv), designs);
  assert.equal(result.stale, true);
  assert.equal(result.changed.length, 1);
  assert.equal(result.changed[0].storyId, 'H1-H-0001');
  assert.equal(result.changed[0].title, 'See my streak');
  assert.equal(result.changed[0].oldTitle, null);
  assert.deepEqual(result.changed[0].removed, [AC_STREAK]);
  assert.deepEqual(result.changed[0].added, [AC_STREAK.replace('streak of 3.', 'streak of 3 days.')]);
  assert.deepEqual(result.missing, []);
});

test('a story renamed in the backlog keeps its ID, so it is changed with the old title and is not missing', () => {
  const result = compareIndex(index(), backlog(CSV.replace('See my best streak', 'See my longest streak')), designs);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.new, []);
  assert.equal(result.changed.length, 1);
  assert.equal(result.changed[0].storyId, 'H1-H-0002');
  assert.equal(result.changed[0].title, 'See my longest streak');
  assert.equal(result.changed[0].oldTitle, 'See my best streak');
  assert.deepEqual(result.changed[0].removed, []);
  assert.equal(result.stale, true);
});

test('a story whose ID is gone from the backlog is missing', () => {
  const result = compareIndex(index(), backlog(csvOf(LINES[0], LINES[1])), designs);
  assert.deepEqual(result.missing, [{ storyId: 'H1-H-0002', title: 'See my best streak' }]);
  assert.deepEqual(result.changed, []);
  assert.equal(result.stale, true);
});

test('a renumbered story whose rows followed reports nothing', () => {
  const followed = retargetDesignRows(rows(), new Map([['H1-H-0001', ''], ['H1-H-0002', 'H1-H-0001']]));
  assert.deepEqual(followed.map((r) => r.storyId), ['H1-H-0001']);
  const result = compareIndex(buildDesignIndex(followed), backlog(csvOf(LINES[0], LINES[2], LINES[3])), designs);
  assert.deepEqual(result, { changed: [], missing: [], new: [], stale: false });
});

test('a story in the designed scope with no rows is new, and one outside the scope is not', () => {
  const extra = 'H1-H-0004,Habits,Streaks,Reset a streak,,1,,"AC1: Given a streak, when I reset it, then it shows 0.",,,';
  const result = compareIndex(index(), backlog(`${CSV}\n${extra}`), designs);
  assert.deepEqual(result.new, [{ storyId: 'H1-H-0004', title: 'Reset a streak' }]);
  assert.ok(!result.new.some((s) => s.title === 'Remind me'), 'the Reminders story is outside the Streaks scope');
});

test('a story with an open clarification is not reported as new, because design leaves it out', () => {
  const unready = 'H1-H-0004,Habits,Streaks,Reset a streak,,1,,"AC1: Given a streak, when I reset it, then it shows 0.",,,"Q1: Does a reset keep the best streak?\nA1:"';
  const result = compareIndex(index(), backlog(`${CSV}\n${unready}`), designs);
  assert.deepEqual(result.new, []);
  assert.equal(result.stale, false);
});

test('a story whose clarification is answered is reported as new', () => {
  const ready = 'H1-H-0004,Habits,Streaks,Reset a streak,,1,,"AC1: Given a streak, when I reset it, then it shows 0.",,,"Q1: Does a reset keep the best streak?\nA1: Yes"';
  assert.deepEqual(compareIndex(index(), backlog(`${CSV}\n${ready}`), designs).new, [{ storyId: 'H1-H-0004', title: 'Reset a streak' }]);
});

test('a migrated row whose canvas has no designs.json entry is checked for changed and missing and never reports new', () => {
  const moved = [row({ storyId: 'H1-H-0003', story: 'Remind me', criterion: 'Given a reminder, when the time comes, then I am told.', canvas: 'https://claude.ai/artifact/elsewhere' })];
  const extra = 'H1-H-0004,Habits,Streaks,Reset a streak,,1,,"AC1: Given a streak, when I reset it, then it shows 0.",,,';
  const none = compareIndex(buildDesignIndex(moved), backlog(`${CSV}\n${extra}`), []);
  assert.deepEqual(none, { changed: [], missing: [], new: [], stale: false });
  const reworded = backlog(CSV.replace('then I am told.', 'then I get a notice.'));
  assert.equal(compareIndex(buildDesignIndex(moved), reworded, []).changed.length, 1);
  const gone = backlog(csvOf(LINES[0], LINES[1], LINES[2]));
  assert.deepEqual(compareIndex(buildDesignIndex(moved), gone, []).missing, [{ storyId: 'H1-H-0003', title: 'Remind me' }]);
});

test('a criterion with no artboard is reported by story and text', () => {
  const broken = rows();
  broken[2].artboards = [];
  const coverage = checkCoverage(buildDesignIndex(broken));
  assert.equal(coverage.ok, false);
  assert.deepEqual(coverage.noArtboard, [{ storyId: 'H1-H-0002', story: 'See my best streak', criterion: AC_BEST }]);
  assert.deepEqual(coverage.noErrorArtboard, []);
});

test('a failure criterion whose artboards show no error state is reported', () => {
  const broken = rows();
  broken[1].artboards = ['streaks-card-default-desktop'];
  const coverage = checkCoverage(buildDesignIndex(broken));
  assert.deepEqual(coverage.noErrorArtboard, [{ storyId: 'H1-H-0001', story: 'See my streak', criterion: AC_DUPLICATE }]);
  assert.deepEqual(coverage.noArtboard, []);
});

test('rows written and read back build the same index', () => {
  assert.deepEqual(buildDesignIndex(parseDesignIndexCsv(serializeDesignIndex(rows()))), index());
});

test('an unreadable file is an IndexError that names its row and column', () => {
  const text = serializeDesignIndex(rows()).replace(',main,', ',primary,');
  assert.throws(
    () => parseDesignIndexCsv(text),
    (err: unknown) => err instanceof IndexError && err.line === 2 && err.field === 'Kind' && /row 2: column "Kind"/.test(err.message),
  );
});
