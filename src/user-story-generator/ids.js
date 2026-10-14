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
// letters of the first word, then of the later words, then a digit.
function prefixesFor(stories) {
  const result = new Map();
  const taken = new Set();
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

// Recompute all IDs and rewrite references. Returns the same array when nothing changed.
export function renumber(stories) {
  const prefixes = prefixesFor(stories);
  const counters = new Map();
  const codes = stories.map((s) => {
    const key = epicKey(s);
    const prefix = prefixes.get(key);
    if (!prefix) return '';
    const n = (counters.get(key) ?? 0) + 1;
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
    if (s.code === codes[i] && same(s.dependsOn, deps) && same(s.ambiguous, ambiguous)) return s;
    changed = true;
    return { ...s, code: codes[i], dependsOn: deps, ambiguous };
  });
  return changed ? out : stories;
}

// Put a story at the bottom of `epic`, or before `beforeId`, and make it belong to that epic. Dragging within the
// story's own epic only rearranges that epic's stories among the rows they already occupy, so other rows and the
// order of the groups do not move. Blank target epics and no-op moves return the same array.
export function moveStory(stories, id, epic, beforeId = null) {
  const s = stories.find((x) => x.id === id);
  const target = String(epic ?? '').trim();
  if (!s || !target || beforeId === id) return stories;

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

// The Epic field was left. A changed epic moves the story to the bottom of it; a blank one takes its ID away.
export function commitEpic(stories, id) {
  const s = stories.find((x) => x.id === id);
  if (!s || liveEpic(s) === epicKey(s)) return stories;
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
  if (!s) return stories;
  const unique = s.code && stories.filter((x) => x.code === s.code).length === 1;
  const rest = stories
    .filter((x) => x.id !== id)
    .map((x) => (unique && x.dependsOn.includes(s.code) ? { ...x, dependsOn: x.dependsOn.filter((e) => e !== s.code) } : x));
  return renumber(rest);
}

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
