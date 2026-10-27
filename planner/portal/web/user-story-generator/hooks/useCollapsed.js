import { useCallback, useEffect, useRef, useState } from 'react';
import { parseClosed, pruneClosed, reveal as revealGroup, serializeClosed, toggleLevel as toggleGroupLevel } from '../../../../logic/collapse.js';

const storageKey = (file) => `tlt.collapsed.${file}`;

// The browser store can be missing or throw (private window, blocked site data): the folds then last until the page closes.
const readStored = (name) => {
  try {
    return localStorage.getItem(name);
  } catch {
    return null;
  }
};
const writeStored = (name, value) => {
  try {
    localStorage.setItem(name, value);
  } catch {
    // not stored: the folds still apply for this page
  }
};

// The folded Epic and Feature groups of the story list for backlog `file`, kept in the browser under `tlt.collapsed.<file>`
// (see planner/logic/collapse.js for what a key is). `groups` is `groupByEpic(stories)`; `ready` is true once a backlog is loaded, and only
// then are the keys of groups that have left the backlog forgotten. `toggleKey` folds one group, `toggleLevel` every group of a
// level ('epic' or 'feature'), `reveal` opens one Feature and its Epic.
export default function useCollapsed(file, groups, ready) {
  const [state, setState] = useState(() => ({ file, closed: parseClosed(readStored(storageKey(file))) }));
  const latest = useRef(state); // updated at once, so several calls in one event (accepting many stories) build on each other

  let current = state;
  if (state.file !== file) { // another backlog: its folds, not the previous file's
    current = { file, closed: parseClosed(readStored(storageKey(file))) };
    latest.current = current;
    setState(current);
  }

  const update = useCallback((next) => {
    if (next === latest.current.closed) return;
    latest.current = { file: latest.current.file, closed: next };
    setState(latest.current);
    writeStored(storageKey(latest.current.file), serializeClosed(next));
  }, []);

  useEffect(() => {
    if (ready) update(pruneClosed(latest.current.closed, groups));
  }, [ready, groups, file, update]);

  const toggleKey = useCallback((key) => {
    const next = new Set(latest.current.closed);
    if (!next.delete(key)) next.add(key);
    update(next);
  }, [update]);
  const toggleLevel = (level) => update(toggleGroupLevel(latest.current.closed, groups, level));
  const reveal = useCallback((epic, feature) => update(revealGroup(latest.current.closed, epic, feature)), [update]);

  return { closed: current.closed, toggleKey, toggleLevel, reveal };
}
