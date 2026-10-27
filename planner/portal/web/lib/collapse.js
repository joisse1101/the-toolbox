// Which Epic and Feature groups of the story list are folded: pure, so the portal's hook and the tests share the rules.
// A group is named by its Epic (and Feature) name, never by a story ID (IDs shift on renumber), and the set holds the
// *closed* keys, so a group the set has never seen is open. `groups` is the result of `groupByEpic` (planner/logic/backlog/model.js).

export const LEVELS = ['epic', 'feature'];

const clean = (name) => String(name ?? '').trim();

export const epicKey = (epic) => `e:${epic}`;
export const featureKey = (epic, feature) => `f:${epic}\n${feature}`;

// The keys of one level ('epic' or 'feature') of every group, hidden ones included.
export function levelKeys(groups, level) {
  return level === 'epic'
    ? groups.map((g) => epicKey(g.epic))
    : groups.flatMap((g) => g.features.map((f) => featureKey(g.epic, f.feature)));
}

export const allKeys = (groups) => new Set(LEVELS.flatMap((level) => levelKeys(groups, level)));

// True while at least one group of the level is open: the button then offers "Collapse", otherwise "Expand".
export const anyOpen = (closed, groups, level) => levelKeys(groups, level).some((key) => !closed.has(key));

// Closes every group of the level when any is open, else opens them all. The other level is left as it is.
export function toggleLevel(closed, groups, level) {
  const keys = levelKeys(groups, level);
  const next = new Set(closed);
  if (anyOpen(closed, groups, level)) keys.forEach((key) => next.add(key));
  else keys.forEach((key) => next.delete(key));
  return next;
}

// Opens one Feature and the Epic that holds it and nothing else. Returns `closed` itself when both are open already.
export function reveal(closed, epic, feature) {
  const keys = [epicKey(clean(epic)), featureKey(clean(epic), clean(feature))];
  if (!keys.some((key) => closed.has(key))) return closed;
  const next = new Set(closed);
  keys.forEach((key) => next.delete(key));
  return next;
}

// Forgets the keys of groups that are no longer in the backlog. Returns `closed` itself when none is stale.
export function pruneClosed(closed, groups) {
  const present = allKeys(groups);
  const kept = [...closed].filter((key) => present.has(key));
  return kept.length === closed.size ? closed : new Set(kept);
}

// The set a stored string stands for: empty when it is missing, not JSON, or not a list of strings.
export function parseClosed(raw) {
  if (typeof raw !== 'string') return new Set();
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? new Set(list.filter((key) => typeof key === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export const serializeClosed = (closed) => JSON.stringify([...closed]);
