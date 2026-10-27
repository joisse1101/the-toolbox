import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createFileStore } from '../../shared/files.js';
import { loadBacklog, newBacklogText, newStory, displayOrder, applyBulk } from '../../../../logic/backlog/model.js';
import { commitEpic, commitEpics, moveStory, moveGroup, gatherFeatures, recodedBetween, removeStory, removeStories, wouldCycle, lockStories, unlockStories } from '../../../../logic/backlog/ids.js';
import { applySuggestions, acceptAll } from '../../../../logic/review/review.js';
import { useAutosave } from './useAutosave.js';

const store = createFileStore('backlogs');
const NEW_BACKLOG_NAME = 'new-backlog';

const initial = {
  files: [],
  current: null, // selected file name
  backlog: null, // { headers, stories, hasBom }
  selectedId: null,
  view: 'editor', // 'editor' | 'stories' | 'graph' | 'proposed' | 'lexicon' | 'backups' | 'review'
  checked: new Set(), // story ids ticked in the Stories tab (separate from selectedId)
  lastChecked: null, // id of the last ticked row, for shift-click ranges
  edits: 0, // bumped by every change to the backlog; the auto-save runs when it changes
};

// Story objects are never mutated once they are in state: every change replaces the story (or all of them).
// Deleted stories drop out of the ticked set.
function withStories(state, stories, extra = {}) {
  const ids = new Set(stories.map((s) => s.id));
  const checked = new Set([...state.checked].filter((id) => ids.has(id)));
  return { ...state, backlog: { ...state.backlog, stories }, checked, edits: state.edits + 1, ...extra };
}

