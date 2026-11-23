import test from 'node:test';
import assert from 'node:assert/strict';
import { DESIGN_INDEX_COLUMNS, IndexError, moveDesignRows, parseDesignIndexCsv, retargetDesignRows, serializeDesignIndex } from '#shared/design/design-index-csv.ts';
import type { DesignIndexRow } from '#shared/design/design-index-csv.ts';

const CANVAS = 'https://claude.ai/artifact/abc123';
const HEADER = 'Story ID,Story,Criterion,Kind,Artboards,Viewports,Canvas';

const row = (over: Partial<DesignIndexRow> = {}): DesignIndexRow => ({
  storyId: 'H1-HT-0001',
  story: 'See my streak',
  criterion: 'Given a habit, when I open it, then it shows a streak.',
  kind: 'main',
  artboards: ['streaks-card-default-desktop', 'streaks-card-default-mobile'],
  viewports: ['desktop', 'mobile'],
  canvas: CANVAS,
  extra: {},
  ...over,
});

const rows = (): DesignIndexRow[] => [
  row(),
  row({ criterion: 'Given a name in use, when I add it, then it says the name is taken.', kind: 'failure', artboards: ['streaks-card-error-desktop'], viewports: ['desktop'] }),
  row({ storyId: 'H1-HT-0002', story: 'See my best streak', criterion: 'Given a run of 5, when I open it, then it shows 5.', artboards: ['streaks-best-default-desktop'], viewports: ['desktop'] }),
];

const parseError = (text: string): IndexError => {
  try {
    parseDesignIndexCsv(text);
  } catch (err) {
    if (err instanceof IndexError) return err;
    throw err;
  }
  throw new Error('the file was accepted');
};

test('the file starts with the header of the seven columns and uses CRLF', () => {
  const text = serializeDesignIndex(rows());
  assert.equal(text.split('\r\n')[0], HEADER);
  assert.deepEqual([...DESIGN_INDEX_COLUMNS], HEADER.split(','));
  assert.equal(text.split('\r\n').length, 5, 'header, three rows and the empty piece after the last CRLF');
  assert.ok(!text.replace(/\r\n/g, '').includes('\n'));
});

test('a criterion with a comma and a quote survives a round trip', () => {
  const tricky = [row({ criterion: 'Given "Run, walk", when I save it, then it says "saved", with a comma.' })];
  const text = serializeDesignIndex(tricky);
  assert.ok(text.includes('"Given ""Run, walk"", when I save it, then it says ""saved"", with a comma."'));
  assert.deepEqual(parseDesignIndexCsv(text), tricky);
});

test('Artboards and Viewports are lists joined by a semicolon', () => {
  const text = serializeDesignIndex([row()]);
  assert.ok(text.includes('streaks-card-default-desktop;streaks-card-default-mobile,desktop;mobile,'));
  const read = parseDesignIndexCsv(text);
  assert.deepEqual(read[0].artboards, ['streaks-card-default-desktop', 'streaks-card-default-mobile']);
  assert.deepEqual(read[0].viewports, ['desktop', 'mobile']);
});

test('a row with no artboards reads as an empty list', () => {
  const read = parseDesignIndexCsv(serializeDesignIndex([row({ artboards: [] })]));
  assert.deepEqual(read[0].artboards, []);
});

test('a column the code does not know is kept on read and write', () => {
  const text = `${HEADER},Owner\r\nH1-HT-0001,See my streak,Given a habit then a streak,main,a-desktop,desktop,${CANVAS},Ana\r\n`;
  const read = parseDesignIndexCsv(text);
  assert.deepEqual(read[0].extra, { Owner: 'Ana' });
  assert.equal(serializeDesignIndex(read), text);
});

test('an empty file holds no rows and a file of the header only holds no rows', () => {
  assert.deepEqual(parseDesignIndexCsv(''), []);
  assert.deepEqual(parseDesignIndexCsv(`${HEADER}\r\n`), []);
});

