// Proposed stories: the pure logic behind the Proposed tab. No DOM.
// A proposals file has the backlog's columns, but its stories are identified by placeholder IDs `NEW-<n>` that are
// never derived from epic and position, so editing, moving or deleting a proposed story never changes its ID.
// Accepting moves stories into the backlog; `renumber` (ids.js) then gives them real IDs and rewrites every
// `Depends On` entry that named a placeholder now held by a story. Stories are never mutated.

import { renumber, backlogProblems } from './ids.js';

const PLACEHOLDER = /^NEW-(\d+)$/;

export const isPlaceholder = (code) => PLACEHOLDER.test(code);

const liveEpic = (s) => String(s.epic ?? '').trim();

// The next free placeholder: one above every NEW-<n> the proposals use and every one the backlog still mentions in
// Depends On, so a number is never reused while anything refers to it (a reused number would be bound silently
// by `renumber` to the wrong story). A writer outside the portal must use the same rule.
export function nextPlaceholder(proposed, backlog = []) {
  let max = 0;
  const see = (code) => {
    const m = PLACEHOLDER.exec(code);
    if (m) max = Math.max(max, Number(m[1]));
  };
  for (const s of [...proposed, ...backlog]) {
    see(s.code);
    s.dependsOn.forEach(see);
    s.ambiguous.forEach(see);
  }
  return `NEW-${max + 1}`;
}

// Delete a proposed story and strip its placeholder from the other proposed stories. IDs are not recomputed.
export function removeProposed(stories, id) {
  const gone = stories.find((s) => s.id === id);
  if (!gone) return stories;
  return stories
    .filter((s) => s.id !== id)
    .map((s) => {
      if (!gone.code || !s.dependsOn.includes(gone.code)) return s;
      return { ...s, dependsOn: s.dependsOn.filter((e) => e !== gone.code), ambiguous: s.ambiguous.filter((e) => e !== gone.code) };
    });
}

// Array move: put the story before `beforeId`, or at the end when that is null or not found. IDs are not recomputed.
export function reorderProposed(stories, id, beforeId = null) {
  const s = stories.find((x) => x.id === id);
  if (!s || beforeId === id) return stories;
  const rest = stories.filter((x) => x.id !== id);
  const at = beforeId === null ? -1 : rest.findIndex((x) => x.id === beforeId);
  rest.splice(at < 0 ? rest.length : at, 0, s);
  return rest.every((x, i) => x === stories[i]) ? stories : rest;
}

// Drag in the list: the story joins `epic`, before `beforeId` or (null) after the last story of that epic, or at the
// end for a new epic. Array move only; the ID stays.
export function moveProposed(stories, id, epic, beforeId = null) {
  const s = stories.find((x) => x.id === id);
  const target = String(epic ?? '').trim();
  if (!s || !target || beforeId === id) return stories;
  if (beforeId === null && liveEpic(s) === target && s.codedEpic === target && stories.map(liveEpic).lastIndexOf(target) === stories.indexOf(s)) return stories;
  const rest = stories.filter((x) => x.id !== id);
  let at = beforeId === null ? -1 : rest.findIndex((x) => x.id === beforeId);
  if (at < 0) {
    const last = rest.map(liveEpic).lastIndexOf(target);
    at = last < 0 ? rest.length : last + 1;
  }
  const moved = liveEpic(s) === target && s.codedEpic === target ? s : { ...s, epic: target, codedEpic: target };
  rest.splice(at, 0, moved);
  return moved === s && rest.every((x, i) => x === stories[i]) ? stories : rest;
}

const cycleIds =(stories) => {
  const ids = new Set();
  for (const [id, msgs] of backlogProblems(stories)) if (msgs.some((m) => m.includes('dependency cycle'))) ids.add(id);
  return ids;
};

