// Review suggestions: the review CSV format, validation (used by the write script) and the pure logic that
// decides whether a suggestion is still current and applies it to the stories (used by the portal).
// No DOM and no file access. One row = one field edit; rows that share a Group are applied together.

import { parseCsv, toCsv } from './csv.js';
import { parseStory, parseCriteria } from './story-text.js';
import { POINTS, newStory, storyCellText, emptyCriterion } from './model.js';
import { renumber, commitEpics, wouldCycle } from './ids.js';

export const REVIEW_COLUMNS = [
  'Story ID', 'Field', 'Action', 'Current', 'Suggested', 'Reason', 'Area', 'Confidence', 'Group', 'Status',
];
export const FIELDS = [
  'Epic', 'Feature', 'Title', 'User Story', 'Sprint points', 'Depends On', 'User Acceptance Criteria', 'Notes',
];
export const ACTIONS = ['replace', 'add', 'remove', 'append', 'add-story', 'unlock'];
export const AREAS = ['Hierarchy', 'INVEST', 'Acceptance criteria'];
export const CONFIDENCES = ['ready', 'confirm'];
export const STATUSES = ['open', 'applied', 'dismissed'];

// Which actions each field accepts on an existing story. `add-story` rows (a story to create) accept any field.
const ALLOWED_ACTIONS = {
  Epic: ['replace'],
  Feature: ['replace'],
  Title: ['replace'],
  'User Story': ['replace'],
  'Sprint points': ['replace'],
  Notes: ['replace', 'append'],
  'Depends On': ['add', 'remove'],
  'User Acceptance Criteria': ['add', 'replace', 'remove'],
};

const NEW_ID = /^NEW-\d+$/;
const AC_LABEL = /^\s*AC(\d+)\s*:/i;
const AC_ONLY = /^\s*AC(\d+)\s*$/i; // the label alone, as a remove row's Suggested
const AC_NUMBER = /^\s*AC(\d+)\b/i; // the label alone (remove) or the start of a criterion line (replace)
const BOM = '﻿';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const blank = (v) => !String(v ?? '').trim();

// ---------- CSV <-> rows ----------

export function serializeReview(rows) {
  return BOM + toCsv([REVIEW_COLUMNS, ...rows.map((r) => [
    r.storyId, r.field, r.action, r.current, r.suggested, r.reason, r.area, r.confidence, r.group, r.status,
  ])]);
}

// Rows with an unknown Field/Action are skipped (counted), a bad Status reads as open.
export function parseReview(text) {
  const table = parseCsv(String(text ?? ''));
  if (!table.length) return { ok: true, rows: [], skipped: 0 };
  const idx = {};
  table[0].forEach((h, i) => {
    const col = REVIEW_COLUMNS.find((c) => c.toLowerCase() === h.trim().toLowerCase());
    if (col && !(col in idx)) idx[col] = i;
  });
  const missing = REVIEW_COLUMNS.filter((c) => !(c in idx));
  if (missing.length) return { ok: false, error: `The review file is missing the column${missing.length > 1 ? 's' : ''} ${missing.join(', ')}.` };
  const rows = [];
  let skipped = 0;
  for (const r of table.slice(1)) {
    if (!r.some((c) => c !== '')) continue;
    const get = (c) => r[idx[c]] ?? '';
    const row = {
      storyId: get('Story ID').trim(),
      field: get('Field').trim(),
      action: get('Action').trim(),
      current: get('Current'),
      suggested: get('Suggested'),
      reason: get('Reason'),
      area: get('Area').trim(),
      confidence: get('Confidence').trim() === 'confirm' ? 'confirm' : 'ready',
      group: get('Group').trim(),
      status: STATUSES.includes(get('Status').trim()) ? get('Status').trim() : 'open',
    };
    const fieldOk = row.action === 'unlock' ? row.field === '' : FIELDS.includes(row.field); // an unlock row has no Field
    if (!row.storyId || !fieldOk || !ACTIONS.includes(row.action)) {
      skipped++;
      continue;
    }
    rows.push(row);
  }
  return { ok: true, rows, skipped };
}

