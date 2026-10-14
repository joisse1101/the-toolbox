import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createFileStore } from '../../shared/files.js';
import { COLUMNS, loadBacklog, newStory } from '../model.js';
import { nextPlaceholder, removeProposed, moveProposed } from '../proposals.js';
import { useAutosave } from './useAutosave.js';

const proposalsStore = createFileStore('proposals');

// Saving a proposals file that is not there yet creates it (the file API's write never does).
const store = {
  ...proposalsStore,
  async write(name, text) {
    try {
      await proposalsStore.write(name, text);
    } catch (err) {
      if (err.code !== 'not-found') throw err;
      await proposalsStore.create(name, text);
    }
  },
};

const initial = {
  current: null, // the backlog file name; the proposals file has the same name
  backlog: null, // { headers, stories, hasBom }, same shape as a backlog so useAutosave can save it
  selectedId: null,
  edits: 0, // bumped by every change; the auto-save runs when it changes
};

const emptyFile = (headers) => ({ headers: headers ? [...headers] : [...COLUMNS], stories: [], hasBom: true });

function withStories(state, stories, extra = {}) {
  return { ...state, backlog: { ...state.backlog, stories }, edits: state.edits + 1, ...extra };
}

// Proposed stories keep their NEW-<n> IDs: nothing here renumbers (that is what accepting does, see proposals.js).
export function reducer(state, action) {
  switch (action.type) {
    case 'loaded': {
      const stories = action.backlog.stories;
      const previousIndex = action.keepSelection ? stories.findIndex((s) => s.id === state.selectedId) : -1;
      return {
        ...state,
        current: action.name,
        backlog: action.backlog,
        selectedId: stories.length ? stories[Math.min(Math.max(previousIndex, 0), stories.length - 1)].id : null,
      };
    }
    case 'cleared':
      return { ...state, current: null, backlog: null, selectedId: null };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'edit': {
      const stories = state.backlog.stories.map((s) => {
        if (s.id !== action.id) return s;
        const draft = { ...s, criteria: s.criteria.map((c) => ({ ...c })) };
        action.change(draft);
        return draft;
      });
      return withStories(state, stories);
    }
    // The new story gets a placeholder above every NEW-<n> the proposals and the backlog's Depends On still use.
    case 'add': {
      const story = { ...action.story, code: nextPlaceholder(state.backlog.stories, action.backlogStories ?? []) };
      return withStories(state, [...state.backlog.stories, story], { selectedId: story.id });
    }
    // The Epic field was left: remember the committed epic. The ID does not depend on it.
    case 'commitEpic': {
      const s = state.backlog.stories.find((x) => x.id === action.id);
      if (!s || s.codedEpic === s.epic) return state;
      return withStories(state, state.backlog.stories.map((x) => (x === s ? { ...s, codedEpic: s.epic } : x)));
    }
    case 'delete': {
      const stories = state.backlog.stories;
      const i = stories.findIndex((s) => s.id === action.id);
      if (i < 0) return state;
      const rest = removeProposed(stories, action.id);
      return withStories(state, rest, { selectedId: rest.length ? rest[Math.min(i, rest.length - 1)].id : null });
    }
    case 'move': {
      const stories = moveProposed(state.backlog.stories, action.id, action.epic, action.beforeId);
      return stories === state.backlog.stories ? state : withStories(state, stories, { selectedId: action.id });
    }
    // The remaining proposed stories after an accept.
    case 'replaceStories': {
      const stories = action.stories;
      const keep = stories.some((s) => s.id === state.selectedId);
      return withStories(state, stories, { selectedId: keep ? state.selectedId : (stories[0]?.id ?? null) });
    }
    default:
      return state;
  }
}

// The proposed stories of the open backlog (`current`, a file name): loads proposals/<current>, edits them and keeps
// them on disk. A missing file is an empty list; the first save creates it. `headers` are the backlog's, used for a
// file that does not exist yet so unknown columns line up.
export function useProposals(current, headers) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [status, setStatus] = useState({ kind: 'idle', detail: '' });
  const [message, setMessage] = useState(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const headersRef = useRef(headers);
  headersRef.current = headers;
  const loadToken = useRef(0);

  const autosave = useAutosave({ store, stateRef, onStatus: setStatus, onMessage: setMessage });

  useEffect(() => {
    if (state.edits > 0) autosave.markDirty();
  }, [state.edits, autosave]);

  const actions = useMemo(() => {
    // Returns the text read, or null when there is no file. A stale call (another backlog opened meanwhile) is dropped.
    async function load(name, keepSelection) {
      const token = ++loadToken.current;
      let text = null;
      try {
        text = await store.read(name);
      } catch (err) {
        if (err.code !== 'not-found') throw err;
      }
      if (token !== loadToken.current) return;
      autosave.loaded(text);
      const backlog = text === null ? emptyFile(headersRef.current) : loadBacklog(text, { placeholderIds: true });
      dispatch({ type: 'loaded', name, backlog, keepSelection });
      autosave.setStatus('saved');
    }

    return {
      // Switch to the proposals of another backlog (or none). Edits still waiting for a save are saved first.
      async open(name) {
        try {
          if (stateRef.current.current && !(await autosave.settle())) {
            setMessage('Proposed-story edits could not be saved and were discarded.');
            autosave.discardPending();
          }
          if (!name) {
            loadToken.current++;
            autosave.loaded(null);
            dispatch({ type: 'cleared' });
            autosave.setStatus('idle');
            return;
          }
          await load(name, false);
        } catch (err) {
          setMessage(err.message);
        }
      },

      // On tab focus: pick up a file changed outside (for example written by a skill). Local unsaved edits win.
      async refreshFromDisk() {
        const name = stateRef.current.current;
        if (!name) return;
        try {
          let text = null;
          try {
            text = await store.read(name);
          } catch (err) {
            if (err.code !== 'not-found') throw err;
          }
          if (text !== autosave.lastText() && !autosave.isBusy()) await load(name, true);
        } catch (err) {
          setMessage(err.message);
        }
      },

      selectStory: (id) => dispatch({ type: 'select', id }),
      // `backlogStories` are read so the new placeholder avoids numbers the backlog still names.
      addStory: (backlogStories) =>
        dispatch({ type: 'add', story: newStory(stateRef.current.backlog.headers), backlogStories }),
      editStory: (id, change) => dispatch({ type: 'edit', id, change }),
      commitEpic: (id) => dispatch({ type: 'commitEpic', id }),
      moveStory: (id, epic, beforeId) => dispatch({ type: 'move', id, epic, beforeId }),
      replaceStories: (stories) => dispatch({ type: 'replaceStories', stories }),

      // Asks first. Resolves true when the story was deleted.
      deleteSelected() {
        const { selectedId } = stateRef.current;
        if (selectedId === null || !confirm('Delete the selected proposed story?')) return false;
        dispatch({ type: 'delete', id: selectedId });
        return true;
      },
    };
  }, [autosave]);

  // Follow the open backlog.
  useEffect(() => {
    actions.open(current ?? null);
  }, [current, actions]);

  const selected = state.backlog?.stories.find((s) => s.id === state.selectedId) ?? null;

  return { state, stories: state.backlog?.stories ?? [], selected, status, message, actions };
}
