import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Backlog, Proposal, Story } from '#shared/types.ts';
import { FileApiError, createFileStore, messageOf } from '#frontend/src/shared/api/files.ts';
import { COLUMNS, loadBacklog, newStory, proposalHeaders } from '#shared/backlog/model.ts';
import { relinkStories } from '#shared/backlog/ids.ts';
import { nextPlaceholder, removeProposed, moveProposed } from '#shared/backlog/proposals.ts';
import { useAutosave } from '#frontend/src/shared/hooks/useAutosave.ts';
import type { StatusReport } from '#frontend/src/shared/hooks/useAutosave.ts';
import { useConfirm } from '#frontend/src/shared/hooks/useConfirm.ts';

const proposalsStore = createFileStore('proposals');

// Saving a proposals file that is not there yet creates it (the file API's write never does).
const store = {
  ...proposalsStore,
  // The server answers an empty file for a backlog without proposals; an empty text is the same as no file here.
  async read(name: string): Promise<string | null> {
    return (await proposalsStore.read(name)) || null;
  },
  async write(name: string, text: string) {
    try {
      await proposalsStore.write(name, text);
    } catch (err) {
      if (!(err instanceof FileApiError) || err.code !== 'not-found') throw err;
      await proposalsStore.create(name, text);
    }
  },
};

export interface ProposalsState {
  current: string | null; // the backlog file name; the proposals file has the same name
  backlog: Backlog | null; // same shape as a backlog so useAutosave can save it
  selectedId: number | null;
  edits: number; // bumped by every change; the auto-save runs when it changes
}

export type ProposalsAction =
  | { type: 'loaded'; name: string; backlog: Backlog; keepSelection?: boolean }
  | { type: 'cleared' }
  | { type: 'select'; id: number | null }
  | { type: 'edit'; id: number; change: (draft: Story) => void }
  | { type: 'add'; story: Story; backlogStories?: readonly Story[] }
  | { type: 'commitEpic'; id: number }
  | { type: 'delete'; id: number }
  | { type: 'deleteMany'; ids: ReadonlySet<number> }
  | { type: 'move'; id: number; epic: unknown; beforeId?: number | null }
  | { type: 'replaceStories'; stories: Proposal[] }
  | { type: 'relink'; changes: ReadonlyMap<string, string> };

const initial: ProposalsState = {
  current: null,
  backlog: null,
  selectedId: null,
  edits: 0,
};

const emptyFile = (headers: readonly string[] | null | undefined): Backlog => ({ headers: proposalHeaders(headers ?? COLUMNS), stories: [], hasBom: true });

function withStories(state: ProposalsState, stories: Story[], extra: Partial<ProposalsState> = {}): ProposalsState {
  return { ...state, backlog: { ...state.backlog!, stories }, edits: state.edits + 1, ...extra };
}

// Proposed stories keep their NEW-<n> IDs: nothing here renumbers (that is what accepting does, see proposals.js).
export function reducer(state: ProposalsState, action: ProposalsAction): ProposalsState {
  switch (action.type) {
    case 'loaded': {
      const stories = action.backlog.stories;
      const previousIndex = action.keepSelection ? stories.findIndex((s) => s.id === state.selectedId) : -1;
      return {
        ...state,
        current: action.name,
        backlog: action.backlog,
        selectedId: stories.length ? stories[Math.min(Math.max(previousIndex, 0), stories.length - 1)]!.id : null,
      };
    }
    case 'cleared':
      return { ...state, current: null, backlog: null, selectedId: null };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'edit': {
      const stories = state.backlog!.stories.map((s) => {
        if (s.id !== action.id) return s;
        const draft = { ...s, criteria: s.criteria.map((c) => ({ ...c })) };
        action.change(draft);
        return draft;
      });
      return withStories(state, stories);
    }
    // The new story gets a placeholder above every NEW-<n> the proposals and the backlog's Depends On still use.
    case 'add': {
      const story = { ...action.story, code: nextPlaceholder(state.backlog!.stories, action.backlogStories ?? []) };
      return withStories(state, [...state.backlog!.stories, story], { selectedId: story.id });
    }
    // The Epic field was left: remember the committed epic. The ID does not depend on it.
    case 'commitEpic': {
      const s = state.backlog!.stories.find((x) => x.id === action.id);
      if (!s || s.codedEpic === s.epic) return state;
      return withStories(state, state.backlog!.stories.map((x) => (x === s ? { ...s, codedEpic: s.epic } : x)));
    }
    case 'delete': {
      const stories = state.backlog!.stories;
      const i = stories.findIndex((s) => s.id === action.id);
      if (i < 0) return state;
      const rest = removeProposed(stories, action.id);
      return withStories(state, rest, { selectedId: rest.length ? rest[Math.min(i, rest.length - 1)]!.id : null });
    }
    case 'deleteMany': {
      const stories = state.backlog!.stories;
      const rest = stories.filter((s) => !action.ids.has(s.id));
      if (rest.length === stories.length) return state;
      const keep = rest.some((s) => s.id === state.selectedId);
      return withStories(state, rest, { selectedId: keep ? state.selectedId : (rest[0]?.id ?? null) });
    }
    case 'move': {
      const stories = moveProposed(state.backlog!.stories, action.id, action.epic, action.beforeId);
      return stories === state.backlog!.stories ? state : withStories(state, stories, { selectedId: action.id });
    }
    // The remaining proposed stories after an accept.
    case 'replaceStories': {
      const stories = action.stories;
      const keep = stories.some((s) => s.id === state.selectedId);
      return withStories(state, stories, { selectedId: keep ? state.selectedId : (stories[0]?.id ?? null) });
    }
    // The backlog's story IDs changed (old code -> new code, '' = deleted): the Depends On entries follow. Same state when none names one.
    case 'relink': {
      if (!state.backlog) return state;
      const stories = relinkStories(state.backlog.stories, action.changes);
      return stories === state.backlog.stories ? state : withStories(state, stories);
    }
    default:
      return state;
  }
}