// Move the proposed stories whose internal `id` is in `ids` into the backlog. Each goes after the last story of its
// Epic whatever its Feature (a new Epic starts at the end); several keep their order from the proposals file.
// A benched story is never accepted: the user un-benches it first. Open Clarifications do not block.
// Returns { backlog, proposals, accepted } (accepted: the moved stories with their new IDs), or { error } and nothing moves.
export function acceptProposed(backlogStories, proposedStories, ids, headers) {
  const chosen = proposedStories.filter((s) => ids.has(s.id));
  if (!chosen.length) return { error: 'There is no proposed story to accept.' };
  const noEpic = chosen.filter((s) => !liveEpic(s));
  if (noEpic.length) {
    const names = noEpic.map((s) => `${s.code}${s.title.trim() ? ` "${s.title.trim()}"` : ''}`).join(', ');
    return { error: `Give ${names} an Epic before accepting ${noEpic.length > 1 ? 'them' : 'it'}.` };
  }

  const benched = chosen.filter((s) => s.benched);
  if (benched.length) {
    const names = benched.map((s) => `${s.code}${s.title.trim() ? ` "${s.title.trim()}"` : ''}`).join(', ');
    return { error: `${names} ${benched.length > 1 ? 'are' : 'is'} benched. Un-bench ${benched.length > 1 ? 'them' : 'it'} before accepting.` };
  }

  // Backlog-shaped copies. `code` stays the placeholder so renumber can find the links that name it.
  const copies = chosen.map((s) => {
    const epic = liveEpic(s);
    const cells = s.cells.slice(0, headers.length);
    while (cells.length < headers.length) cells.push('');
    return { ...s, locked: false, epic, codedEpic: epic, cells, dependsOn: [...s.dependsOn], ambiguous: [...s.ambiguous] };
  });

  const placed = backlogStories.slice();
  for (const c of copies) {
    const last = placed.map(liveEpic).lastIndexOf(c.epic);
    placed.splice(last < 0 ? placed.length : last + 1, 0, c);
  }
  const backlog = renumber(placed);

  const newCode = new Map(); // placeholder -> real ID ('' when the Epic gives no prefix)
  for (const c of copies) newCode.set(c.code, backlog.find((s) => s.id === c.id).code);

  const before = cycleIds(backlogStories);
  const cycle = [...cycleIds(backlog)].filter((id) => !before.has(id));
  if (cycle.length) {
    const names = cycle.map((id) => backlog.find((s) => s.id === id)).map((s) => s.code || s.title.trim() || 'a story');
    return { error: `Accepting would create a dependency cycle (${names.join(', ')}). Nothing was moved.` };
  }

  const proposals = proposedStories
    .filter((s) => !ids.has(s.id))
    .map((s) => {
      if (!s.dependsOn.some((e) => newCode.has(e))) return s;
      const deps = [];
      for (const e of s.dependsOn) {
        const target = newCode.has(e) ? newCode.get(e) : e;
        if (target && !deps.includes(target)) deps.push(target);
      }
      return { ...s, dependsOn: deps, ambiguous: s.ambiguous.filter((e) => deps.includes(e)) };
    });

  return { backlog, proposals, accepted: copies.map((c) => backlog.find((s) => s.id === c.id)) };
}

// Rewrite `Depends On` entries through `map` (old code -> new code); entries not in the map stay. Same array when nothing changes.
function relink(stories, map) {
  return stories.map((s) => {
    if (!s.dependsOn.some((e) => map.has(e))) return s;
    const deps = [];
    for (const e of s.dependsOn) {
      const target = map.has(e) ? map.get(e) : e;
      if (target && !deps.includes(target)) deps.push(target);
    }
    return { ...s, dependsOn: deps, ambiguous: s.ambiguous.filter((e) => deps.includes(e)) };
  });
}

// The reverse of acceptProposed: take the backlog story `id` out of the backlog and append it to the proposals under
// a new placeholder. Links to it are rewritten to the placeholder first, so renumbering the backlog cannot bind them
// to whichever story takes its position; then the remaining backlog is renumbered and every link to a backlog story
// (the moved story's own, and the proposals') follows the new codes. A story without an ID cannot be moved.
// Returns { backlog, proposals, moved, recoded } (recoded: old code -> new code of the backlog stories whose ID changed,
// '' when one lost its ID) or { error }.
export function moveToProposed(backlogStories, proposedStories, id, headers) {
  const story = backlogStories.find((s) => s.id === id);
  if (!story) return { error: 'The story is not in the backlog.' };
  if (!story.code) return { error: 'Give the story an Epic before moving it to Proposed.' };
  if (story.locked) return { error: 'Unlock the story before moving it to Proposed.' };

  const placeholder = nextPlaceholder(proposedStories, backlogStories);
  const toPlaceholder = new Map([[story.code, placeholder]]);
  const rest = relink(backlogStories.filter((s) => s.id !== id), toPlaceholder);
  const backlog = renumber(rest);

  const newCode = new Map(); // old backlog code -> code after the renumber ('' when the story lost its ID)
  rest.forEach((s, i) => {
    if (s.code && backlog[i].code !== s.code) newCode.set(s.code, backlog[i].code);
  });

  const cells = story.cells.slice(0, headers.length);
  while (cells.length < headers.length) cells.push('');
  const [moved] = relink([{ ...story, code: placeholder, cells, dependsOn: [...story.dependsOn], ambiguous: [...story.ambiguous] }], newCode);
  const proposals = [...relink(proposedStories, new Map([...toPlaceholder, ...newCode])), moved];
  return { backlog, proposals, moved, recoded: newCode };
}
