// Proposed stories: the pure logic behind the Proposed tab. No DOM.
// A proposals file has the backlog's columns, but its stories are identified by placeholder IDs `NEW-<n>` that are
// never derived from epic and position, so editing, moving or deleting a proposed story never changes its ID.
// Accepting moves stories into the backlog; `renumber` (ids.js) then gives them real IDs and rewrites every
// `Depends On` entry that named a placeholder now held by a story. Stories are never mutated.

import type { Proposal, Story } from '../types.ts';
import { renumber, backlogProblems, recodedBetween } from './ids.ts';

const PLACEHOLDER = /^NEW-(\d+)$/;

export const isPlaceholder = (code: string): boolean => PLACEHOLDER.test(code);

const liveEpic = (s: Story): string => String(s.epic ?? '').trim();

// The next free placeholder: one above every NEW-<n> the proposals use and every one the backlog still mentions in
// Depends On, so a number is never reused while anything refers to it (a reused number would be bound silently
// by `renumber` to the wrong story). A writer outside the portal must use the same rule.
export function nextPlaceholder(proposed: readonly Proposal[], backlog: readonly Story[] = []): string {
  let max = 0;
  const see = (code: string): void => {
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
export function removeProposed(stories: Proposal[], id: number): Proposal[] {
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
export function reorderProposed(stories: Proposal[], id: number, beforeId: number | null = null): Proposal[] {
  const s = stories.find((x) => x.id === id);
  if (!s || beforeId === id) return stories;
  const rest = stories.filter((x) => x.id !== id);
  const at = beforeId === null ? -1 : rest.findIndex((x) => x.id === beforeId);
  rest.splice(at < 0 ? rest.length : at, 0, s);
  return rest.every((x, i) => x === stories[i]) ? stories : rest;
}

// Drag in the list: the story joins `epic`, before `beforeId` or (null) after the last story of that epic, or at the
// end for a new epic. Array move only; the ID stays.
export function moveProposed(stories: Proposal[], id: number, epic: unknown, beforeId: number | null = null): Proposal[] {
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

const cycleIds = (stories: readonly Story[]): Set<number> => {
  const ids = new Set<number>();
  for (const [id, msgs] of backlogProblems(stories)) if (msgs.some((m) => m.includes('dependency cycle'))) ids.add(id);
  return ids;
};

// Move the proposed stories whose internal `id` is in `ids` into the backlog. Each goes after the last story of its
// Epic whatever its Feature (a new Epic starts at the end); several keep their order from the proposals file.
// A benched story is never accepted: the user un-benches it first. Open Clarifications do not block.
// `initials` are the backlog's. A story accepted into the backlog starts unfrozen.
// Returns { backlog, proposals, accepted } (accepted: the moved stories with their new IDs), or { error } and nothing moves.
export function acceptProposed(
  backlogStories: Story[],
  proposedStories: Proposal[],
  ids: ReadonlySet<number>,
  headers: readonly string[],
  initials: string,
): { backlog: Story[]; proposals: Proposal[]; accepted: Story[] } | { error: string } {
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
    return { ...s, frozen: false, epic, codedEpic: epic, cells, dependsOn: [...s.dependsOn], ambiguous: [...s.ambiguous] };
  });

  const placed = backlogStories.slice();
  for (const c of copies) {
    const last = placed.map(liveEpic).lastIndexOf(c.epic);
    placed.splice(last < 0 ? placed.length : last + 1, 0, c);
  }
  const backlog = renumber(placed, initials);

  const newCode = new Map<string, string>(); // placeholder -> real ID ('' when the Epic gives no prefix)
  const inBacklog = (id: number): Story => backlog.find((s) => s.id === id) as Story; // every copy was placed, so it is there
  for (const c of copies) newCode.set(c.code, inBacklog(c.id).code);

  const before = cycleIds(backlogStories);
  const cycle = [...cycleIds(backlog)].filter((id) => !before.has(id));
  if (cycle.length) {
    const names = cycle.map(inBacklog).map((s) => s.code || s.title.trim() || 'a story');
    return { error: `Accepting would create a dependency cycle (${names.join(', ')}). Nothing was moved.` };
  }

  const proposals = proposedStories
    .filter((s) => !ids.has(s.id))
    .map((s) => {
      if (!s.dependsOn.some((e) => newCode.has(e))) return s;
      const deps: string[] = [];
      for (const e of s.dependsOn) {
        const target = newCode.get(e) ?? e;
        if (target && !deps.includes(target)) deps.push(target);
      }
      return { ...s, dependsOn: deps, ambiguous: s.ambiguous.filter((e) => deps.includes(e)) };
    });

  return { backlog, proposals, accepted: copies.map((c) => inBacklog(c.id)) };
}

// Rewrite `Depends On` entries through `map` (old code -> new code); entries not in the map stay. Same array when nothing changes.
function relink(stories: readonly Story[], map: ReadonlyMap<string, string>): Story[] {
  return stories.map((s) => {
    if (!s.dependsOn.some((e) => map.has(e))) return s;
    const deps: string[] = [];
    for (const e of s.dependsOn) {
      const target = map.get(e) ?? e;
      if (target && !deps.includes(target)) deps.push(target);
    }
    return { ...s, dependsOn: deps, ambiguous: s.ambiguous.filter((e) => deps.includes(e)) };
  });
}

// The reverse of acceptProposed: take the backlog story `id` out of the backlog and append it to the proposals under
// a new placeholder. Links to it are rewritten to the placeholder first, so renumbering the backlog cannot bind them
// to whichever story takes its position; then the remaining backlog is renumbered and every link to a backlog story
// (the moved story's own, and the proposals') follows the new codes. A story without an ID and a frozen story cannot be moved. `initials` are the backlog's.
// Returns { backlog, proposals, moved, recoded } (recoded: old code -> new code of the backlog stories whose ID changed,
// '' when one lost its ID) or { error }.
export function moveToProposed(
  backlogStories: Story[],
  proposedStories: Proposal[],
  id: number,
  headers: readonly string[],
  initials: string,
): { backlog: Story[]; proposals: Proposal[]; moved: Proposal; recoded: Map<string, string> } | { error: string } {
  const story = backlogStories.find((s) => s.id === id);
  if (!story) return { error: 'The story is not in the backlog.' };
  if (!story.code) return { error: 'Give the story an Epic before moving it to Proposed.' };
  if (story.frozen) return { error: 'A frozen story cannot be moved to Proposed.' };

  const placeholder = nextPlaceholder(proposedStories, backlogStories);
  const toPlaceholder = new Map([[story.code, placeholder]]);
  const rest = relink(backlogStories.filter((s) => s.id !== id), toPlaceholder);
  const backlog = renumber(rest, initials);

  const newCode = new Map<string, string>(); // old backlog code -> code after the renumber ('' when the story lost its ID)
  rest.forEach((s, i) => {
    if (s.code && backlog[i].code !== s.code) newCode.set(s.code, backlog[i].code);
  });

  const cells = story.cells.slice(0, headers.length);
  while (cells.length < headers.length) cells.push('');
  const [moved] = relink([{ ...story, code: placeholder, cells, dependsOn: [...story.dependsOn], ambiguous: [...story.ambiguous] }], newCode);
  const proposals = [...relink(proposedStories, new Map([...toPlaceholder, ...newCode])), moved];
  return { backlog, proposals, moved, recoded: newCode };
}

export interface StoryList {
  stories: Story[];
  headers: string[];
}

const headerKey = (h: string): string => h.trim().toLowerCase();
const TEMP_CODE = (i: number): string => `\u0000migrating-${i}`; // cannot clash with a real ID

// Move the source stories whose internal `id` is in `ids` into the target backlog. `source` and `target` are the two
// story lists with their headers; the initials are each backlog's own. Frozen stories and stories without an ID are refused.
// The source loses the stories and is renumbered; its links to them are rewritten to their new target codes.
// Each copy goes after the last story of its Epic in the target, or at the end, and the target is renumbered.
// A copy keeps its `Depends On` exactly as it was (old source codes): the relink that follows the source's save rewrites
// them once, together with the target's other links to the source. Renumbering the target here would shift them twice.
// Returns { source, target, targetHeaders, forwards, recoded }: forwards is old source code -> new target code of each
// moved story, recoded the source's old -> new codes of the stories that stay. Or { error } and nothing moves.
export function migrateStories(args: {
  source: StoryList;
  target: StoryList;
  ids: ReadonlySet<number>;
  sourceInitials: string;
  targetInitials: string;
}): { source: Story[]; target: Story[]; targetHeaders: string[]; forwards: Map<string, string>; recoded: Map<string, string> } | { error: string } {
  const { source, target, ids, sourceInitials, targetInitials } = args;
  const chosen = source.stories.filter((s) => ids.has(s.id));
  if (!chosen.length) return { error: 'There is no story to migrate.' };
  const name = (s: Story): string => `${s.code || 'a story'}${s.title.trim() ? ` "${s.title.trim()}"` : ''}`;
  const noCode = chosen.filter((s) => !s.code);
  if (noCode.length) return { error: `Give ${noCode.map(name).join(', ')} an Epic before migrating ${noCode.length > 1 ? 'them' : 'it'}.` };
  const frozen = chosen.filter((s) => s.frozen);
  if (frozen.length) return { error: `${frozen.map(name).join(', ')} ${frozen.length > 1 ? 'are' : 'is'} frozen. A frozen story cannot be migrated.` };

  const targetHeaders = [...target.headers];
  const known = new Set(targetHeaders.map(headerKey));
  for (const h of source.headers) {
    if (!known.has(headerKey(h))) {
      known.add(headerKey(h));
      targetHeaders.push(h);
    }
  }
  const padded = (s: Story): Story => {
    if (s.cells.length >= targetHeaders.length) return s;
    const cells = s.cells.slice();
    while (cells.length < targetHeaders.length) cells.push('');
    return { ...s, cells };
  };

  // Copies carry no code while the target is renumbered, so that renumber leaves their links alone and gives them codes.
  let nextId = Math.max(0, ...source.stories.map((s) => s.id), ...target.stories.map((s) => s.id)) + 1;
  const sourceAt = new Map<string, number>();
  source.headers.forEach((h, i) => { if (!sourceAt.has(headerKey(h))) sourceAt.set(headerKey(h), i); });
  const copies = chosen.map((s) => {
    const epic = liveEpic(s);
    const cells = targetHeaders.map((h) => s.cells[sourceAt.get(headerKey(h)) ?? -1] ?? '');
    return { ...s, id: nextId++, code: '', frozen: false, epic, codedEpic: epic, cells, dependsOn: [...s.dependsOn], ambiguous: [...s.ambiguous] };
  });
  const placed = target.stories.map(padded);
  for (const c of copies) {
    const last = placed.map(liveEpic).lastIndexOf(c.epic);
    placed.splice(last < 0 ? placed.length : last + 1, 0, c);
  }
  const newTarget = renumber(placed, targetInitials);
  const newCode = new Map(newTarget.map((s) => [s.id, s.code] as const));
  const forwards = new Map(chosen.map((s, i) => [s.code, newCode.get(copies[i].id) ?? ''] as const));

  // Links to a moved story go through a temporary code, so the source's renumber cannot bind them to a story that
  // takes the moved story's number.
  const temp = new Map(chosen.map((s, i) => [s.code, TEMP_CODE(i)] as const));
  const rest = relink(source.stories.filter((s) => !ids.has(s.id)), temp);
  const renumbered = renumber(rest, sourceInitials);
  const toTarget = new Map(chosen.map((s, i) => [TEMP_CODE(i), forwards.get(s.code) as string] as const));
  const newSource = relink(renumbered, toTarget);

  return { source: newSource, target: newTarget, targetHeaders, forwards, recoded: recodedBetween(source.stories, newSource) };
}