// The proposed stories of the open backlog (`current`, a file name): loads proposals/<current>, edits them and keeps
// them on disk. A missing file is an empty list; the first save creates it. `headers` are the backlog's, used for a
// file that does not exist yet so unknown columns line up.
export function useProposals(current: string | null | undefined, headers: readonly string[] | undefined, initials: string) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [status, setStatus] = useState<StatusReport>({ kind: 'idle', detail: '' });
  const [message, setMessage] = useState<string | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const headersRef = useRef(headers);
  headersRef.current = headers;
  const initialsRef = useRef(initials);
  initialsRef.current = initials;
  const loadToken = useRef(0);

  const ask = useConfirm();
  const autosave = useAutosave({ store, stateRef, onStatus: setStatus, onMessage: setMessage });

  useEffect(() => {
    if (state.edits > 0) autosave.markDirty();
  }, [state.edits, autosave]);

  const actions = useMemo(() => {
    // Returns the text read, or null when there is no file. A stale call (another backlog opened meanwhile) is dropped.
    async function load(name: string, keepSelection: boolean) {
      const token = ++loadToken.current;
      let text: string | null = null;
      try {
        text = await store.read(name);
      } catch (err) {
        if (!(err instanceof FileApiError) || err.code !== 'not-found') throw err;
      }
      if (token !== loadToken.current) return;
      autosave.loaded(text);
      const backlog = text === null ? emptyFile(headersRef.current) : loadBacklog(text, { placeholderIds: true, initials: initialsRef.current });
      dispatch({ type: 'loaded', name, backlog, keepSelection });
      autosave.setStatus('saved');
    }

    return {
      // Resolves true once everything typed so far is on disk, false if saving is failing.
      settle: () => autosave.settle(),

      // Switch to the proposals of another backlog (or none). Edits still waiting for a save are saved first.
      async open(name: string | null) {
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
          setMessage(messageOf(err));
        }
      },

      // On tab focus: pick up a file changed outside (for example written by a skill). Local unsaved edits win.
      async refreshFromDisk() {
        const name = stateRef.current.current;
        if (!name) return;
        try {
          let text: string | null = null;
          try {
            text = await store.read(name);
          } catch (err) {
            if (!(err instanceof FileApiError) || err.code !== 'not-found') throw err;
          }
          if (text !== autosave.lastText() && !autosave.isBusy()) await load(name, true);
        } catch (err) {
          setMessage(messageOf(err));
        }
      },

      selectStory: (id: number | null) => dispatch({ type: 'select', id }),
      // `backlogStories` are read so the new placeholder avoids numbers the backlog still names.
      addStory: (backlogStories?: readonly Story[]) =>
        dispatch({ type: 'add', story: newStory(stateRef.current.backlog!.headers), backlogStories }),
      editStory: (id: number, change: (draft: Story) => void) => dispatch({ type: 'edit', id, change }),
      commitEpic: (id: number) => dispatch({ type: 'commitEpic', id }),
      moveStory: (id: number, epic: unknown, beforeId?: number | null) => dispatch({ type: 'move', id, epic, beforeId }),
      replaceStories: (stories: Proposal[]) => dispatch({ type: 'replaceStories', stories }),
      relinkStories: (changes: ReadonlyMap<string, string>) => dispatch({ type: 'relink', changes }),

      // Asks first. `ids` is the set of ticked stories. Resolves true when they were deleted.
      async deleteMany(ids: ReadonlySet<number>) {
        if (!ids.size) return false;
        const noun = ids.size === 1 ? 'story' : 'stories';
        const confirmed = await ask({ title: `Delete ${ids.size} proposed ${noun}?`, message: `${ids.size} proposed ${noun} will be removed from the proposals file.\n\nThis cannot be undone.`, confirmLabel: 'Delete', danger: true });
        if (!confirmed) return false;
        dispatch({ type: 'deleteMany', ids });
        return true;
      },
    };
  }, [autosave, ask]);

  // Follow the open backlog.
  useEffect(() => {
    actions.open(current ?? null);
  }, [current, actions]);

  const selected = state.backlog?.stories.find((s) => s.id === state.selectedId) ?? null;

  return { state, stories: state.backlog?.stories ?? [], selected, status, message, actions };
}
