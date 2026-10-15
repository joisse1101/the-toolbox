// Turns drafted stories (the JSON the propose-stories skill sends to write-proposal.mjs) into proposed stories.
// Pure: no file access. `backlog` and `proposals` are loadBacklog results (`proposals` is null when the file does not
// exist yet). The rules for the story text come from ai/guidelines/product-backlog.md; this only checks that the
// cells will be stored in the formats the portal reads.

import { newStory } from './model.js';
import { nextPlaceholder } from './proposals.js';
import { backlogProblems } from './ids.js';
import { parseStory, parseCriteria, composeStory, composeCriteria } from './story-text.js';

const KEYS = ['epic', 'feature', 'title', 'userStory', 'points', 'dependsOn', 'criteria', 'notes'];
const REQUIRED = KEYS.filter((k) => k !== 'notes');
const POINTS = [1, 2, 3, 5, 8, 13];
const SPLIT_ABOVE = 13;
const LINE_BREAK = /[\r\n]/;

const isBlank = (v) => !String(v ?? '').trim();

// Checks one story's own fields. Returns { errors, fields } where fields holds the cleaned values. `skip` lists
// required keys that are left out on purpose (a patch that keeps a stored cell it cannot rebuild).
function checkFields(raw, skip = []) {
  const errors = [];
  const fields = {};

  for (const key of Object.keys(raw)) {
    if (!KEYS.includes(key)) errors.push(`has the unknown key "${key}" (allowed: ${KEYS.join(', ')})${key === 'priority' ? '; Priority is not set by the skills' : ''}`);
  }
  for (const key of REQUIRED) {
    if (!(key in raw) && !skip.includes(key)) errors.push(`is missing the key "${key}"`);
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

// A stored story in the shape the input uses, so a patch can be laid over it and the result checked like a new story.
// A User Story or Acceptance Criteria cell that did not parse has no input form: it is left out and reported by the caller.
function storedAsInput(stored) {
  return {
    epic: stored.epic,
    feature: stored.feature,
    title: stored.title,
    points: stored.points,
    notes: stored.notes,
    ...(stored.rawUserStory === null ? { userStory: composeStory(stored) } : {}),
    ...(stored.rawCriteria === null ? { criteria: composeCriteria(stored.criteria).split('\n').filter(Boolean) } : {}),
  };
}

// The stored story with only the fields the patch names replaced.
function applyPatch(stored, patch, fields) {
  const next = { ...stored };
  if ('epic' in patch) Object.assign(next, { epic: fields.epic, codedEpic: fields.epic });
  if ('userStory' in patch) Object.assign(next, { asA: fields.asA, iWant: fields.iWant, soThat: fields.soThat, rawUserStory: null });
  if ('criteria' in patch) Object.assign(next, { criteria: fields.criteria, rawCriteria: null });
  for (const key of ['feature', 'title', 'points', 'notes']) {
    if (key in patch) next[key] = fields[key];
  }
  return next;
}

// Returns { ok: true, stories, ids, proposed, patchedIds } (the new stories in input order with their placeholders, and the
// stored proposals with their patches applied) or { ok: false, errors } with every problem found, each naming its item
// by position. An item with an "id" is a patch of that proposed story; any other item is a new story.
export function buildProposals({ input, backlog, proposals = null }) {
  if (!Array.isArray(input) || !input.length) {
    return { ok: false, errors: ['The input must be a JSON list with at least one story or patch.'] };
  }
  const errors = [];
  const isObject = (raw) => !!raw && typeof raw === 'object' && !Array.isArray(raw);
  const isPatch = (raw) => isObject(raw) && 'id' in raw;
  const patchCode = (raw) => (typeof raw.id === 'string' ? raw.id.trim() : String(raw.id));
  const names = input.map((raw, i) => (isPatch(raw) ? `Patch ${i + 1} (${patchCode(raw)})` : `Story ${i + 1}`));
  const fail = (i, msg) => errors.push(`${names[i]} ${msg}`);

  const headers = proposals ? proposals.headers : backlog.headers;
  const existing = proposals ? proposals.stories : [];
  const storedByCode = new Map(existing.map((s) => [s.code, s]));
  const seenPatches = new Set();

  const checked = input.map((raw, i) => {
    if (!isObject(raw)) {
      fail(i, 'must be an object');
      return null;
    }
    if (!isPatch(raw)) {
      const { errors: own, fields } = checkFields(raw);
      own.forEach((e) => fail(i, e));
      return { raw, fields };
    }

    const { id, ...rest } = raw;
    const code = patchCode(raw);
    if (typeof id !== 'string' || !/^NEW-\d+$/.test(code)) {
      fail(i, 'id must be a proposed story ID like NEW-8');
      return null;
    }
    const stored = storedByCode.get(code);
    if (!stored) {
      fail(i, `names ${code}, but the proposals file has no ${code}`);
      return null;
    }
    if (seenPatches.has(code)) {
      fail(i, `patches ${code} again; one patch per story`);
      return null;
    }
    seenPatches.add(code);
    if (stored.benched) {
      fail(i, `names ${code}, which is benched; un-bench it in the portal first`);
      return null;
    }
    if (!Object.keys(rest).length) {
      fail(i, 'changes no field');
      return null;
    }

    const base = storedAsInput(stored);
    const skip = ['dependsOn'];
    for (const [key, cell] of [['userStory', 'User Story'], ['criteria', 'Acceptance Criteria']]) {
      if (!(key in base) && !(key in rest)) {
        fail(i, `leaves ${cell} as stored, but ${code}'s ${cell} cell is free text that does not follow the format; send ${key} to replace it`);
        skip.push(key);
      }
    }
    const { errors: own, fields } = checkFields({ ...base, dependsOn: [], ...rest }, skip);
    own.forEach((e) => fail(i, e));
    return { raw: rest, fields, stored };
  });

  const newCount = input.filter((raw) => !isPatch(raw)).length;
  const newOrdinal = []; // 1-based position among the new stories; 0 for a patch
  input.reduce((n, raw, i) => {
    newOrdinal[i] = isPatch(raw) ? 0 : n + 1;
    return isPatch(raw) ? n : n + 1;
  }, 0);
  const start = Number(/^NEW-(\d+)$/.exec(nextPlaceholder(existing, backlog.stories))[1]);
  const ids = Array.from({ length: newCount }, (_, k) => `NEW-${start + k}`);
  const backlogCodes = new Set(backlog.stories.map((s) => s.code).filter(Boolean));
  const proposedCodes = new Set(existing.map((s) => s.code).filter(Boolean));

  // Resolve each Depends On entry to the code it will be stored as. null: a patch that does not touch Depends On.
  const resolved = checked.map((c, i) => {
    if (!c) return [];
    if (!('dependsOn' in c.raw)) return c.stored ? null : [];
    if (!Array.isArray(c.raw.dependsOn) || c.raw.dependsOn.some((d) => typeof d !== 'string')) return [];
    const own = c.stored ? c.stored.code : null;
    const deps = [];
    for (const entry of c.raw.dependsOn.map((d) => d.trim())) {
      let code;
      const batch = /^NEW-(\d+)$/.exec(entry);
      const proposed = /^proposed:(NEW-\d+)$/.exec(entry);
      if (batch) {
        const k = Number(batch[1]);
        if (k < 1 || k > newCount) {
          fail(i, `Depends On lists ${entry}, but the input has only ${newCount} stor${newCount === 1 ? 'y' : 'ies'} (use proposed:${entry} for a story already in the proposals file)`);
          continue;
        }
        if (k === newOrdinal[i]) {
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
        if (code === own) {
          fail(i, 'Depends On lists the story itself');
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

  const stories = [];
  const patched = new Map();
  checked.forEach((c, i) => {
    if (c.stored) {
      const next = applyPatch(c.stored, c.raw, c.fields);
      if (resolved[i]) next.dependsOn = resolved[i];
      patched.set(c.stored.code, next);
      return;
    }
    const { fields } = c;
    stories.push(
      Object.assign(newStory(headers), {
        code: ids[newOrdinal[i] - 1],
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
      }),
    );
  });
  const proposed = existing.map((s) => patched.get(s.code) ?? s);

  // Cycles can only run through the new and patched stories; report them by position.
  const mine = new Map();
  checked.forEach((c, i) => mine.set(c.stored ? patched.get(c.stored.code).id : stories[newOrdinal[i] - 1].id, i));
  for (const [id, msgs] of backlogProblems([...backlog.stories, ...proposed, ...stories])) {
    if (mine.has(id) && msgs.some((m) => m.includes('cycle'))) fail(mine.get(id), 'Depends On is part of a dependency cycle');
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, stories, ids, proposed, patchedIds: [...patched.keys()] };
}
