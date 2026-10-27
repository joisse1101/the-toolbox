// Turns drafted stories (the JSON the propose-stories skill sends to write-proposal.mjs) into proposed stories.
// Pure: no file access. `backlog` and `proposals` are loadBacklog results (`proposals` is null when the file does not
// exist yet). The rules for the story text come from planner/guidelines/product-backlog.md; this only checks that the
// cells will be stored in the formats the portal reads.

import { newStory } from '../../../planner/logic/backlog/model.js';
import { nextPlaceholder } from '../../../planner/logic/backlog/proposals.js';
import { backlogProblems } from '../../../planner/logic/backlog/ids.js';
import { resolveStoryRef } from '../../../planner/logic/backlog/story-ref.js';
import { parseStory, roleIsBlank, parseCriteria, composeStory, composeCriteria } from '../../../planner/logic/backlog/story-text.js';

// A Depends On entry is an ID, or { id, title } (the Title of the backlog or proposed story it names); null when it is neither.
const depEntry = (d) => {
  if (typeof d === 'string') return { id: d.trim() };
  const ok = d && typeof d === 'object' && !Array.isArray(d) && typeof d.id === 'string' && (d.title === undefined || typeof d.title === 'string');
  return ok ? { id: d.id.trim(), title: d.title } : null;
};