// ---------- story helpers ----------

export const criterionText = (c, n) => `AC${n}: Given ${c.given}, when ${c.when}, then ${c.then}`;

// The live value of a field as the review's `Current` column holds it.
export function fieldValue(story, field) {
  switch (field) {
    case 'Epic': return story.epic;
    case 'Feature': return story.feature;
    case 'Title': return story.title;
    case 'User Story': return storyCellText(story);
    case 'Sprint points': return story.points;
    case 'Notes': return story.notes;
    case 'Depends On': return story.dependsOn.join(';');
    default: return '';
  }
}

const hasBlankOnly = (criteria) => criteria.every((c) => blank(c.given) && blank(c.when) && blank(c.then));

// One criterion line -> { given, when, then }, or null when it does not parse as exactly one criterion.
function parseOneCriterion(text) {
  const r = parseCriteria(text);
  return r.ok && r.criteria.length === 1 ? r.criteria[0] : null;
}

const sameCriterion = (a, b) => norm(a.given) === norm(b.given) && norm(a.when) === norm(b.when) && norm(a.then) === norm(b.then);

// ---------- validation (the write script runs this on the model's findings) ----------

// findings: [{ storyId, field, action, suggested, reason, area, confidence, group }]. Returns every problem found.
// `existingRows`: the rows the review file keeps next to these findings (an --append batch); a field edit on a locked
// story needs an unlock row for it among them or among the findings.
export function validateFindings(findings, backlog, { existingRows = [] } = {}) {
  if (!Array.isArray(findings)) return ['The input must be a JSON array of findings.'];
  const errors = [];
  const stories = backlog.stories;
  const byCode = new Map();
  for (const s of stories) if (s.code) byCode.set(s.code, [...(byCode.get(s.code) ?? []), s]);

  const rows = findings.map((f) => ({
    storyId: str(f?.storyId), field: str(f?.field), action: str(f?.action), suggested: str(f?.suggested),
    reason: str(f?.reason), area: str(f?.area), confidence: str(f?.confidence), group: str(f?.group),
  }));

  // New stories declared per group, for Depends On targets and the Title check.
  const newIds = new Map(); // group -> Set of NEW ids
  const newTitles = new Map(); // group|id -> true
  for (const r of rows) {
    if (r.action !== 'add-story' || !NEW_ID.test(r.storyId)) continue;
    if (!newIds.has(r.group)) newIds.set(r.group, new Set());
    newIds.get(r.group).add(r.storyId);
    if (r.field === 'Title' && r.suggested) newTitles.set(`${r.group}|${r.storyId}`, true);
  }

  const unlocked = new Set([...rows, ...existingRows].filter((r) => r.action === 'unlock').map((r) => r.storyId));

  rows.forEach((r, i) => {
    const at = `Finding ${i + 1}${r.storyId ? ` (${r.storyId} ${r.field})` : ''}`;
    const bad = (msg) => errors.push(`${at}: ${msg}`);

    const unlock = r.action === 'unlock';
    if (!unlock && !FIELDS.includes(r.field)) bad(`Field "${r.field}" is not one of ${FIELDS.join(', ')}.`);
    if (!ACTIONS.includes(r.action)) bad(`Action "${r.action}" is not one of ${ACTIONS.join(', ')}.`);
    if (!AREAS.includes(r.area)) bad(`Area "${r.area}" is not one of ${AREAS.join(', ')}.`);
    if (!CONFIDENCES.includes(r.confidence)) bad(`Confidence "${r.confidence}" is not one of ${CONFIDENCES.join(', ')}.`);
    if (unlock) {
      if (r.field || r.suggested || r.group) bad('an unlock row has an empty Field, Suggested and Group.');
    } else if (!r.suggested) bad('Suggested is empty: every finding must carry a field edit.');
    if (!r.reason) bad('Reason is empty.');
    if (!r.storyId) {
      bad('Story ID is empty.');
      return;
    }

    const isNew = r.action === 'add-story';
    let story = null;
    if (isNew) {
      if (!NEW_ID.test(r.storyId)) bad(`an add-story row needs a Story ID like NEW-1, not "${r.storyId}".`);
      if (!r.group) bad('an add-story row needs a Group.');
      else if (!newTitles.get(`${r.group}|${r.storyId}`)) bad(`new story ${r.storyId} in group "${r.group}" has no Title row.`);
    } else {
      if (NEW_ID.test(r.storyId)) bad(`${r.storyId} is a new-story ID, so the Action must be add-story.`);
      const matches = byCode.get(r.storyId) ?? [];
      if (!matches.length) bad(`the backlog has no story ${r.storyId}.`);
      else if (matches.length > 1) bad(`${r.storyId} is held by more than one story.`);
      else story = matches[0];
      if (unlock) {
        if (story && !story.locked) bad(`${r.storyId} is not locked, so there is nothing to unlock.`);
      } else if (story?.locked && !unlocked.has(r.storyId)) {
        bad(`${r.storyId} is locked: add an unlock row for it, or leave it out of the review.`);
      }
      if (!unlock && FIELDS.includes(r.field) && ACTIONS.includes(r.action) && !ALLOWED_ACTIONS[r.field].includes(r.action)) {
        bad(`Action ${r.action} does not fit Field ${r.field} (allowed: ${ALLOWED_ACTIONS[r.field].join(', ')}).`);
      }
    }

    // Value checks per field.
    if (r.suggested && FIELDS.includes(r.field)) {
      if (r.field === 'User Story') {
        const us = parseStory(r.suggested);
        if (!us.ok || blank(us.asA) || blank(us.iWant) || blank(us.soThat)) bad('User Story must read "As a ..., I want ..., so that ...".');
      } else if (r.field === 'Sprint points') {
        if (!POINTS.map(String).includes(r.suggested)) bad(`Sprint points must be one of ${POINTS.join(', ')}.`);
      } else if (r.field === 'User Acceptance Criteria' && r.action === 'remove') {
        const m = AC_ONLY.exec(r.suggested);
        if (!m) bad('a remove on User Acceptance Criteria takes just the label of the criterion, e.g. "AC4".');
        else if (story && (story.rawCriteria !== null || hasBlankOnly(story.criteria) || Number(m[1]) < 1 || Number(m[1]) > story.criteria.length)) {
          bad(`${r.storyId} has no criterion AC${m[1]} that can be removed.`);
        }
      } else if (r.field === 'User Acceptance Criteria') {
        if (!parseOneCriterion(r.suggested)) bad('User Acceptance Criteria must be one line: "AC<n>: Given ..., when ..., then ...".');
        if (r.action === 'replace' && story) {
          const m = AC_LABEL.exec(r.suggested);
          if (!m) bad('a replace on User Acceptance Criteria must start with the label of the criterion to replace, e.g. "AC3:".');
          else if (story.rawCriteria !== null) bad(`${r.storyId}'s User Acceptance Criteria cell is free text, so a single criterion cannot be replaced.`);
          else if (Number(m[1]) < 1 || Number(m[1]) > story.criteria.length || hasBlankOnly(story.criteria)) bad(`${r.storyId} has no criterion AC${m[1]}.`);
        }
        if (r.action === 'add' && story && story.rawCriteria !== null) bad(`${r.storyId}'s User Acceptance Criteria cell is free text, so a criterion cannot be added.`);
      } else if (r.field === 'Depends On') {
        const target = r.suggested;
        const inGroup = r.group && newIds.get(r.group)?.has(target);
        if (target === r.storyId) bad('a story cannot depend on itself.');
        else if (NEW_ID.test(target)) {
          if (!inGroup) bad(`${target} is not a new story in group "${r.group}".`);
        } else if (!byCode.has(target)) bad(`${target} is not a story in the backlog.`);
        if (r.action === 'remove' && story && !story.dependsOn.includes(target)) bad(`${r.storyId} does not depend on ${target}.`);
      }
    }
  });

  // A group is applied as one unit, so every row in it needs the user's confirmation.
  const groups = new Map();
  rows.forEach((r) => {
    if (r.group) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
  });
  for (const [g, list] of groups) {
    if (list.some((r) => r.confidence !== 'confirm')) errors.push(`Group "${g}": every row in a group must have Confidence confirm.`);
  }
  return errors;
}

