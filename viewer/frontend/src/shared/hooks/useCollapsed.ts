import { useCallback, useEffect, useRef, useState } from 'react';
import type { EpicGroup } from '#shared/backlog/model.ts';
import type { Level } from '../lib/collapse.ts';
import { parseClosed, pruneClosed, reveal as revealGroup, serializeClosed, toggleLevel as toggleGroupLevel } from '../lib/collapse.ts';

const storageKey = (file: string | null) => `planner.collapsed.${file}`;

// The browser store can be missing or throw (private window, blocked site data): the folds then last until the page closes.
const readStored = (name: string) => {
  try {
    return localStorage.getItem(name);
  } catch {
    return null;
  }
};
const writeStored = (name: string, value: string) => {
  try {
    localStorage.setItem(name, value);
  } catch {
    // not stored: the folds still apply for this page
  }
};

// The folded Epic and Feature groups of the story list for backlog `file`, kept in the browser under `planner.collapsed.<file>`
// (see viewer/frontend/src/shared/lib/collapse.ts for what a key is). `groups` is `groupByEpic(stories)`; `ready` is true once a backlog is loaded, and only
// then are the keys of groups that have left the backlog forgotten. `toggleKey` folds one group, `toggleLevel` every group of a
// level ('epic' or 'feature'), `reveal` opens one Feature and its Epic.
export default function useCollapsed(file: string | null, groups: readonly EpicGroup[], ready: boolean) {
  const [state, setState] = useState<{ file: string | null; closed: ReadonlySet<string> }>(() => ({ file, closed: parseClosed(readStored(storageKey(file))) }));
  const latest = useRef(state); // updated at once, so several calls in one event (accepting many stories) build on each other

  let current = state;
  if (state.file !== file) { // another backlog: its folds, not the previous file's
    current = { file, closed: parseClosed(readStored(storageKey(file))) };
    latest.current = current;
    setState(current);
  }

  const update = useCallback((next: ReadonlySet<string>) => {
    if (next === latest.current.closed) return;
    latest.current = { file: latest.current.file, closed: next };
    setState(latest.current);
    writeStored(storageKey(latest.current.file), serializeClosed(next));
  }, []);

  useEffect(() => {
    if (ready) update(pruneClosed(latest.current.closed, groups));
  }, [ready, groups, file, update]);

  const toggleKey = useCallback((key: string) => {
    const next = new Set(latest.current.closed);
    if (!next.delete(key)) next.add(key);
    update(next);
  }, [update]);
  const toggleLevel = (level: Level) => update(toggleGroupLevel(latest.current.closed, groups, level));
  const reveal = useCallback((epic: unknown, feature: unknown) => update(revealGroup(latest.current.closed, epic, feature)), [update]);

  return { closed: current.closed, toggleKey, toggleLevel, reveal };
}
