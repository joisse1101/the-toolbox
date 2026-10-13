// CSV <-> story model for the user story tool. Pure functions, no DOM.
// Recognised columns are matched by header name; every other column is carried through in
// `story.cells` untouched. Unparseable User Story / Acceptance Criteria cells keep their raw text.

import { parseCsv, toCsv } from '../shared/csv.js';
import { renumber } from './ids.js';
import { composeStory, parseStory, composeCriteria, parseCriteria } from '../shared/story-text.js';

export const COLUMNS = [
  'ID', 'Epic', 'Capability', 'Feature', 'User Story', 'Sprint points', 'Priority', 'Depends On', 'Acceptance Criteria', 'Notes',
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
    code: '', // story ID, derived from epic and position (see ids.js); '' until the story has an epic
    dependsOn: [], // IDs of the stories this one depends on
    ambiguous: [], // dependsOn entries that named an ID several stories held in the loaded file
    epic: '', codedEpic: '', capability: '', feature: '', // codedEpic: the epic the ID was last computed for
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
  story.codedEpic = story.epic;
  story.code = get('ID').trim();
  story.dependsOn = [...new Set(get('Depends On').split(';').map((e) => e.trim()).filter(Boolean))];
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
  if (ac.ok) story.criteria = ac.criteria.length ? ac.criteria : [emptyCriterion()]; // always show one; blank composes to an empty cell
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
  const loaded = rows
    .slice(1)
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => {
      const cells = r.slice();
      while (cells.length < headers.length) cells.push('');
      return storyFromCells(cells, idx);
    });
  // IDs follow position, so recompute them (this also gives IDs to files that have none). `changed` = needs saving.
  const stories = renumber(loaded);
  return { headers, stories, hasBom: text.charCodeAt(0) === 0xfeff, changed: stories !== loaded };
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
    cells[idx['ID']] = s.code;
    cells[idx['Epic']] = s.epic;
    cells[idx['Capability']] = s.capability;
    cells[idx['Feature']] = s.feature;
    cells[idx['User Story']] = storyCellText(s);
    cells[idx['Sprint points']] = s.points;
    cells[idx['Priority']] = s.priority;
    cells[idx['Depends On']] = s.dependsOn.join(';');
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

const blank = (v) => !String(v ?? '').trim();

// Advisory completeness check. errors = incomplete (red), warnings = estimate problems (yellow).
// A cell kept as raw text counts as present.
// `problems` = dependency warnings for this story from backlogProblems().
export function storyIssues(story, problems = []) {
  const errors = [];
  for (const [key, label] of [['epic', 'Epic'], ['capability', 'Capability'], ['feature', 'Feature']]) {
    if (blank(story[key])) errors.push(`${label} is missing`);
  }
  if (story.rawUserStory === null) {
    for (const [key, label] of [['asA', 'As a'], ['iWant', 'I want'], ['soThat', 'So that']]) {
      if (blank(story[key])) errors.push(`${label} is missing`);
    }
  }
  if (story.rawCriteria === null) {
    if (!story.criteria.length) errors.push('Acceptance criteria are missing');
    else if (story.criteria.some((c) => blank(c.given) || blank(c.when) || blank(c.then))) {
      errors.push('Acceptance criteria are incomplete: each needs Given, When and Then');
    }
  }
  const warnings = [...problems];
  if (blank(story.points)) warnings.push('Sprint points are missing');
  if (blank(story.priority)) warnings.push('Priority is missing');
  if (shouldSplit(story)) warnings.push('Consider splitting this story: estimates above 13 points are usually too big for one sprint.');
  return { errors, warnings };
}

export const NO_EPIC = '(No epic)';

// Display grouping, never stored: groups in order of first occurrence, stories in backlog order within a group.
// Blank and whitespace-only epics share one group whose `epic` is ''.
export function groupByEpic(stories) {
  const groups = new Map();
  for (const s of stories) {
    const epic = String(s.epic ?? '').trim();
    if (!groups.has(epic)) groups.set(epic, { epic, label: epic || NO_EPIC, stories: [] });
    groups.get(epic).stories.push(s);
  }
  return [...groups.values()];
}

// The order stories are shown in (panel, Stories tab, Ctrl+Up/Down). The file order is untouched.
export function displayOrder(stories) {
  return groupByEpic(stories).flatMap((g) => g.stories);
}

// Bulk edit. Only defined fields are set: priority undefined = no change ('' clears it); a blank epic or
// capability means no change. Returns the number of stories changed.
export function applyBulk(stories, ids, { priority, epic, capability } = {}) {
  const patch = {};
  if (priority !== undefined) patch.priority = priority;
  if (!blank(epic)) patch.epic = epic.trim();
  if (!blank(capability)) patch.capability = capability.trim();
  let count = 0;
  for (const s of stories) {
    if (!ids.has(s.id)) continue;
    Object.assign(s, patch);
    count++;
  }
  return count;
}

// Story list title: "capability: feature", one part alone if the other is blank.
export function storyLabel(story) {
  const parts = [story.capability, story.feature].map((v) => String(v ?? '').trim()).filter(Boolean);
  return parts.length ? parts.join(': ') : 'New story';
}
