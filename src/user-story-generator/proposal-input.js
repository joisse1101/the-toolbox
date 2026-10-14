// Turns drafted stories (the JSON the propose-stories skill sends to write-proposal.mjs) into proposed stories.
// Pure: no file access. `backlog` and `proposals` are loadBacklog results (`proposals` is null when the file does not
// exist yet). The rules for the story text come from guidelines/product-backlog.md; this only checks that the
// cells will be stored in the formats the portal reads.

import { newStory } from './model.js';
import { nextPlaceholder } from './proposals.js';
import { backlogProblems } from './ids.js';
import { parseStory, parseCriteria } from '../shared/story-text.js';

const KEYS = ['epic', 'feature', 'title', 'userStory', 'points', 'dependsOn', 'criteria', 'notes'];
const REQUIRED = KEYS.filter((k) => k !== 'notes');
const POINTS = [1, 2, 3, 5, 8, 13];
const SPLIT_ABOVE = 13;
const LINE_BREAK = /[\r\n]/;

const isBlank = (v) => !String(v ?? '').trim();

// Checks one story's own fields. Returns { errors, fields } where fields holds the cleaned values.
function checkFields(raw) {
  const errors = [];
  const fields = {};

  for (const key of Object.keys(raw)) {
    if (!KEYS.includes(key)) errors.push(`has the unknown key "${key}" (allowed: ${KEYS.join(', ')})${key === 'priority' ? '; Priority is not set by the skills' : ''}`);
  }
  for (const key of REQUIRED) {
    if (!(key in raw)) errors.push(`is missing the key "${key}"`);
  }

  for (const [key, label] of [['epic', 'Epic'], ['feature', 'Feature'], ['title', 'Title']]) {
    if (!(key in raw)) continue;
    const v = raw[key];
    if (typeof v !== 'string' || isBlank(v)) errors.push(`has no ${label}`);
    else if (LINE_BREAK.test(v)) errors.push(`${label} must be on one line`);
    else fields[key] = v.trim();
  }

  if ('notes' in raw) {
    if (typeof raw.notes !== 'string') errors.push('Notes must be text');
    else if (LINE_BREAK.test(raw.notes)) errors.push('Notes must be on one line');
    else fields.notes = raw.notes.trim();
  }

  if ('userStory' in raw) {
    const text = raw.userStory;
    if (typeof text !== 'string' || LINE_BREAK.test(text)) errors.push('User Story must be one line of text: "As a …, I want …, so that …"');
    else {
      const us = parseStory(text);
      if (!us.ok || isBlank(us.asA) || isBlank(us.iWant) || isBlank(us.soThat)) {
        errors.push('User Story does not follow "As a …, I want …, so that …"');
      } else {
        fields.asA = us.asA;
        fields.iWant = us.iWant;
        fields.soThat = us.soThat;
      }
    }
  }

  if ('points' in raw) {
    const n = typeof raw.points === 'string' && /^\d+$/.test(raw.points.trim()) ? Number(raw.points.trim()) : raw.points;
    if (!Number.isInteger(n)) errors.push('Sprint points must be one of 1, 2, 3, 5, 8, 13');
    else if (n > SPLIT_ABOVE) errors.push(`Sprint points ${n} is above ${SPLIT_ABOVE}: stories above ${SPLIT_ABOVE} points are split into smaller stories`);
    else if (!POINTS.includes(n)) errors.push(`Sprint points ${n} is not one of 1, 2, 3, 5, 8, 13`);
    else fields.points = String(n);
  }

  if ('criteria' in raw) {
    const list = raw.criteria;
    if (!Array.isArray(list) || !list.length || list.some((c) => typeof c !== 'string')) {
      errors.push('Acceptance criteria must be a list of at least one "AC<n>: Given …, when …, then …" text');
    } else if (list.some((c) => LINE_BREAK.test(c))) {
      errors.push('each acceptance criterion must be on one line');
    } else {
      const ac = parseCriteria(list.join('\n'));
      const bad = ac.ok ? ac.criteria.findIndex((c) => isBlank(c.given) || isBlank(c.when) || isBlank(c.then)) : -1;
      if (!ac.ok || ac.criteria.length !== list.length || bad >= 0) {
        errors.push('an acceptance criterion does not follow "AC<n>: Given …, when …, then …"');
      } else fields.criteria = ac.criteria;
    }
  }

  if ('dependsOn' in raw && (!Array.isArray(raw.dependsOn) || raw.dependsOn.some((d) => typeof d !== 'string'))) {
    errors.push('Depends On must be a list of IDs');
  }
  return { errors, fields };
}

