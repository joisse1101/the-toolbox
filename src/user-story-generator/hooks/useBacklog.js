import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createFileStore } from '../../shared/files.js';
import { loadBacklog, newBacklogText, newStory, displayOrder, applyBulk } from '../model.js';
import { useAutosave } from './useAutosave.js';

const store = createFileStore('user-stories');
const NEW_BACKLOG_NAME = 'new-backlog';

const initial = {
  files: [],
  current: null, // selected file name
  backlog: null, // { headers, stories, hasBom }
  selectedId: null,
  view: 'editor', // 'editor' | 'stories'
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

function reducer(state, action) {
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
        const draft = { ...s, criteria: s.criteria.map((c) => ({ ...c })) };
        action.change(draft);
        return draft;
      });
      return withStories(state, stories);
    }
    case 'add':
      return withStories(state, [...state.backlog.stories, action.story], { selectedId: action.story.id });
    case 'delete': {
      const stories = state.backlog.stories;
      const i = stories.findIndex((s) => s.id === action.id);
      if (i < 0) return state;
      const rest = stories.filter((s) => s.id !== action.id);
      return withStories(state, rest, { selectedId: rest.length ? rest[Math.min(i, rest.length - 1)].id : null });
    }
    case 'check': {
      const checked = new Set(state.checked);
      for (const id of action.ids) action.on ? checked.add(id) : checked.delete(id);
      return { ...state, checked, lastChecked: action.anchor };
    }
    case 'checkAll':
      return { ...state, checked: new Set(action.on ? action.ids : []), lastChecked: null };
    case 'bulk': {
      const stories = state.backlog.stories.map((s) => ({ ...s }));
      applyBulk(stories, state.checked, action.patch);
      return withStories(state, stories);
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
        const { selectedId } = stateRef.current;
        if (selectedId === null || !confirm('Delete the selected story?')) return false;
        dispatch({ type: 'delete', id: selectedId });
        return true;
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

      toggleChecked: (ids, on, anchor) => dispatch({ type: 'check', ids, on, anchor }),
      checkAll: (on, ids) => dispatch({ type: 'checkAll', on, ids }),
      applyBulkPatch: (patch) => dispatch({ type: 'bulk', patch }),
    };
  }, [autosave]);

  const selected = state.backlog?.stories.find((s) => s.id === state.selectedId) ?? null;

  return { state, selected, status, message, actions };
}