test('an unreadable row names its row and its column', () => {
  const good = 'H1-HT-0001,See my streak,A criterion,main,a-desktop,desktop,' + CANVAS;
  const badKind = parseError(`${HEADER}\r\n${good}\r\nH1-HT-0002,Best,Another criterion,error,b-desktop,desktop,${CANVAS}\r\n`);
  assert.equal(badKind.line, 3);
  assert.equal(badKind.field, 'Kind');
  assert.match(badKind.message, /row 3: column "Kind"/);

  const badViewport = parseError(`${HEADER}\r\n${good.replace(',desktop,', ',tablet,')}\r\n`);
  assert.equal(badViewport.line, 2);
  assert.equal(badViewport.field, 'Viewports');

  const noId = parseError(`${HEADER}\r\n,See my streak,A criterion,main,a-desktop,desktop,${CANVAS}\r\n`);
  assert.equal(noId.field, 'Story ID');

  const noCriterion = parseError(`${HEADER}\r\nH1-HT-0001,See my streak,,main,a-desktop,desktop,${CANVAS}\r\n`);
  assert.equal(noCriterion.field, 'Criterion');

  const repeat = parseError(`${HEADER}\r\n${good}\r\n${good}\r\n`);
  assert.equal(repeat.line, 3);
  assert.equal(repeat.field, 'Criterion');
});

test('a header without a known column names the column', () => {
  const error = parseError('Story ID,Story,Criterion,Kind,Artboards,Viewports\r\n');
  assert.equal(error.line, 1);
  assert.equal(error.field, 'Canvas');
});

test('a rename changes the story ID of its rows and leaves the others', () => {
  const moved = retargetDesignRows(rows(), new Map([['H1-HT-0001', 'H1-HT-0007']]));
  assert.deepEqual(moved.map((r) => r.storyId), ['H1-HT-0007', 'H1-HT-0007', 'H1-HT-0002']);
  assert.equal(moved[0].criterion, rows()[0].criterion);
  assert.equal(moved[0].canvas, CANVAS);
});

test('a change that names no story of the file returns the rows as they were', () => {
  const same = rows();
  assert.equal(retargetDesignRows(same, new Map([['H1-HT-0099', 'H1-HT-0100']])), same);
});

test('a deleted story (a change to an empty string) drops its rows', () => {
  const kept = retargetDesignRows(rows(), new Map([['H1-HT-0001', '']]));
  assert.deepEqual(kept.map((r) => r.storyId), ['H1-HT-0002']);
});

test('a swap of two IDs is applied once', () => {
  const swapped = retargetDesignRows(rows(), new Map([['H1-HT-0001', 'H1-HT-0002'], ['H1-HT-0002', 'H1-HT-0001']]));
  assert.deepEqual(swapped.map((r) => r.storyId), ['H1-HT-0002', 'H1-HT-0002', 'H1-HT-0001']);
  assert.deepEqual(swapped.map((r) => r.story), ['See my streak', 'See my streak', 'See my best streak']);
});

test('a move takes the rows of the named stories to the target and keeps their canvas', () => {
  const targetRow = row({ storyId: 'H1-OT-0001', story: 'Other', canvas: 'https://claude.ai/artifact/other' });
  const result = moveDesignRows(rows(), [targetRow], ['H1-HT-0001']);
  assert.equal(result.moved, 2);
  assert.deepEqual(result.source.map((r) => r.storyId), ['H1-HT-0002']);
  assert.deepEqual(result.target.map((r) => r.storyId), ['H1-OT-0001', 'H1-HT-0001', 'H1-HT-0001']);
  assert.equal(result.target[1].canvas, CANVAS);
});

test('a move of a story with no rows moves nothing and returns both lists as they were', () => {
  const source = rows();
  const target: DesignIndexRow[] = [];
  const result = moveDesignRows(source, target, ['H1-HT-0099']);
  assert.equal(result.moved, 0);
  assert.equal(result.source, source);
  assert.equal(result.target, target);
});