// Adds Current (from the backlog as read) and Status open. Assumes validateFindings found no errors.
export function fillCurrent(findings, backlog) {
  const byCode = new Map(backlog.stories.filter((s) => s.code).map((s) => [s.code, s]));
  return findings.map((f) => {
    const row = {
      storyId: str(f.storyId), field: str(f.field), action: str(f.action), current: '', suggested: str(f.suggested),
      reason: str(f.reason), area: str(f.area), confidence: str(f.confidence), group: str(f.group), status: 'open',
    };
    const story = byCode.get(row.storyId);
    if (!story || row.action === 'unlock' || row.action === 'add' || row.action === 'add-story') return row;
    if (row.field === 'User Acceptance Criteria') {
      const n = Number(AC_NUMBER.exec(row.suggested)?.[1]);
      const c = story.criteria[n - 1];
      row.current = c ? criterionText(c, n) : '';
    } else {
      row.current = fieldValue(story, row.field);
    }
    return row;
  });
}

const rowKey = (r) => [r.storyId, r.field, r.action, r.suggested].join('\u0000');

// A re-run replaces the rows, but a row identical to one already decided keeps its Status.
export function mergeStatus(newRows, oldRows) {
  const old = new Map(oldRows.map((r) => [rowKey(r), r.status]));
  return newRows.map((r) => (old.has(rowKey(r)) ? { ...r, status: old.get(rowKey(r)) } : r));
}

