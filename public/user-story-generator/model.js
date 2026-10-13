// CSV <-> story model for the user story tool. Pure functions, no DOM.
// Recognised columns are matched by header name; every other column is carried through in
// `story.cells` untouched. Unparseable User Story / Acceptance Criteria cells keep their raw text.

import { parseCsv, toCsv } from '../shared/csv.js';
import { composeStory, parseStory, composeCriteria, parseCriteria } from '../shared/story-text.js';

export const COLUMNS = [
  'Epic', 'Capability', 'Feature', 'User Story', 'Sprint points', 'Priority', 'Acceptance Criteria', 'Notes',
];
export const POINTS = [1, 2, 3, 5, 8, 13, 21, 34, 55];
export const SPLIT_ABOVE = 13;
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const BOM = '﻿';
const COLUMN_BY_LOWER = new Map(COLUMNS.map((c) => [c.toLowerCase(), c]));

let nextId = 1;

function columnIndex(headers) {
  const idx = {};
  headers.forEach((h, i) => {
    const col = COLUMN_BY_LOWER.get(h.trim().toLowerCase());
    if (col && !(col in idx)) idx[col] = i;
  });
  return idx;
}

export function emptyCriterion() {
  return { given: '', when: '', then: '' };
}

export function newStory(headers) {
  return {
    id: nextId++,
    cells: headers.map(() => ''),
    epic: '', capability: '', feature: '',
    asA: '', iWant: '', soThat: '',
    points: '', priority: '', notes: '',
    criteria: [emptyCriterion()],
    rawUserStory: null, // original cell text when it did not follow the syntax
    rawCriteria: null,
  };
}

function storyFromCells(cells, idx) {
  const get = (col) => cells[idx[col]] ?? '';
  const story = newStory(cells);
  story.cells = cells;
  story.epic = get('Epic');
  story.capability = get('Capability');
  story.feature = get('Feature');
  story.points = get('Sprint points');
  story.priority = get('Priority');
  story.notes = get('Notes');

  const us = parseStory(get('User Story'));
  if (us.ok) {
    story.asA = us.asA;
    story.iWant = us.iWant;
    story.soThat = us.soThat;
  } else {
    story.rawUserStory = get('User Story');
  }

  const ac = parseCriteria(get('Acceptance Criteria'));
  if (ac.ok) story.criteria = ac.criteria;
  else {
    story.criteria = [];
    story.rawCriteria = get('Acceptance Criteria');
  }
  return story;
}

export function loadBacklog(text) {
  const rows = parseCsv(text);
  const headers = rows.length ? rows[0].slice() : [...COLUMNS];
  const idx = columnIndex(headers);
  for (const col of COLUMNS) {
    if (!(col in idx)) {
      idx[col] = headers.length;
      headers.push(col);
    }
  }
  const stories = rows
    .slice(1)
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => {
      const cells = r.slice();
      while (cells.length < headers.length) cells.push('');
      return storyFromCells(cells, idx);
    });
  return { headers, stories, hasBom: text.charCodeAt(0) === 0xfeff };
}

// The text written into the User Story / Acceptance Criteria cells (also feeds the previews).
export function storyCellText(story) {
  return story.rawUserStory ?? composeStory(story);
}

export function criteriaCellText(story) {
  return story.rawCriteria ?? composeCriteria(story.criteria);
}

export function serializeBacklog(backlog) {
  const idx = columnIndex(backlog.headers);
  const rows = backlog.stories.map((s) => {
    const cells = s.cells.slice();
    while (cells.length < backlog.headers.length) cells.push('');
    cells[idx['Epic']] = s.epic;
    cells[idx['Capability']] = s.capability;
    cells[idx['Feature']] = s.feature;
    cells[idx['User Story']] = storyCellText(s);
    cells[idx['Sprint points']] = s.points;
    cells[idx['Priority']] = s.priority;
    cells[idx['Acceptance Criteria']] = criteriaCellText(s);
    cells[idx['Notes']] = s.notes;
    return cells;
  });
  return (backlog.hasBom ? BOM : '') + toCsv([backlog.headers, ...rows]);
}

// Header-only content for a brand-new backlog (BOM so Excel opens it as UTF-8).
export function newBacklogText() {
  return BOM + toCsv([COLUMNS]);
}

// Advisory only: derived from the points, never stored. Off-scale values above 13 count too.
export function shouldSplit(story) {
  return Number(story.points) > SPLIT_ABOVE;
}
