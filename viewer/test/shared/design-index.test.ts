import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBacklog } from '#shared/backlog/model.ts';
import { checkCoverage, compareIndex, IndexError, parseIndexText, validateIndex } from '#shared/skill-support/design-index.ts';
import type { DesignIndex } from '#shared/skill-support/design-index.ts';

const AC_STREAK = 'Given a habit checked off on each of the last 3 days, when I open the habit list, then it shows a streak of 3.';
const AC_BEST = 'Given a habit whose longest run was 5 days, when I open the habit list, then it shows a best streak of 5.';
const AC_DUPLICATE = 'Given a habit named Run, when I add a habit named Run, then it says the name is taken.';

const CSV = [
  'ID,Epic,Feature,Title,User Story,Sprint points,Depends On,User Acceptance Criteria,Notes,Frozen,Clarifications',
  `H1-HT-0001,Habits,Streaks,See my streak,,3,,"AC1: ${AC_STREAK}\nAC2: ${AC_DUPLICATE}",,,`,
  `H1-HT-0002,Habits,Streaks,See my best streak,,2,,"AC1: ${AC_BEST}",,,`,
  'H1-HT-0003,Habits,Reminders,Remind me,,2,,"AC1: Given a reminder, when the time comes, then I am told.",,,',
].join('\n');

const backlog = (csv = CSV) => loadBacklog(csv, { initials: 'H1' }).stories;

const index = (): DesignIndex => ({
  version: 1,
  backlog: 'habits',
  scope: { type: 'feature', epic: 'Habits', feature: 'Streaks' },
  viewports: ['desktop', 'mobile'],
  stories: [
    {
      title: 'See my streak',
      criteria: [
        { text: AC_STREAK, kind: 'main', artboards: ['streaks-card-default-desktop', 'streaks-card-default-mobile'] },
        { text: AC_DUPLICATE, kind: 'failure', artboards: ['streaks-card-error-desktop', 'streaks-card-error-mobile'] },
      ],
    },
    { title: 'See my best streak', criteria: [{ text: AC_BEST, kind: 'main', artboards: ['streaks-best-default-desktop'] }] },
  ],
});

const mainFile = (object: string): string =>
  ['<sc-component>', '  renderVals() {', `    const index = ${object};`, '    return { index };', '  }', '</sc-component>'].join('\n');

test('a clean index has nothing stale and full coverage', () => {
  const result = compareIndex(index(), backlog());
  assert.deepEqual(result, { changed: [], missing: [], new: [], stale: false });
  assert.equal(checkCoverage(index()).ok, true);
});

test('a reworded criterion reports the story as changed with the criteria that differ', () => {
  const csv = CSV.replace('then it shows a streak of 3.', 'then it shows a streak of 3 days.');
  const result = compareIndex(index(), backlog(csv));
  assert.equal(result.stale, true);
  assert.equal(result.changed.length, 1);
  assert.equal(result.changed[0].title, 'See my streak');
  assert.deepEqual(result.changed[0].removed, [AC_STREAK]);
  assert.deepEqual(result.changed[0].added, [AC_STREAK.replace('streak of 3.', 'streak of 3 days.')]);
  assert.deepEqual(result.missing, []);
});

test('a story renamed in the backlog is reported as missing, and its new title as new', () => {
  const result = compareIndex(index(), backlog(CSV.replace('See my best streak', 'See my longest streak')));
  assert.deepEqual(result.missing, ['See my best streak']);
  assert.deepEqual(result.new, ['See my longest streak']);
  assert.equal(result.stale, true);
});

test('a story in the scope and not in the index is reported as new, and one outside the scope is not', () => {
  const extra = 'H1-HT-0004,Habits,Streaks,Reset a streak,,1,,"AC1: Given a streak, when I reset it, then it shows 0.",,,';
  const result = compareIndex(index(), backlog(`${CSV}\n${extra}`));
  assert.deepEqual(result.new, ['Reset a streak']);
  assert.ok(!result.new.includes('Remind me'), 'the Reminders story is outside the Streaks scope');
});

test('a story with an open clarification is not reported as new, because design leaves it out', () => {
  const unready = 'H1-HT-0004,Habits,Streaks,Reset a streak,,1,,"AC1: Given a streak, when I reset it, then it shows 0.",,,"Q1: Does a reset keep the best streak?\nA1:"';
  const result = compareIndex(index(), backlog(`${CSV}\n${unready}`));
  assert.deepEqual(result.new, []);
  assert.equal(result.stale, false);
});

