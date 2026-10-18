// Story IDs and dependencies. Pure functions over the stories array, no DOM.
// A story ID is <PREFIX>-<NNNN>: the prefix comes from the epic, the number is the story's position among the
// stories of that epic in array (file) order. IDs are therefore derived: `renumber` recomputes every ID and rewrites
// `dependsOn` so each link keeps pointing at the same story. Stories are never mutated, changed ones are replaced.
//
// `codedEpic` is the epic the ID was last computed for. It follows `epic` only when the epic is committed
// (blur / suggestion chosen), so typing in the Epic field does not change IDs.

const epicKey = (s) => String(s.codedEpic ?? '').trim();
const liveEpic = (s) => String(s.epic ?? '').trim();
const words = (epic) => epic.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export function epicPrefix(epic) {
  return words(String(epic ?? '')).map((w) => w.slice(0, 1)).join('').toUpperCase();
}

// Prefix per epic key, in order of first occurrence. A prefix an earlier epic already holds is lengthened with
// letters of the first word, then of the later words, then a digit. `fixed` (epic key -> prefix) holds the prefixes
// that locked stories pin; they are taken first and kept as they are.
function prefixesFor(stories, fixed = new Map()) {
  const result = new Map(fixed);
  const taken = new Set(fixed.values());
  for (const s of stories) {
    const key = epicKey(s);
    if (!key || result.has(key)) continue;
    const base = epicPrefix(key);
    if (!base) {
      result.set(key, '');
      continue;
    }
    const w = words(key);
    const extra = (w[0].slice(1) + w.slice(1).map((x) => x.slice(1)).join('')).toUpperCase();
    let prefix = base;
    for (let k = 1; taken.has(prefix) && k <= extra.length; k++) prefix = base + extra.slice(0, k);
    for (let n = 2; taken.has(prefix); n++) prefix = base + n;
    taken.add(prefix);
    result.set(key, prefix);
  }
  return result;
}

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const CODE = /^(.+)-(\d+)$/;

// Locked stories whose code can stay: well-formed, unique, with an epic, and the epic's prefix not held by another
// epic. Returns Map(story -> { prefix, n }). The others lose the lock for numbering (hand-edited files).
function anchoredStories(stories) {
  const anchored = new Map();
  const prefixOfEpic = new Map();
  const epicOfPrefix = new Map();
  const codes = new Set();
  for (const s of stories) {
    if (!s.locked) continue;
    const m = CODE.exec(String(s.code ?? ''));
    const key = epicKey(s);
    if (!m || !key || codes.has(s.code)) continue;
    const prefix = m[1];
    if (prefixOfEpic.has(key) ? prefixOfEpic.get(key) !== prefix : epicOfPrefix.has(prefix)) continue;
    prefixOfEpic.set(key, prefix);
    epicOfPrefix.set(prefix, key);
    codes.add(s.code);
    anchored.set(s, { prefix, n: Number(m[2]) });
  }
  return { anchored, prefixOfEpic };
}

// Recompute all IDs and rewrite references. Returns the same array when nothing changed. A locked story keeps its
// code (its number is reserved), and its epic keeps the prefix written in it; the other stories take the lowest free
// numbers in order, so numbering may have gaps.
export function renumber(stories) {
  const { anchored, prefixOfEpic } = anchoredStories(stories);
  const prefixes = prefixesFor(stories, prefixOfEpic);
  const reserved = new Map(); // prefix -> numbers held by locked stories
  for (const { prefix, n } of anchored.values()) {
    if (!reserved.has(prefix)) reserved.set(prefix, new Set());
    reserved.get(prefix).add(n);
  }
  const counters = new Map();
  const codes = stories.map((s) => {
    if (anchored.has(s)) return s.code;
    const key = epicKey(s);
    const prefix = prefixes.get(key);
    if (!prefix) return '';
    const taken = reserved.get(prefix);
    let n = counters.get(key) ?? 0;
    do n++; while (taken?.has(n));
    counters.set(key, n);
    return `${prefix}-${String(n).padStart(4, '0')}`;
  });

  const oldCount = new Map();
  for (const s of stories) if (s.code) oldCount.set(s.code, (oldCount.get(s.code) ?? 0) + 1);
  const remap = new Map(); // old code -> new code ('' = the story no longer has an ID)
  stories.forEach((s, i) => {
    if (s.code && oldCount.get(s.code) === 1) remap.set(s.code, codes[i]);
  });

  let changed = false;
  const out = stories.map((s, i) => {
    const deps = [];
    for (const e of s.dependsOn) {
      const target = oldCount.get(e) > 1 || !remap.has(e) ? e : remap.get(e); // ambiguous or unknown entries stay
      if (target && !deps.includes(target)) deps.push(target);
    }
    const ambiguous = [...new Set([...s.ambiguous, ...deps.filter((e) => oldCount.get(e) > 1)])].filter((e) => deps.includes(e));
    const locked = anchored.has(s);
    if (s.code === codes[i] && s.locked === locked && same(s.dependsOn, deps) && same(s.ambiguous, ambiguous)) return s;
    changed = true;
    return { ...s, code: codes[i], locked, dependsOn: deps, ambiguous };
  });
  return changed ? out : stories;
}

