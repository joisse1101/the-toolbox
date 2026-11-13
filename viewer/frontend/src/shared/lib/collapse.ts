// Which Epic and Feature groups of the story list are folded: pure, so the portal's hook and the tests share the rules.
// A group is named by its Epic (and Feature) name, never by a story ID (IDs shift on renumber), and the set holds the
// *closed* keys, so a group the set has never seen is open. `groups` is the result of `groupByEpic` (viewer/shared/backlog/model.js).

import type { EpicGroup } from '../../../../shared/backlog/model.ts';

export type Level = 'epic' | 'feature';
export const LEVELS: Level[] = ['epic', 'feature'];

const clean = (name: unknown) => String(name ?? '').trim();

export const epicKey = (epic: string) => `e:${epic}`;
export const featureKey = (epic: string, feature: string) => `f:${epic}\n${feature}`;

// The keys of one level ('epic' or 'feature') of every group, hidden ones included.
export function levelKeys(groups: readonly EpicGroup[], level: Level): string[] {
  return level === 'epic'
    ? groups.map((g) => epicKey(g.epic))
    : groups.flatMap((g) => g.features.map((f) => featureKey(g.epic, f.feature)));
}

export const allKeys = (groups: readonly EpicGroup[]) => new Set(LEVELS.flatMap((level) => levelKeys(groups, level)));

// True while at least one group of the level is open: the button then offers "Collapse", otherwise "Expand".
export const anyOpen = (closed: ReadonlySet<string>, groups: readonly EpicGroup[], level: Level) => levelKeys(groups, level).some((key) => !closed.has(key));

// Closes every group of the level when any is open, else opens them all. The other level is left as it is.
export function toggleLevel(closed: ReadonlySet<string>, groups: readonly EpicGroup[], level: Level): Set<string> {
  const keys = levelKeys(groups, level);
  const next = new Set(closed);
  if (anyOpen(closed, groups, level)) keys.forEach((key) => next.add(key));
  else keys.forEach((key) => next.delete(key));
  return next;
}

// Opens one Feature and the Epic that holds it and nothing else. Returns `closed` itself when both are open already.
export function reveal(closed: ReadonlySet<string>, epic: unknown, feature: unknown): ReadonlySet<string> {
  const keys = [epicKey(clean(epic)), featureKey(clean(epic), clean(feature))];
  if (!keys.some((key) => closed.has(key))) return closed;
  const next = new Set(closed);
  keys.forEach((key) => next.delete(key));
  return next;
}

// Forgets the keys of groups that are no longer in the backlog. Returns `closed` itself when none is stale.
export function pruneClosed(closed: ReadonlySet<string>, groups: readonly EpicGroup[]): ReadonlySet<string> {
  const present = allKeys(groups);
  const kept = [...closed].filter((key) => present.has(key));
  return kept.length === closed.size ? closed : new Set(kept);
}

// The set a stored string stands for: empty when it is missing, not JSON, or not a list of strings.
export function parseClosed(raw: unknown): Set<string> {
  if (typeof raw !== 'string') return new Set();
  try {
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? new Set(list.filter((key): key is string => typeof key === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export const serializeClosed = (closed: ReadonlySet<string>) => JSON.stringify([...closed]);