const KEYS = ['epic', 'feature', 'title', 'userStory', 'points', 'dependsOn', 'criteria', 'notes', 'clarifications'];
const REQUIRED = KEYS.filter((k) => k !== 'notes' && k !== 'clarifications');
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
    else fields.notes = raw.notes.replace(/\r\n?/g, '\n').trim();
  }

  if ('userStory' in raw) {
    const text = raw.userStory;
    if (typeof text !== 'string' || LINE_BREAK.test(text)) errors.push('User Story must be one line of text: "As a …, I want …, so that …" ("As an …" is accepted)');
    else {
      const us = parseStory(text);
      if (!us.ok || roleIsBlank(us.asA) || isBlank(us.iWant) || isBlank(us.soThat)) {
        errors.push('User Story does not follow "As a …, I want …, so that …" ("As an …" is accepted)');
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

  if ('dependsOn' in raw && (!Array.isArray(raw.dependsOn) || raw.dependsOn.some((d) => !depEntry(d)))) {
    errors.push('Depends On must be a list of IDs, or of { id, title } objects');
  }
  return { errors, fields };
}

const isQuestionList = (v) => Array.isArray(v) && v.every((q) => typeof q === 'string' && !isBlank(q) && !LINE_BREAK.test(q));
const numbered = (stored) => stored.clarifications.filter((p) => !isBlank(p.q) || !isBlank(p.a)); // pair n = position n, as stored

// The `clarifications` key. A new story (stored = null) sends a list of questions; a patch sends { add, answer, resolve }:
// `add` questions appended after the stored pairs, `answer` a list of { n, text } for stored pairs whose answer is empty,
// `resolve` a list of { n, note } that moves a stored pair (answered or not) into Notes. Never deletes a pair except
// through `resolve`, and never changes an answer. n is the number of the pair as stored before the patch.
// Returns { errors, add, answer, resolve } (add: trimmed questions, answer: Map n -> text, resolve: Map n -> note).
function checkClarifications(value, stored) {
  const errors = [];
  const add = [];
  const answer = new Map();
  const resolve = new Map();
  const QUESTIONS = 'a list of questions, each one line of text';
  if (!stored) {
    if (!isQuestionList(value)) errors.push(`clarifications must be ${QUESTIONS}`);
    else add.push(...value.map((q) => q.trim()));
    return { errors, add, answer, resolve };
  }
  if (stored.rawClarifications !== null) {
    errors.push('cannot change clarifications: the stored cell is free text that does not follow "Q<n>: …" / "A<n>: …"; edit it in the portal');
    return { errors, add, answer, resolve };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('clarifications must be { "add": [questions], "answer": [{ "n": 1, "text": "…" }], "resolve": [{ "n": 1, "note": "…" }] }');
    return { errors, add, answer, resolve };
  }
  for (const key of Object.keys(value)) {
    if (!['add', 'answer', 'resolve'].includes(key)) errors.push(`clarifications has the unknown key "${key}" (allowed: add, answer, resolve)`);
  }
  if ('add' in value) {
    if (!isQuestionList(value.add)) errors.push(`clarifications.add must be ${QUESTIONS}`);
    else add.push(...value.add.map((q) => q.trim()));
  }
  const pairs = numbered(stored);
  if ('answer' in value) {
    if (!Array.isArray(value.answer)) errors.push('clarifications.answer must be a list of { "n": 1, "text": "…" }');
    else {
      for (const item of value.answer) {
        const n = item && typeof item === 'object' ? item.n : undefined;
        if (!Number.isInteger(n) || typeof item.text !== 'string' || isBlank(item.text) || LINE_BREAK.test(item.text)) {
          errors.push('each clarifications.answer item must be { "n": pair number, "text": one line of text }');
        } else if (n < 1 || n > pairs.length) {
          errors.push(`clarifications.answer names pair ${n}, but the story has ${pairs.length} pair${pairs.length === 1 ? '' : 's'}`);
        } else if (!isBlank(pairs[n - 1].a)) {
          errors.push(`clarifications.answer names pair ${n}, which already has an answer; existing answers are not changed`);
        } else if (answer.has(n)) {
          errors.push(`clarifications.answer answers pair ${n} more than once`);
        } else answer.set(n, item.text.trim());
      }
    }
  }
  if ('resolve' in value) {
    if (!Array.isArray(value.resolve)) errors.push('clarifications.resolve must be a list of { "n": 1, "note": "…" }');
    else {
      for (const item of value.resolve) {
        const n = item && typeof item === 'object' ? item.n : undefined;
        if (!Number.isInteger(n) || typeof item.note !== 'string' || isBlank(item.note)) {
          errors.push('each clarifications.resolve item must be { "n": pair number, "note": the decision to add to Notes }');
        } else if (n < 1 || n > pairs.length) {
          errors.push(`clarifications.resolve names pair ${n}, but the story has ${pairs.length} pair${pairs.length === 1 ? '' : 's'}`);
        } else if (resolve.has(n)) {
          errors.push(`clarifications.resolve resolves pair ${n} more than once`);
        } else if (answer.has(n)) {
          errors.push(`clarifications names pair ${n} in both answer and resolve; resolve alone moves the decision into Notes`);
        } else resolve.set(n, item.note.replace(/\r\n?/g, '\n').trim());
      }
    }
  }
  if (!errors.length && !add.length && !answer.size && !resolve.size) errors.push('clarifications changes nothing');
  return { errors, add, answer, resolve };
}

// A stored story in the shape the input uses, so a patch can be laid over it and the result checked like a new story.
// A User Story or User Acceptance Criteria cell that did not parse has no input form: it is left out and reported by the caller.
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
function applyPatch(stored, patch, fields, clar) {
  const next = { ...stored };
  if (clar) {
    const pairs = numbered(stored)
      .map((p, i) => (clar.answer.has(i + 1) ? { ...p, a: clar.answer.get(i + 1) } : p))
      .filter((p, i) => !clar.resolve.has(i + 1));
    next.clarifications = [...pairs, ...clar.add.map((q) => ({ q, a: '' }))];
  }
  if ('epic' in patch) Object.assign(next, { epic: fields.epic, codedEpic: fields.epic });
  if ('userStory' in patch) Object.assign(next, { asA: fields.asA, iWant: fields.iWant, soThat: fields.soThat, rawUserStory: null });
  if ('criteria' in patch) Object.assign(next, { criteria: fields.criteria, rawCriteria: null });
  for (const key of ['feature', 'title', 'points', 'notes']) {
    if (key in patch) next[key] = fields[key];
  }
  // The decisions of resolved pairs go to the end of Notes, one per line, in the order the patch gives them.
  for (const note of clar?.resolve.values() ?? []) next.notes = next.notes.trim() ? `${next.notes.replace(/\s+$/, '')}\n${note}` : note;
  return next;
}

// Returns { ok: true, stories, ids, skipped, proposed, patchedIds } (the new stories that are added, in input order with
// their placeholders; the repeats of stored stories that were skipped; and the stored proposals with their patches applied) or { ok: false, errors } with every problem found, each naming its item
// by position. An item with an "id" is a patch of that proposed story; any other item is a new story.
export function buildProposals({ input, backlog, proposals = null, requireTitles = false }) {
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
  const refOf = (s) => ({ code: s.code, title: s.title, epic: s.epic, feature: s.feature, benched: s.benched });
  const proposedRefs = existing.map(refOf);
  const backlogRefs = backlog.stories.map(refOf);
  const seenPatches = new Set();

  const checked = input.map((raw, i) => {
    if (!isObject(raw)) {
      fail(i, 'must be an object');
      return null;
    }
    if (!isPatch(raw)) {
      const { errors: own, fields } = checkFields(raw);
      own.forEach((e) => fail(i, e));
      const clar = 'clarifications' in raw ? checkClarifications(raw.clarifications, null) : null;
      clar?.errors.forEach((e) => fail(i, e));
      return { raw, fields, clar };
    }

    const { id, storyTitle, ...rest } = raw;
    const code = patchCode(raw);
    if (typeof id !== 'string' || !/^NEW-\d+$/.test(code)) {
      fail(i, 'id must be a proposed story ID like NEW-8');
      return null;
    }
    const ref = resolveStoryRef(proposedRefs, { id: code, title: storyTitle }, { required: requireTitles, hint: 'the proposals section of read_context' });
    if (!ref.ok) {
      fail(i, ref.message);
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
    for (const [key, cell] of [['userStory', 'User Story'], ['criteria', 'User Acceptance Criteria']]) {
      if (!(key in base) && !(key in rest)) {
        fail(i, `leaves ${cell} as stored, but ${code}'s ${cell} cell is free text that does not follow the format; send ${key} to replace it`);
        skip.push(key);
      }
    }
    const { errors: own, fields } = checkFields({ ...base, dependsOn: [], ...rest }, skip);
    own.forEach((e) => fail(i, e));
    const clar = 'clarifications' in rest ? checkClarifications(rest.clarifications, stored) : null;
    clar?.errors.forEach((e) => fail(i, e));
    return { raw: rest, fields, stored, clar };
  });

  const newCount = input.filter((raw) => !isPatch(raw)).length;
  const newOrdinal = []; // 1-based position among the new stories; 0 for a patch
  input.reduce((n, raw, i) => {
    newOrdinal[i] = isPatch(raw) ? 0 : n + 1;
    return isPatch(raw) ? n : n + 1;
  }, 0);
  const start = Number(/^NEW-(\d+)$/.exec(nextPlaceholder(existing, backlog.stories))[1]);

  // A new story with the Epic, Feature and Title of a stored proposal is a repeat: it is skipped and reported with the ID it
  // matched, so a batch can be sent again after a doubtful write. Two equal keys in one input are an error.
  const keyOf = (v) => {
    const parts = [v.epic, v.feature, v.title].map((x) => (typeof x === 'string' ? x.trim().toLowerCase() : ''));
    return parts.every(Boolean) ? parts.join('') : null;
  };
  const storedByKey = new Map();
  for (const s of existing) {
    const key = keyOf(s);
    if (key && !storedByKey.has(key)) storedByKey.set(key, s.code);
  }
  const codeOf = []; // new story ordinal - 1 -> the code it has afterwards (added, or the stored story it repeats)
  const skipped = []; // { name, id }
  const addedAt = []; // input indexes of the stories that are added, in order
  const firstOfKey = new Map();
  input.forEach((raw, i) => {
    if (!isObject(raw) || isPatch(raw)) return;
    const key = keyOf(raw);
    if (key && firstOfKey.has(key)) {
      fail(i, `repeats ${names[firstOfKey.get(key)]} (same Epic, Feature and Title)`);
      return;
    }
    if (key) firstOfKey.set(key, i);
    if (key && storedByKey.has(key)) {
      codeOf[newOrdinal[i] - 1] = storedByKey.get(key);
      skipped.push({ name: names[i], id: storedByKey.get(key) });
      return;
    }
    codeOf[newOrdinal[i] - 1] = `NEW-${start + addedAt.length}`;
    addedAt.push(i);
  });
  const ids = addedAt.map((i) => codeOf[newOrdinal[i] - 1]);
  const backlogCodes = new Set(backlog.stories.map((s) => s.code).filter(Boolean));
  const proposedCodes = new Set(existing.map((s) => s.code).filter(Boolean));

  // Resolve each Depends On entry to the code it will be stored as. null: a patch that does not touch Depends On.
  const resolved = checked.map((c, i) => {
    if (!c) return [];
    if (!('dependsOn' in c.raw)) return c.stored ? null : [];
    if (!Array.isArray(c.raw.dependsOn) || c.raw.dependsOn.some((d) => !depEntry(d))) return [];
    const own = c.stored ? c.stored.code : null;
    const deps = [];
    for (const { id: entry, title } of c.raw.dependsOn.map(depEntry)) {
      let code;
      // A story that is already stored is named with its Title; a NEW-<k> of this input is a position and needs none.
      const named = (list, id, hint) => {
        const ref = resolveStoryRef(list, { id, title }, { required: requireTitles, key: 'title', hint });
        if (!ref.ok) fail(i, `Depends On: ${ref.message}`);
        return ref.ok;
      };
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
        code = codeOf[k - 1];
        if (!code) continue; // a repeat inside the input, already reported
      } else if (proposed) {
        code = proposed[1];
        if (!named(proposedRefs, code, 'the proposals section of read_context')) continue;
        if (!proposedCodes.has(code)) {
          fail(i, `Depends On lists ${entry}, but the proposals file has no ${code}`);
          continue;
        }
        if (code === own) {
          fail(i, 'Depends On lists the story itself');
          continue;
        }
      } else if (backlogCodes.has(entry) || title !== undefined) {
        if (!named(backlogRefs, entry, 'the index section of read_context')) continue;
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
    if (!c.stored && !addedAt.includes(i)) return; // skipped as a repeat
    if (c.stored) {
      const next = applyPatch(c.stored, c.raw, c.fields, c.clar);
      if (resolved[i]) next.dependsOn = resolved[i];
      patched.set(c.stored.code, next);
      return;
    }
    const { fields } = c;
    stories.push(
      Object.assign(newStory(headers), {
        code: codeOf[newOrdinal[i] - 1],
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
        clarifications: (c.clar?.add ?? []).map((q) => ({ q, a: '' })),
        dependsOn: resolved[i],
      }),
    );
  });
  const proposed = existing.map((s) => patched.get(s.code) ?? s);

  // Cycles can only run through the new and patched stories; report them by position.
  const mine = new Map();
  checked.forEach((c, i) => {
    if (c.stored) mine.set(patched.get(c.stored.code).id, i);
    else if (addedAt.includes(i)) mine.set(stories[addedAt.indexOf(i)].id, i);
  });
  for (const [id, msgs] of backlogProblems([...backlog.stories, ...proposed, ...stories])) {
    if (mine.has(id) && msgs.some((m) => m.includes('cycle'))) fail(mine.get(id), 'Depends On is part of a dependency cycle');
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, stories, ids, skipped, proposed, patchedIds: [...patched.keys()] };
}