// IDs and links are recomputed by the ids.js function a case calls; an unchanged result leaves the state alone.
export function reducer(state, action) {
  switch (action.type) {
    case 'files':
      return { ...state, files: action.files };
    case 'loaded': {
      const stories = action.backlog.stories;
      const previousIndex = action.keepSelection ? (state.backlog?.stories.findIndex((s) => s.id === state.selectedId) ?? -1) : -1;
      return {
        ...state,
        current: action.name,
        backlog: action.backlog,
        selectedId: stories.length ? stories[Math.min(Math.max(previousIndex, 0), stories.length - 1)].id : null,
        checked: new Set(), // ids are assigned per load, so a selection cannot survive a reload
        lastChecked: null,
        edits: state.edits + (action.backlog.changed ? 1 : 0), // IDs assigned on load must be saved
      };
    }
    case 'cleared':
      return { ...state, current: null, backlog: null, selectedId: null, checked: new Set(), lastChecked: null };
    case 'renamed':
      return { ...state, current: action.name };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'view':
      return { ...state, view: action.view };
    case 'edit': {
      const stories = state.backlog.stories.map((s) => {
        if (s.id !== action.id) return s;
        const draft = { ...s, criteria: s.criteria.map((c) => ({ ...c })), clarifications: s.clarifications.map((p) => ({ ...p })) };
        action.change(draft);
        if (s.locked) draft.epic = s.epic; // the Epic of a locked story is read-only
        return draft;
      });
      return withStories(state, stories);
    }
    case 'add':
      return withStories(state, [...state.backlog.stories, action.story], { selectedId: action.story.id });
    case 'commitEpic': {
      const stories = commitEpic(state.backlog.stories, action.id);
      return stories === state.backlog.stories ? state : withStories(state, stories);
    }
    case 'move': {
      const stories = moveStory(state.backlog.stories, action.id, action.epic, action.beforeId);
      return stories === state.backlog.stories ? state : withStories(state, stories, { selectedId: action.id });
    }
    case 'moveGroup': {
      const stories = moveGroup(state.backlog.stories, action.group, action.beforeKey);
      return stories === state.backlog.stories ? state : withStories(state, stories);
    }
    case 'renumberDisplayed': {
      const stories = gatherFeatures(state.backlog.stories);
      return stories === state.backlog.stories ? state : withStories(state, stories);
    }
    case 'delete': {
      const stories = state.backlog.stories;
      const i = stories.findIndex((s) => s.id === action.id);
      if (i < 0) return state;
      const rest = removeStory(stories, action.id);
      if (rest === stories) return state; // a locked story is not deleted
      return withStories(state, rest, { selectedId: rest.length ? rest[Math.min(i, rest.length - 1)].id : null });
    }
    // Delete the ticked stories (action.ids) except locked ones. The selected story moves to the nearest survivor.
    case 'deleteMany': {
      const stories = state.backlog.stories;
      const { stories: rest } = removeStories(stories, action.ids);
      if (rest === stories) return state;
      const i = stories.findIndex((s) => s.id === state.selectedId);
      const keep = rest.some((s) => s.id === state.selectedId);
      return withStories(state, rest, { selectedId: keep ? state.selectedId : (rest[Math.min(Math.max(i, 0), rest.length - 1)]?.id ?? null) });
    }
    // Link/unlink from the Graph tab. A link to a missing story, to itself, a repeat or one that closes a cycle is ignored.
    case 'addDependency': {
      const { stories } = state.backlog;
      const from = stories.find((s) => s.id === action.id);
      const to = stories.find((s) => s.code === action.code);
      if (!from?.code || !to || from.dependsOn.includes(action.code) || wouldCycle(stories, from.code, action.code)) return state;
      return withStories(state, stories.map((s) => (s === from ? { ...s, dependsOn: [...s.dependsOn, action.code] } : s)));
    }
    case 'removeDependency': {
      const { stories } = state.backlog;
      const from = stories.find((s) => s.id === action.id);
      if (!from?.dependsOn.includes(action.code)) return state;
      const dependsOn = from.dependsOn.filter((c) => c !== action.code);
      return withStories(state, stories.map((s) => (s === from ? { ...s, dependsOn, ambiguous: s.ambiguous.filter((c) => c !== action.code) } : s)));
    }
    // Apply one review suggestion or a whole split group. A failed apply (stale row, cycle) leaves the state alone;
    // the caller runs applySuggestions first to show the reason.
    case 'applySuggestions': {
      const result = applySuggestions(state.backlog.stories, action.rows, state.backlog.headers);
      return result.error ? state : withStories(state, result.stories);
    }
    // Accept all: the stories acceptAll (planner/logic/review/review.js) computed for a whole run, stored as one edit.
    case 'acceptSuggestions':
      return withStories(state, action.stories);
    // The whole story list was recomputed elsewhere (accepting proposed stories, see proposals.js): store it and save.
    case 'replaceStories': {
      const stories = action.stories;
      const keep = stories.some((s) => s.id === state.selectedId);
      return withStories(state, stories, { selectedId: keep ? state.selectedId : (stories[0]?.id ?? null) });
    }
    // Lock or unlock the ticked stories (or just action.ids). Stories without an ID are skipped when locking.
    case 'lock': {
      const { stories } = (action.on ? lockStories : unlockStories)(state.backlog.stories, action.ids);
      return stories === state.backlog.stories ? state : withStories(state, stories);
    }
    case 'check': {
      const checked = new Set(state.checked);
      for (const id of action.ids) action.on ? checked.add(id) : checked.delete(id);
      return { ...state, checked, lastChecked: action.anchor };
    }
    // Ticks or unticks exactly action.ids (the rows on screen); a story the Stories search hides keeps its tick.
    case 'checkAll': {
      const checked = new Set(state.checked);
      for (const id of action.ids) action.on ? checked.add(id) : checked.delete(id);
      return { ...state, checked, lastChecked: null };
    }
    case 'bulk': {
      const stories = state.backlog.stories.map((s) => ({ ...s }));
      applyBulk(stories, state.checked, action.patch);
      return withStories(state, commitEpics(stories, state.checked));
    }
    default:
      return state;
  }
}