// Put a story at the bottom of `epic`, or before `beforeId`, and make it belong to that epic. Dragging within the
// story's own epic only rearranges that epic's stories among the rows they already occupy, so other rows and the
// order of the groups do not move. Blank target epics and no-op moves return the same array.
export function moveStory(stories, id, epic, beforeId = null) {
  const s = stories.find((x) => x.id === id);
  const target = String(epic ?? '').trim();
  if (!s || s.locked || !target || beforeId === id) return stories; // a locked story stays where it is

  if (liveEpic(s) === target && epicKey(s) === target) {
    const slots = [];
    stories.forEach((x, i) => { if (liveEpic(x) === target) slots.push(i); });
    const group = slots.map((i) => stories[i]).filter((x) => x.id !== id);
    const at = beforeId === null ? -1 : group.findIndex((x) => x.id === beforeId);
    group.splice(at < 0 ? group.length : at, 0, s);
    if (group.every((x, k) => x === stories[slots[k]])) return stories;
    const next = stories.slice();
    slots.forEach((i, k) => { next[i] = group[k]; });
    return renumber(next);
  }

  const rest = stories.filter((x) => x.id !== id);
  let at = beforeId === null ? -1 : rest.findIndex((x) => x.id === beforeId);
  if (at < 0) {
    const last = rest.map((x) => liveEpic(x)).lastIndexOf(target);
    at = last < 0 ? rest.length : last + 1;
  }
  rest.splice(at, 0, { ...s, epic: target, codedEpic: target });
  return renumber(rest);
}

const liveFeature = (s) => String(s.feature ?? '').trim();