// ---------- portal side: is a suggestion still current, and apply it ----------

const findStory = (stories, code) => {
  const hits = stories.filter((s) => s.code === code);
  return hits.length === 1 ? hits[0] : null;
};

// { state: 'open' }, { state: 'stale', why } or { state: 'locked' } (current, but its story is locked, so it cannot be
// applied until the story is unlocked). add-story rows are never stale on their own (their group decides).
// An unlock row is current while its story exists and is locked.
export function suggestionState(row, stories) {
  if (row.action === 'unlock') {
    const story = findStory(stories, row.storyId);
    if (!story) return { state: 'stale', why: `${row.storyId} no longer exists or was renumbered` };
    return story.locked ? { state: 'open' } : { state: 'stale', why: `${row.storyId} is no longer locked` };
  }
  const base = editState(row, stories);
  if (base.state === 'open' && row.action !== 'add-story' && findStory(stories, row.storyId)?.locked) return { state: 'locked' };
  return base;
}

function editState(row, stories) {
  if (row.action === 'add-story') return { state: 'open' };
  const story = findStory(stories, row.storyId);
  if (!story) return { state: 'stale', why: `${row.storyId} no longer exists or was renumbered` };
  const stale = (why) => ({ state: 'stale', why });

  if (row.field === 'Depends On') {
    const has = story.dependsOn.includes(row.suggested);
    if (row.action === 'add' && has) return stale(`already depends on ${row.suggested}`);
    if (row.action === 'remove' && !has) return stale(`no longer depends on ${row.suggested}`);
    return { state: 'open' };
  }
  if (row.field === 'User Acceptance Criteria') {
    if (story.rawCriteria !== null) return stale('the criteria are free text');
    if (row.action === 'remove') {
      const n = Number(AC_NUMBER.exec(row.suggested)?.[1]);
      const live = story.criteria[n - 1];
      if (!live || norm(criterionText(live, n)) !== norm(row.current)) return stale(`AC${n} was edited or moved since the review`);
      return { state: 'open' };
    }
    const wanted = parseOneCriterion(row.suggested);
    if (!wanted) return stale('the suggested criterion is not valid');
    if (row.action === 'add') {
      return story.criteria.some((c) => sameCriterion(c, wanted)) ? stale('that criterion already exists') : { state: 'open' };
    }
    const n = Number(AC_LABEL.exec(row.suggested)?.[1]);
    const live = story.criteria[n - 1];
    if (!live || norm(criterionText(live, n)) !== norm(row.current)) return stale(`AC${n} was edited since the review`);
    return { state: 'open' };
  }
  if (row.action === 'append') {
    return norm(story.notes).includes(norm(row.suggested)) ? stale('Notes already contain this text') : { state: 'open' };
  }
  if (norm(fieldValue(story, row.field)) !== norm(row.current)) return stale(`${row.field} was edited since the review`);
  return { state: 'open' };
}