// The whole editor state for one open backlog, plus the actions that change it and keep it on disk.
export function useBacklog() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [status, setStatus] = useState({ kind: 'idle', detail: '' });
  const [message, setMessage] = useState(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  const autosave = useAutosave({ store, stateRef, onStatus: setStatus, onMessage: setMessage });

  useEffect(() => {
    if (state.edits > 0) autosave.markDirty();
  }, [state.edits, autosave]);

  const actions = useMemo(() => {
    async function refreshFiles() {
      const files = await store.list();
      dispatch({ type: 'files', files });
      return files;
    }

    // keepSelection: stay on the same position in the story list (a reload), rather than start at the top.
    async function loadFile(name, keepSelection = false) {
      const text = await store.read(name);
      autosave.loaded(text);
      const backlog = loadBacklog(text);
      dispatch({ type: 'loaded', name, backlog, keepSelection });
      autosave.setStatus('saved');
      return backlog;
    }

    function clearCurrent() {
      autosave.loaded(null);
      dispatch({ type: 'cleared' });
      autosave.setStatus('idle');
    }

    const wrap = async (fn) => {
      setMessage(null);
      try {
        return await fn();
      } catch (err) {
        setMessage(err.message);
        return undefined;
      }
    };

    const edit = (id, change) => dispatch({ type: 'edit', id, change });

    return {
      // Resolves true once everything typed so far is on disk, false if saving is failing.
      settle: () => autosave.settle(),

      // Re-read the list and the open file (on tab focus). Local unsaved edits always win.
      async refreshFromDisk() {
        try {
          const files = await refreshFiles();
          const { current } = stateRef.current;
          if (current && !files.includes(current)) {
            setMessage(`${current} no longer exists.`);
            autosave.discardPending();
            files.length ? await loadFile(files[0], true) : clearCurrent();
            return;
          }
          if (!current && files.length) return await loadFile(files[0], true);
          if (!current) return;
          const text = await store.read(current);
          if (text !== autosave.lastText() && !autosave.isBusy()) await loadFile(current, true);
        } catch (err) {
          setMessage(err.message);
        }
      },

      async init() {
        try {
          const files = await refreshFiles();
          if (files.length) await loadFile(files[0], true);
        } catch (err) {
          setMessage(err.message);
        }
      },

      // Resolves true when a new backlog was created and opened.
      newBacklog: () =>
        wrap(async () => {
          if (!(await autosave.leaveCurrentFile())) return false;
          const name = await store.create(NEW_BACKLOG_NAME, newBacklogText());
          await refreshFiles();
          const backlog = await loadFile(name);
          actions.addStory(backlog.headers); // a new backlog starts with one blank story
          return true;
        }),

      selectFile: (name) =>
        wrap(async () => {
          if (!(await autosave.leaveCurrentFile())) return;
          await loadFile(name);
        }),

      // Resolves true when the file was renamed.
      renameFile: (wanted) =>
        wrap(async () => {
          const { current } = stateRef.current;
          if (!current || wanted === current) return false;
          if (!(await autosave.settle())) throw new Error('Cannot rename while your latest changes are unsaved.');
          const name = await store.rename(current, wanted);
          dispatch({ type: 'renamed', name });
          await refreshFiles();
          return true;
        }),

      openFolder: () => wrap(() => store.openFolder()),

      setView: (view) => dispatch({ type: 'view', view }),
      selectStory: (id) => dispatch({ type: 'select', id }),

      // `headers` is passed when the backlog was loaded in the same tick, before state has re-rendered.
      addStory(headers = stateRef.current.backlog.headers) {
        dispatch({ type: 'add', story: newStory(headers) });
      },

      // Asks first. Resolves true when the story was deleted.
      deleteSelected() {
        const { backlog, selectedId } = stateRef.current;
        if (backlog?.stories.find((s) => s.id === selectedId)?.locked) {
          setMessage('A locked story cannot be deleted. Unlock it first.');
          return false;
        }
        if (selectedId === null || !confirm('Delete the selected story?')) return false;
        dispatch({ type: 'delete', id: selectedId });
        return true;
      },

      // Asks first. Deletes the ticked stories that are not locked. Returns { deleted, skipped } (skipped: locked ones kept);
      // nothing is asked or deleted when all of them are locked, and deleted is 0 when the user cancels.
      deleteChecked() {
        const { backlog, checked } = stateRef.current;
        const { skipped } = removeStories(backlog.stories, checked);
        const deleted = [...checked].filter((id) => backlog.stories.some((s) => s.id === id)).length - skipped;
        if (deleted <= 0) return { deleted: 0, skipped };
        if (!confirm(`Delete ${deleted} ${deleted === 1 ? 'story' : 'stories'}?${skipped ? `\n\n${skipped} locked ${skipped === 1 ? 'story is' : 'stories are'} kept.` : ''}\n\nThis cannot be undone.`)) return { deleted: 0, skipped: 0 };
        dispatch({ type: 'deleteMany', ids: checked });
        return { deleted, skipped };
      },

      // Select the neighbouring story in display order.
      moveSelection(delta) {
        const { backlog, selectedId } = stateRef.current;
        const stories = displayOrder(backlog?.stories ?? []);
        const next = stories[stories.findIndex((s) => s.id === selectedId) + delta];
        if (!next) return false;
        dispatch({ type: 'select', id: next.id });
        return true;
      },

      editStory: edit,
      commitEpic: (id) => dispatch({ type: 'commitEpic', id }),
      addDependency: (id, code) => dispatch({ type: 'addDependency', id, code }),
      removeDependency: (id, code) => dispatch({ type: 'removeDependency', id, code }),
      // The three moves below resolve the old code -> new code of the stories whose ID changed, so the caller can
      // make their review suggestions follow (review.retarget).
      moveStory(id, epic, beforeId) {
        const { stories } = stateRef.current.backlog;
        const recoded = recodedBetween(stories, moveStory(stories, id, epic, beforeId));
        dispatch({ type: 'move', id, epic, beforeId });
        return recoded;
      },
      // `group` is { epic } or { epic, feature }; beforeKey the epic or feature to land before (null = last).
      moveGroup(group, beforeKey) {
        const { stories } = stateRef.current.backlog;
        const recoded = recodedBetween(stories, moveGroup(stories, group, beforeKey));
        dispatch({ type: 'moveGroup', group, beforeKey });
        return recoded;
      },
      // Asks first. Resolves the recoded map, or null when nothing changes or the user cancels.
      renumberDisplayed() {
        const { stories } = stateRef.current.backlog;
        const after = gatherFeatures(stories);
        if (after === stories) return null;
        const recoded = recodedBetween(stories, after);
        const n = recoded.size;
        const effect = n ? `${n} ${n === 1 ? 'story gets' : 'stories get'} a new ID, and links to ${n === 1 ? 'it are' : 'them are'} updated.` : 'No ID changes; the rows are only put in the order shown.';
        if (!confirm(`Put the stories of each feature together, in the order shown, and renumber?

${effect} Locked stories keep their IDs.

This cannot be undone.`)) return null;
        dispatch({ type: 'renumberDisplayed' });
        return recoded;
      },

      replaceStories: (stories) => dispatch({ type: 'replaceStories', stories }),

      toggleChecked: (ids, on, anchor) => dispatch({ type: 'check', ids, on, anchor }),
      checkAll: (on, ids) => dispatch({ type: 'checkAll', on, ids }),
      // Resolves { skipped }: the locked ticked stories whose Epic was not changed.
      applyBulkPatch(patch) {
        const { backlog, checked } = stateRef.current;
        const epicChange = typeof patch.epic === 'string' && patch.epic.trim() !== '';
        const skipped = epicChange ? backlog.stories.filter((s) => checked.has(s.id) && s.locked).length : 0;
        dispatch({ type: 'bulk', patch });
        return { skipped };
      },

      // Lock or unlock the ticked stories. Resolves { skipped }: ticked stories without an ID that could not be locked.
      lockChecked(on) {
        const { backlog, checked } = stateRef.current;
        const { skipped } = (on ? lockStories : unlockStories)(backlog.stories, checked);
        dispatch({ type: 'lock', ids: checked, on });
        return { skipped };
      },
      lockStory: (id, on) => dispatch({ type: 'lock', ids: new Set([id]), on }),

      // Lock or unlock every story of a group (an epic's or a feature's). Stories without an ID cannot be locked: they
      // are skipped and the message says how many. Resolves { skipped }.
      lockGroup(groupStories, on) {
        const ids = new Set(groupStories.map((s) => s.id));
        const { skipped } = (on ? lockStories : unlockStories)(stateRef.current.backlog.stories, ids);
        dispatch({ type: 'lock', ids, on });
        setMessage(skipped ? `${skipped} skipped (no ID)` : null);
        return { skipped };
      },

      // Resolves { ok: true } or { error } (the edit is not made on error).
      applySuggestions(rows) {
        const { backlog } = stateRef.current;
        const result = applySuggestions(backlog.stories, rows, backlog.headers);
        if (result.error) return { error: result.error };
        dispatch({ type: 'applySuggestions', rows });
        return { ok: true };
      },

      // Applies the eligible units in order as one edit. Returns { applied, skipped } (see acceptAll in planner/logic/review/review.js).
      acceptAll(units) {
        const { backlog } = stateRef.current;
        const result = acceptAll(backlog.stories, units, backlog.headers);
        if (result.applied.length) dispatch({ type: 'acceptSuggestions', stories: result.stories });
        return { applied: result.applied, skipped: result.skipped };
      },
    };
  }, [autosave]);

  const selected = state.backlog?.stories.find((s) => s.id === state.selectedId) ?? null;

  return { state, selected, status, message, actions };
}
