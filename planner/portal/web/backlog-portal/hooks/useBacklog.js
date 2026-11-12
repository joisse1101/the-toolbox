import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createFileStore } from '../../shared/files.js';
import { loadBacklog, newStory, displayOrder, applyBulk } from '../../../../logic/backlog/model.js';
import { commitEpic, commitEpics, moveStory, moveGroup, gatherFeatures, recodedBetween, removeStory, removeStories, wouldCycle, renumber } from '../../../../logic/backlog/ids.js';
import { applySuggestions, acceptAll } from '../../../../logic/review/review.js';
import { useAutosave } from './useAutosave.js';
import { useConfirm } from './useConfirm.js';

const store = createFileStore('backlog');
const NEW_BACKLOG_NAME = 'new-backlog';

const initial = {
  files: [],
  current: null, // selected file name
  backlog: null, // { headers, stories, hasBom }
  initials: '', // the open backlog's initials; every ID is computed with them
  selectedId: null,
  view: 'editor', // 'editor' | 'stories' | 'graph' | 'proposed' | 'lexicon' | 'settings' | 'review'
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
        initials: action.initials,
        selectedId: stories.length ? stories[Math.min(Math.max(previousIndex, 0), stories.length - 1)].id : null,
        checked: new Set(), // ids are assigned per load, so a selection cannot survive a reload
        lastChecked: null,
        edits: state.edits + (action.backlog.changed ? 1 : 0), // IDs assigned on load must be saved
      };
    }
    case 'cleared':
      return { ...state, current: null, backlog: null, initials: '', selectedId: null, checked: new Set(), lastChecked: null };
    case 'renamed':
      return { ...state, current: action.name };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'view':
      return { ...state, view: action.view };
    // A frozen story is read-only: an edit action for it changes nothing, even when the form is stale.
    case 'edit': {
      if (state.backlog.stories.some((s) => s.id === action.id && s.frozen)) return state;
      const stories = state.backlog.stories.map((s) => {
        if (s.id !== action.id) return s;
        const draft = { ...s, criteria: s.criteria.map((c) => ({ ...c })), clarifications: s.clarifications.map((p) => ({ ...p })) };
        action.change(draft);
        return draft;
      });
      return withStories(state, stories);
    }
    case 'add':
      return withStories(state, [...state.backlog.stories, action.story], { selectedId: action.story.id });
    case 'commitEpic': {
      const stories = commitEpic(state.backlog.stories, action.id, state.initials);
      return stories === state.backlog.stories ? state : withStories(state, stories);
    }
    case 'move': {
      const stories = moveStory(state.backlog.stories, action.id, action.epic, action.beforeId, state.initials);
      return stories === state.backlog.stories ? state : withStories(state, stories, { selectedId: action.id });
    }
    case 'moveGroup': {
      const stories = moveGroup(state.backlog.stories, action.group, action.beforeKey, state.initials);
      return stories === state.backlog.stories ? state : withStories(state, stories);
    }
    case 'renumberDisplayed': {
      const stories = gatherFeatures(state.backlog.stories, state.initials);
      return stories === state.backlog.stories ? state : withStories(state, stories);
    }
    case 'delete': {
      const stories = state.backlog.stories;
      const i = stories.findIndex((s) => s.id === action.id);
      if (i < 0) return state;
      const rest = removeStory(stories, action.id, state.initials);
      if (rest === stories) return state; // a frozen story is not deleted
      return withStories(state, rest, { selectedId: rest.length ? rest[Math.min(i, rest.length - 1)].id : null });
    }
    // Delete the ticked stories (action.ids) except frozen ones. The selected story moves to the nearest survivor.
    case 'deleteMany': {
      const stories = state.backlog.stories;
      const { stories: rest } = removeStories(stories, action.ids, state.initials);
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
      if (!from?.code || from.frozen || !to || from.dependsOn.includes(action.code) || wouldCycle(stories, from.code, action.code)) return state;
      return withStories(state, stories.map((s) => (s === from ? { ...s, dependsOn: [...s.dependsOn, action.code] } : s)));
    }
    case 'removeDependency': {
      const { stories } = state.backlog;
      const from = stories.find((s) => s.id === action.id);
      if (from?.frozen || !from?.dependsOn.includes(action.code)) return state;
      const dependsOn = from.dependsOn.filter((c) => c !== action.code);
      return withStories(state, stories.map((s) => (s === from ? { ...s, dependsOn, ambiguous: s.ambiguous.filter((c) => c !== action.code) } : s)));
    }
    // Apply one review suggestion or a whole split group. A failed apply (stale row, cycle) leaves the state alone;
    // the caller runs applySuggestions first to show the reason.
    case 'applySuggestions': {
      const result = applySuggestions(state.backlog.stories, action.rows, state.backlog.headers, state.initials);
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
    // The backlog's initials changed (the server accepted them): every ID that is not frozen is recomputed with them.
    case 'setInitials': {
      if (action.initials === state.initials) return state;
      const stories = renumber(state.backlog.stories, action.initials);
      return stories === state.backlog.stories ? { ...state, initials: action.initials } : withStories(state, stories, { initials: action.initials });
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
      return withStories(state, commitEpics(stories, state.checked, state.initials));
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

  const ask = useConfirm();
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
      const { content: text, initials } = await store.readBacklog(name);
      autosave.loaded(text);
      const backlog = loadBacklog(text, { initials });
      dispatch({ type: 'loaded', name, backlog, initials, keepSelection });
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
          const name = await store.create(NEW_BACKLOG_NAME); // the server writes the starting files
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
      async deleteSelected() {
        const { backlog, selectedId } = stateRef.current;
        if (backlog?.stories.find((s) => s.id === selectedId)?.frozen) {
          setMessage('A frozen story cannot be deleted.');
          return false;
        }
        if (selectedId === null) return false;
        const story = backlog?.stories.find((s) => s.id === selectedId);
        const confirmed = await ask({ title: 'Delete this story?', message: `${story?.code || 'The selected story'} will be removed from the backlog.\n\nThis cannot be undone.`, confirmLabel: 'Delete', danger: true });
        if (!confirmed) return false;
        dispatch({ type: 'delete', id: selectedId });
        return true;
      },

      // Asks first. Deletes the ticked stories that are not frozen. Returns { deleted, skipped } (skipped: frozen ones kept);
      // nothing is asked or deleted when all of them are frozen, and deleted is 0 when the user cancels.
      async deleteChecked() {
        const { backlog, checked } = stateRef.current;
        const { skipped } = removeStories(backlog.stories, checked, stateRef.current.initials);
        const deleted = [...checked].filter((id) => backlog.stories.some((s) => s.id === id)).length - skipped;
        if (deleted <= 0) return { deleted: 0, skipped };
        const noun = deleted === 1 ? 'story' : 'stories';
        const message = `${deleted} ${noun} will be removed from the backlog.${skipped ? `\n\n${skipped} frozen ${skipped === 1 ? 'story is' : 'stories are'} kept.` : ''}\n\nThis cannot be undone.`;
        if (!(await ask({ title: `Delete ${deleted} ${noun}?`, message, confirmLabel: 'Delete', danger: true }))) return { deleted: 0, skipped: 0 };
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
        const recoded = recodedBetween(stories, moveStory(stories, id, epic, beforeId, stateRef.current.initials));
        dispatch({ type: 'move', id, epic, beforeId });
        return recoded;
      },
      // `group` is { epic } or { epic, feature }; beforeKey the epic or feature to land before (null = last).
      moveGroup(group, beforeKey) {
        const { stories } = stateRef.current.backlog;
        const recoded = recodedBetween(stories, moveGroup(stories, group, beforeKey, stateRef.current.initials));
        dispatch({ type: 'moveGroup', group, beforeKey });
        return recoded;
      },
      // Asks first. Resolves the recoded map, or null when nothing changes or the user cancels.
      async renumberDisplayed() {
        const { stories } = stateRef.current.backlog;
        const after = gatherFeatures(stories, stateRef.current.initials);
        if (after === stories) return null;
        const recoded = recodedBetween(stories, after);
        const n = recoded.size;
        const effect = n ? `${n} ${n === 1 ? 'story gets' : 'stories get'} a new ID, and links to ${n === 1 ? 'it are' : 'them are'} updated.` : 'No ID changes; the rows are only put in the order shown.';
        const message = `Put the stories of each feature together, in the order shown, and renumber.\n\n${effect} Frozen stories keep their IDs.\n\nThis cannot be undone.`;
        if (!(await ask({ title: 'Renumber the backlog?', message, confirmLabel: 'Renumber' }))) return null;
        dispatch({ type: 'renumberDisplayed' });
        return recoded;
      },

      replaceStories: (stories) => dispatch({ type: 'replaceStories', stories }),

      toggleChecked: (ids, on, anchor) => dispatch({ type: 'check', ids, on, anchor }),
      checkAll: (on, ids) => dispatch({ type: 'checkAll', on, ids }),
      // Resolves { skipped }: the frozen ticked stories, which a bulk edit leaves as they are.
      applyBulkPatch(patch) {
        const { backlog, checked } = stateRef.current;
        const skipped = backlog.stories.filter((s) => checked.has(s.id) && s.frozen).length;
        dispatch({ type: 'bulk', patch });
        return { skipped };
      },

      // Asks the server to change the backlog's initials, then renumbers the stories that are not frozen. Resolves
      // { ok: true } (also when nothing changed) or { error } with the server's refusal; nothing changes on error.
      async setInitials(wanted) {
        const { current, initials } = stateRef.current;
        if (!current || wanted.trim().toUpperCase() === initials) return { ok: true };
        try {
          const stored = await store.setInitials(current, wanted);
          dispatch({ type: 'setInitials', initials: stored });
          return { ok: true };
        } catch (err) {
          return { error: err.message };
        }
      },

      // Resolves { ok: true } or { error } (the edit is not made on error).
      applySuggestions(rows) {
        const { backlog } = stateRef.current;
        const result = applySuggestions(backlog.stories, rows, backlog.headers, stateRef.current.initials);
        if (result.error) return { error: result.error };
        dispatch({ type: 'applySuggestions', rows });
        return { ok: true };
      },

      // Applies the eligible units in order as one edit. Returns { applied, skipped } (see acceptAll in planner/logic/review/review.js).
      acceptAll(units) {
        const { backlog } = stateRef.current;
        const result = acceptAll(backlog.stories, units, backlog.headers, stateRef.current.initials);
        if (result.applied.length) dispatch({ type: 'acceptSuggestions', stories: result.stories });
        return { applied: result.applied, skipped: result.skipped };
      },
    };
  }, [autosave, ask]);

  const selected = state.backlog?.stories.find((s) => s.id === state.selectedId) ?? null;

  return { state, selected, status, message, actions };
}