test('a story whose clarification is answered is reported as new', () => {
  const ready = 'H1-HT-0004,Habits,Streaks,Reset a streak,,1,,"AC1: Given a streak, when I reset it, then it shows 0.",,,"Q1: Does a reset keep the best streak?\nA1: Yes"';
  assert.deepEqual(compareIndex(index(), backlog(`${CSV}\n${ready}`)).new, ['Reset a streak']);
});

test('a criterion with no artboard is reported by story and text', () => {
  const broken = index();
  broken.stories[1].criteria[0].artboards = [];
  const coverage = checkCoverage(broken);
  assert.equal(coverage.ok, false);
  assert.deepEqual(coverage.noArtboard, [{ story: 'See my best streak', criterion: AC_BEST }]);
  assert.deepEqual(coverage.noErrorArtboard, []);
});

test('a failure criterion whose artboards show no error state is reported', () => {
  const broken = index();
  broken.stories[0].criteria[1].artboards = ['streaks-card-default-desktop'];
  const coverage = checkCoverage(broken);
  assert.deepEqual(coverage.noErrorArtboard, [{ story: 'See my streak', criterion: AC_DUPLICATE }]);
  assert.deepEqual(coverage.noArtboard, []);
});

test('the index is read out of the full Main.dc.html text', () => {
  const read = parseIndexText(mainFile(JSON.stringify(index(), null, 2)));
  assert.deepEqual(read, index());
});

test('a brace inside a string does not end the index early', () => {
  const tricky = index();
  tricky.stories[0].criteria[0].text = 'Given a "{" and a } in the copy, then the card shows 3';
  assert.deepEqual(parseIndexText(mainFile(JSON.stringify(tricky, null, 2))), tricky);
});

test('a bare JSON index is accepted', () => {
  assert.deepEqual(parseIndexText(`\n${JSON.stringify(index())}\n`), index());
});

test('an index with a trailing comma names the line in the file', () => {
  const lines = JSON.stringify(index(), null, 2).split('\n');
  // A comma after the last artboard of the first criterion, which JSON does not allow.
  const marker = '"streaks-card-default-mobile"';
  const at = lines.findIndex((l) => l.includes(marker));
  lines[at] = `${lines[at]},`;
  const text = mainFile(lines.join('\n'));
  const expectedLine = text.split('\n').findIndex((l) => l.includes(marker)) + 1;
  assert.throws(
    () => parseIndexText(text),
    (err: unknown) => err instanceof IndexError && err.line !== undefined && err.line >= expectedLine && err.line <= expectedLine + 1 && /strict JSON/.test(err.message),
  );
});

test('a comment inside the object is refused and the message says the index must be strict JSON', () => {
  const text = mainFile(`{\n  // the streak story\n  "version": 1\n}`);
  assert.throws(
    () => parseIndexText(text),
    (err: unknown) => err instanceof IndexError && err.line === 4 && /strict JSON/.test(err.message),
  );
});

test('an index that is never closed names the line where it starts', () => {
  assert.throws(
    () => parseIndexText('<sc-component>\n  const index = { "version": 1,\n'),
    (err: unknown) => err instanceof IndexError && err.line === 2 && /never closed/.test(err.message),
  );
});

test('a file with no index is refused', () => {
  assert.throws(() => parseIndexText('<sc-component></sc-component>'), IndexError);
});

test('an index of the wrong shape names the field at fault', () => {
  const bad = (change: (i: Record<string, unknown>) => void): string => {
    const copy = JSON.parse(JSON.stringify(index())) as Record<string, unknown>;
    change(copy);
    try {
      validateIndex(copy);
    } catch (err) {
      if (err instanceof IndexError) return err.field ?? '';
      throw err;
    }
    return 'accepted';
  };
  assert.equal(bad((i) => { i.version = 2; }), 'version');
  assert.equal(bad((i) => { i.viewports = ['tablet']; }), 'viewports[0]');
  assert.equal(bad((i) => { i.viewports = []; }), 'viewports');
  assert.equal(bad((i) => { i.scope = { type: 'feature', epic: 'Habits' }; }), 'scope.feature');
  assert.equal(bad((i) => { i.scope = { type: 'team', epic: 'Habits' }; }), 'scope.type');
  const stories = (i: Record<string, unknown>) => i.stories as { criteria: Record<string, unknown>[] }[];
  assert.equal(bad((i) => { stories(i)[0].criteria[1].kind = 'error'; }), 'stories[0].criteria[1].kind');
  assert.equal(bad((i) => { stories(i)[1].criteria[0].artboards = 'one'; }), 'stories[1].criteria[0].artboards');
  assert.equal(bad((i) => { delete stories(i)[0].criteria[0].text; }), 'stories[0].criteria[0].text');
});