// Group the stories by `keyOf` in order of first appearance: [[key, stories]].
function groupBy(stories, keyOf) {
  const groups = new Map();
  for (const s of stories) {
    const key = keyOf(s);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  return [...groups];
}

// Move key `key` before `beforeKey` (null = last) in `keys`.
function reorderKeys(keys, key, beforeKey) {
  const rest = keys.filter((k) => k !== key);
  const at = beforeKey === null ? -1 : rest.indexOf(beforeKey);
  rest.splice(at < 0 ? rest.length : at, 0, key);
  return rest;
}

// The listed rows of `epic` refilled with `ordered`, so rows of other epics keep their positions.
function refillEpic(stories, epic, ordered) {
  let k = 0;
  return stories.map((s) => (liveEpic(s) === epic ? ordered[k++] : s));
}

// Move a whole group as one block: { epic } before the epic `beforeKey`, or { epic, feature } before the feature
// `beforeKey` of the same epic (null = last). Stories keep their relative order inside the group. An epic move gathers
// the rows of every epic into blocks; a feature move only rearranges the rows its epic already occupies. The group
// order unchanged, a blank epic or an unknown group or target returns the same array. A locked story moves with its group.
export function moveGroup(stories, group, beforeKey = null) {
  const epic = String(group.epic ?? '').trim();
  if (!epic) return stories;
  const target = beforeKey === null ? null : String(beforeKey).trim();

  if (group.feature === undefined) {
    const epics = groupBy(stories, liveEpic);
    const keys = epics.map(([k]) => k);
    if (!keys.includes(epic) || (target !== null && (!keys.includes(target) || target === epic))) return stories;
    const order = reorderKeys(keys, epic, target);
    if (order.every((k, i) => k === keys[i])) return stories;
    const byEpic = new Map(epics);
    return renumber(order.flatMap((k) => byEpic.get(k)));
  }

  const feature = String(group.feature).trim();
  const features = groupBy(stories.filter((s) => liveEpic(s) === epic), liveFeature);
  const keys = features.map(([k]) => k);
  if (!keys.includes(feature) || (target !== null && (!keys.includes(target) || target === feature))) return stories;
  const order = reorderKeys(keys, feature, target);
  if (order.every((k, i) => k === keys[i])) return stories;
  const byFeature = new Map(features);
  return renumber(refillEpic(stories, epic, order.flatMap((k) => byFeature.get(k))));
}

// Put the rows of each feature together inside its epic, features in the order they are shown, then renumber.
// Other epics' rows keep their positions and a locked story keeps its ID. Same array when nothing changes.
export function gatherFeatures(stories) {
  let out = stories;
  for (const [epic, rows] of groupBy(stories, liveEpic)) {
    if (!epic) continue;
    const gathered = groupBy(rows, liveFeature).flatMap(([, group]) => group);
    if (gathered.some((s, i) => s !== rows[i])) out = refillEpic(out, epic, gathered);
  }
  return renumber(out);
}

// Old code -> new code of the stories (matched by id) whose ID changed between two versions of the list; a code that
// more than one story had is left out. Feeds the review rows, which follow their story (`retargetRows`).
export function recodedBetween(before, after) {
  const now = new Map(after.map((s) => [s.id, s.code]));
  const count = new Map();
  for (const s of before) if (s.code) count.set(s.code, (count.get(s.code) ?? 0) + 1);
  const recoded = new Map();
  for (const s of before) {
    if (s.code && count.get(s.code) === 1 && now.has(s.id) && now.get(s.id) !== s.code) recoded.set(s.code, now.get(s.id));
  }
  return recoded;
}

// The Epic field was left. A changed epic moves the story to the bottom of it; a blank one takes its ID away.
export function commitEpic(stories, id) {
  const s = stories.find((x) => x.id === id);
  if (!s || s.locked || liveEpic(s) === epicKey(s)) return stories; // the Epic of a locked story is read-only
  if (!liveEpic(s)) return renumber(stories.map((x) => (x === s ? { ...s, codedEpic: '' } : x)));
  return moveStory(stories, id, s.epic, null);
}

// Commit the epic of every listed story, in array order (after a bulk epic change).
export function commitEpics(stories, ids) {
  let out = stories;
  for (const s of stories) if (ids.has(s.id)) out = commitEpic(out, s.id);
  return out;
}

export function removeStory(stories, id) {
  const s = stories.find((x) => x.id === id);
  if (!s || s.locked) return stories; // unlock it first
  const unique = s.code && stories.filter((x) => x.code === s.code).length === 1;
  const rest = stories
    .filter((x) => x.id !== id)
    .map((x) => (unique && x.dependsOn.includes(s.code) ? { ...x, dependsOn: x.dependsOn.filter((e) => e !== s.code) } : x));
  return renumber(rest);
}

// Remove the listed stories, except locked ones (unlock them first). Their codes leave every Depends On, then the rest
// is renumbered once. Returns the new list and how many listed stories were locked and kept. Same array when none is removed.
export function removeStories(stories, ids) {
  const listed = stories.filter((s) => ids.has(s.id));
  const gone = new Set(listed.filter((s) => !s.locked).map((s) => s.id));
  const skipped = listed.length - gone.size;
  if (!gone.size) return { stories, skipped };
  const stripped = new Set(
    stories.filter((s) => gone.has(s.id) && s.code && stories.filter((x) => x.code === s.code).length === 1).map((s) => s.code),
  );
  const rest = stories
    .filter((s) => !gone.has(s.id))
    .map((s) => (s.dependsOn.some((c) => stripped.has(c)) ? { ...s, dependsOn: s.dependsOn.filter((c) => !stripped.has(c)) } : s));
  return { stories: renumber(rest), skipped };
}

// Lock or unlock the listed stories. Only a story with an ID can be locked. Returns the new list and how many
// stories were skipped (no ID when locking). Same array when nothing changes.
function setLocked(stories, ids, locked) {
  let skipped = 0;
  let changed = false;
  const out = stories.map((s) => {
    if (!ids.has(s.id) || Boolean(s.locked) === locked) return s;
    if (locked && !s.code) {
      skipped++;
      return s;
    }
    changed = true;
    return { ...s, locked };
  });
  return { stories: changed ? out : stories, skipped };
}

export const lockStories = (stories, ids) => setLocked(stories, ids, true);
export const unlockStories = (stories, ids) => setLocked(stories, ids, false);

export const dependentsOf = (stories, code) => (code ? stories.filter((s) => s.dependsOn.includes(code)) : []);

function reaches(stories, from, to) {
  const byCode = new Map(stories.filter((s) => s.code).map((s) => [s.code, s]));
  const seen = new Set();
  const stack = [from];
  while (stack.length) {
    const c = stack.pop();
    if (c === to) return true;
    if (seen.has(c)) continue;
    seen.add(c);
    stack.push(...(byCode.get(c)?.dependsOn ?? []));
  }
  return false;
}

// Would "from depends on to" close a cycle?
export const wouldCycle = (stories, from, to) => from === to || reaches(stories, to, from);

// Stories the open story may still depend on.
export function dependencyChoices(stories, story) {
  if (!story.code) return [];
  return stories.filter((o) => o.code && o.id !== story.id && !story.dependsOn.includes(o.code) && !wouldCycle(stories, story.code, o.code));
}

// Advisory warnings from dependency data: Map(story.id -> messages).
export function backlogProblems(stories) {
  const codes = new Set(stories.map((s) => s.code).filter(Boolean));
  const problems = new Map();
  for (const s of stories) {
    const msgs = [];
    for (const e of s.dependsOn) {
      if (s.code && e === s.code) msgs.push('Depends On lists the story itself');
      else if (!codes.has(e)) {
        msgs.push(/^NEW-\d+$/.test(e) ? `Depends On lists ${e}, a story that is still proposed` : `Depends On lists ${e}, which does not exist`);
      }
      else if (s.ambiguous.includes(e)) msgs.push(`Depends On lists ${e}, which more than one story had in the file: check that it points at the right story`);
    }
    if (s.code && s.dependsOn.some((e) => e !== s.code && reaches(stories, e, s.code))) msgs.push('Depends On is part of a dependency cycle');
    if (msgs.length) problems.set(s.id, msgs);
  }
  return problems;
}