// Units shown and applied together: a group is one unit, an ungrouped row is its own unit.
export function unitsOf(rows) {
  const units = [];
  const byGroup = new Map();
  rows.forEach((row, index) => {
    if (row.status !== 'open') return;
    if (!row.group) {
      units.push({ key: `row-${index}`, group: '', rows: [row], indexes: [index] });
      return;
    }
    if (!byGroup.has(row.group)) {
      const u = { key: `group-${row.group}`, group: row.group, rows: [], indexes: [] };
      byGroup.set(row.group, u);
      units.push(u);
    }
    byGroup.get(row.group).rows.push(row);
    byGroup.get(row.group).indexes.push(index);
  });
  return units;
}

// { state: 'open' }, { state: 'stale', why } or { state: 'locked' } for a whole unit (stale wins over locked).
export function unitState(unit, stories) {
  let locked = false;
  for (const row of unit.rows) {
    const s = suggestionState(row, stories);
    if (s.state === 'stale') return s;
    if (s.state === 'locked') locked = true;
  }
  return locked ? { state: 'locked' } : { state: 'open' };
}

function editExisting(story, row) {
  const v = row.suggested.trim();
  switch (row.field) {
    case 'Epic': return { ...story, epic: v };
    case 'Feature': return { ...story, feature: v };
    case 'Title': return { ...story, title: v };
    case 'Sprint points': return { ...story, points: v };
    case 'Notes':
      return { ...story, notes: row.action === 'append' && story.notes.trim() ? `${story.notes.replace(/\s+$/, '')}\n${v}` : v };
    case 'User Story': {
      const us = parseStory(v);
      return { ...story, asA: us.asA, iWant: us.iWant, soThat: us.soThat, rawUserStory: null };
    }
    case 'User Acceptance Criteria': {
      if (row.action === 'remove') {
        const n = Number(AC_NUMBER.exec(v)[1]);
        const left = story.criteria.filter((_, i) => i !== n - 1);
        return { ...story, criteria: left.length ? left : [emptyCriterion()] }; // a story always keeps one (blank) row
      }
      const c = parseOneCriterion(v);
      if (row.action === 'replace') {
        const n = Number(AC_LABEL.exec(v)[1]);
        return { ...story, criteria: story.criteria.map((x, i) => (i === n - 1 ? { ...c } : x)) };
      }
      const base = hasBlankOnly(story.criteria) ? [] : story.criteria;
      return { ...story, criteria: [...base, { ...c }] };
    }
    default: return story;
  }
}

function buildNewStory(headers, rows, original) {
  const s = newStory(headers);
  if (original) {
    s.epic = original.epic;
    s.feature = original.feature;
  }
  const criteria = [];
  for (const row of rows) {
    const v = row.suggested.trim();
    switch (row.field) {
      case 'Epic': s.epic = v; break;
      case 'Feature': s.feature = v; break;
      case 'Title': s.title = v; break;
      case 'Sprint points': s.points = v; break;
      case 'Notes': s.notes = s.notes ? `${s.notes}\n${v}` : v; break;
      case 'User Story': {
        const us = parseStory(v);
        s.asA = us.asA;
        s.iWant = us.iWant;
        s.soThat = us.soThat;
        break;
      }
      case 'User Acceptance Criteria': {
        const c = parseOneCriterion(v);
        if (c) criteria.push({ ...c });
        break;
      }
      default: break;
    }
  }
  if (criteria.length) s.criteria = criteria;
  s.codedEpic = s.epic;
  return s;
}