// Returns { ok: true, stories, ids } (the new stories in input order, `ids` their placeholders) or
// { ok: false, errors } with every problem found, each naming its story by position.
export function buildProposals({ input, backlog, proposals = null }) {
  if (!Array.isArray(input) || !input.length) {
    return { ok: false, errors: ['The input must be a JSON list with at least one story.'] };
  }
  const errors = [];
  const fail = (i, msg) => errors.push(`Story ${i + 1} ${msg}`);

  const checked = input.map((raw, i) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      fail(i, 'must be an object');
      return null;
    }
    const { errors: own, fields } = checkFields(raw);
    own.forEach((e) => fail(i, e));
    return { raw, fields };
  });

  const headers = proposals ? proposals.headers : backlog.headers;
  const existing = proposals ? proposals.stories : [];
  const start = Number(/^NEW-(\d+)$/.exec(nextPlaceholder(existing, backlog.stories))[1]);
  const ids = input.map((_, i) => `NEW-${start + i}`);
  const backlogCodes = new Set(backlog.stories.map((s) => s.code).filter(Boolean));
  const proposedCodes = new Set(existing.map((s) => s.code).filter(Boolean));

  // Resolve each Depends On entry to the code it will be stored as.
  const resolved = checked.map((c, i) => {
    if (!c || !Array.isArray(c.raw.dependsOn) || c.raw.dependsOn.some((d) => typeof d !== 'string')) return [];
    const deps = [];
    for (const entry of c.raw.dependsOn.map((d) => d.trim())) {
      let code;
      const batch = /^NEW-(\d+)$/.exec(entry);
      const proposed = /^proposed:(NEW-\d+)$/.exec(entry);
      if (batch) {
        const k = Number(batch[1]);
        if (k < 1 || k > input.length) {
          fail(i, `Depends On lists ${entry}, but the input has only ${input.length} stor${input.length === 1 ? 'y' : 'ies'} (use proposed:${entry} for a story already in the proposals file)`);
          continue;
        }
        if (k === i + 1) {
          fail(i, 'Depends On lists the story itself');
          continue;
        }
        code = ids[k - 1];
      } else if (proposed) {
        code = proposed[1];
        if (!proposedCodes.has(code)) {
          fail(i, `Depends On lists ${entry}, but the proposals file has no ${code}`);
          continue;
        }
      } else if (backlogCodes.has(entry)) {
        code = entry;
      } else {
        fail(i, `Depends On lists ${entry || '(empty)'}, which is not a story in the backlog`);
        continue;
      }
      if (deps.includes(code)) fail(i, `Depends On lists ${entry} more than once`);
      else deps.push(code);
    }
    return deps;
  });

  if (errors.length) return { ok: false, errors };

  const stories = checked.map(({ fields }, i) => {
    const s = newStory(headers);
    return Object.assign(s, {
      code: ids[i],
      epic: fields.epic,
      codedEpic: fields.epic,
      feature: fields.feature,
      title: fields.title,
      asA: fields.asA,
      iWant: fields.iWant,
      soThat: fields.soThat,
      points: fields.points,
      notes: fields.notes ?? '',
      criteria: fields.criteria,
      dependsOn: resolved[i],
    });
  });

  // Cycles can only run through the new stories; report them by position.
  const mine = new Map(stories.map((s, i) => [s.id, i]));
  for (const [id, msgs] of backlogProblems([...backlog.stories, ...existing, ...stories])) {
    if (mine.has(id) && msgs.some((m) => m.includes('cycle'))) fail(mine.get(id), 'Depends On is part of a dependency cycle');
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, stories, ids };
}