// Apply the rows of one unit (one row, or a whole group) to the stories. Pure: returns { stories } or { error }
// and never changes the input. Edits go through the same helpers as manual edits (commitEpics / renumber), so IDs
// and Depends On links keep following their stories.
export function applySuggestions(stories, rows, headers) {
  for (const row of rows) {
    const s = suggestionState(row, stories);
    if (s.state === 'stale') return { error: `Cannot apply: ${s.why}.` };
    if (s.state === 'locked') return { error: `Cannot apply: ${row.storyId} is locked. Unlock it first.` };
    if (row.action === 'unlock') return { error: 'An unlock row unlocks the story; it is not applied as an edit.' };
  }

  const idOf = (code) => findStory(stories, code)?.id;
  const edits = new Map(); // story id -> rows
  const newGroups = new Map(); // group|NEW-n -> { rows, anchor id }
  const depRows = []; // { fromId | newKey, action, targetId | targetNew }
  const firstExisting = rows.find((r) => r.action !== 'add-story');
  const anchorId = firstExisting ? idOf(firstExisting.storyId) : undefined;

  for (const row of rows) {
    if (row.action === 'add-story') {
      const key = `${row.group}|${row.storyId}`;
      if (!newGroups.has(key)) newGroups.set(key, { rows: [] });
      newGroups.get(key).rows.push(row);
    } else if (row.field === 'Depends On') {
      depRows.push({ from: idOf(row.storyId), action: row.action, target: row.suggested, group: row.group });
    } else {
      const id = idOf(row.storyId);
      edits.set(id, [...(edits.get(id) ?? []), row]);
    }
  }

  // Edit existing stories (criterion replaces before adds so AC labels still mean what the review saw).
  const epicChanged = new Set();
  let next = stories.map((s) => {
    const list = edits.get(s.id);
    if (!list) return s;
    // Labels mean what the review saw: replace first, then removes from the last criterion up, then adds.
    const rank = (r) => (r.action === 'replace' ? 0 : r.action === 'remove' ? 1 : 2);
    const label = (r) => Number(AC_NUMBER.exec(r.suggested)?.[1] ?? 0);
    const ordered = [...list].sort((a, b) => rank(a) - rank(b) || (rank(a) === 1 ? label(b) - label(a) : 0));
    let out = s;
    for (const row of ordered) {
      out = editExisting(out, row);
      if (row.field === 'Epic') epicChanged.add(s.id);
    }
    return out;
  });

  // Create the new stories (they take the Epic and Feature of the story the group narrows).
  const created = new Map(); // group|NEW-n -> story
  const original = next.find((s) => s.id === anchorId);
  for (const [key, { rows: newRows }] of newGroups) {
    const fields = newRows.filter((r) => r.field !== 'Depends On');
    const s = buildNewStory(headers, fields, original);
    created.set(key, s);
    next = [...next, s];
  }

  next = commitEpics(next, epicChanged);
  next = renumber(next);

  // Depends On last, once every story has its final code. Targets are resolved by story, not by old code.
  const codeOf = (id) => next.find((s) => s.id === id)?.code ?? '';
  const links = [...depRows];
  for (const [key, { rows: newRows }] of newGroups) {
    for (const r of newRows.filter((x) => x.field === 'Depends On')) {
      links.push({ from: created.get(key).id, action: 'add', target: r.suggested, group: r.group });
    }
  }
  const resolved = links.map((l) => ({
    ...l,
    targetId: NEW_ID.test(l.target) ? created.get(`${l.group}|${l.target}`)?.id : idOf(l.target),
  }));
  // Existing codes may have changed in the renumber above, so look targets up by story id captured before.
  for (const l of resolved) {
    const fromCode = codeOf(l.from);
    const toCode = codeOf(l.targetId);
    if (!fromCode || !toCode) return { error: 'Cannot apply: a dependency needs both stories to have an ID (set their Epic).' };
    if (l.action === 'add') {
      if (wouldCycle(next, fromCode, toCode)) return { error: `Cannot apply: ${fromCode} depending on ${toCode} would create a dependency cycle.` };
      next = next.map((s) => (s.id === l.from && !s.dependsOn.includes(toCode) ? { ...s, dependsOn: [...s.dependsOn, toCode] } : s));
    } else {
      next = next.map((s) => (s.id === l.from ? { ...s, dependsOn: s.dependsOn.filter((c) => c !== toCode), ambiguous: s.ambiguous.filter((c) => c !== toCode) } : s));
    }
  }
  return { stories: next, createdIds: [...created.values()].map((s) => s.id) };
}

// The story a unit is shown on: the story of its first row that edits an existing story (a split group is shown
// on the story it narrows). undefined for a unit that only creates stories.
export const unitStoryCode = (unit) => unit.rows.find((r) => r.action !== 'add-story')?.storyId;

// Open suggestions per story code (stale ones do not count; ones held back by a lock and open unlock rows do). A group counts once.
export function openCounts(rows, stories) {
  const counts = new Map();
  for (const unit of unitsOf(rows)) {
    const code = unitStoryCode(unit);
    if (!code || unitState(unit, stories).state === 'stale') continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
}

// The open units (applicable or stale) shown on a story code: what moving the story away leaves without a target.
// Applied and dismissed rows are not units. Dismiss them with `indexes`.
export const openUnitsFor = (rows, code) => unitsOf(rows).filter((u) => code && unitStoryCode(u) === code);

// Open rows follow their story when IDs are recomputed: `recoded` maps old code -> new code. Applied and dismissed rows
// are history and stay as written. Depends On rows also name other stories, in Current and Suggested.
// Same array when nothing changes.
export function retargetRows(rows, recoded) {
  const to = (code) => (recoded.has(code) ? recoded.get(code) : code);
  const list = (text) => String(text).split(';').map((c) => to(c.trim())).join(';');
  let changed = false;
  const out = rows.map((r) => {
    if (r.status !== 'open') return r;
    const next = { ...r, storyId: to(r.storyId) };
    if (r.field === 'Depends On') {
      next.current = list(r.current);
      next.suggested = list(r.suggested);
    }
    if (next.storyId === r.storyId && next.current === r.current && next.suggested === r.suggested) return r;
    changed = true;
    return next;
  });
  return changed ? out : rows;
}

// Units whose story is not in the backlog any more (renumbered, moved or deleted): shown as stale in one place.
export function orphanUnits(rows, stories) {
  const codes = new Set(stories.map((s) => s.code).filter(Boolean));
  return unitsOf(rows).filter((u) => !codes.has(unitStoryCode(u)));
}

// The Review tab: open suggestions grouped by Area (in backlog order within an Area), and a separate list of the
// ones that are out of date (stale, or their story is gone). Every unit still has its row indexes for Dismiss.
export function reviewOverview(rows, stories) {
  const order = new Map();
  stories.forEach((s, i) => {
    if (s.code && !order.has(s.code)) order.set(s.code, i);
  });
  const sections = AREAS.map((area) => ({ area, units: [] }));
  const outOfDate = [];
  for (const unit of unitsOf(rows)) {
    const code = unitStoryCode(unit);
    const state = order.has(code) ? unitState(unit, stories) : { state: 'stale', why: `${code ?? 'the story'} no longer exists or was renumbered` };
    if (state.state === 'stale') {
      outOfDate.push(unit);
      continue;
    }
    const section = sections.find((s) => s.area === unit.rows[0].area) ?? sections[0];
    section.units.push(unit);
  }
  const rank = (u) => order.get(unitStoryCode(u)) ?? Infinity;
  const byStory = (a, b) => rank(a) - rank(b) || a.indexes[0] - b.indexes[0];
  sections.forEach((s) => s.units.sort(byStory));
  const openCount = sections.reduce((n, s) => n + s.units.length, 0);
  return { sections, outOfDate, openCount };
}
