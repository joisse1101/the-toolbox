import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Lexicon, LexiconSuggestion, LexiconTerm } from '#shared/types.ts';
import { FileApiError, createFileStore, messageOf } from '#frontend/src/shared/api/files.ts';
import { composeLexicon, deleteTerm, emptyLexicon, findTerm, parseLexicon, saveTerm } from '#shared/lexicon/lexicon.ts';
import { applySuggestion } from '#shared/lexicon/lexicon-suggestions.ts';
import { useAutosave } from '#frontend/src/shared/hooks/useAutosave.ts';
import type { StatusReport } from '#frontend/src/shared/hooks/useAutosave.ts';

const lexiconStore = createFileStore('lexicon');

// Saving a lexicon file that is not there yet creates it (the file API's write never does).
const store = {
  ...lexiconStore,
  // The server answers an empty file for a backlog without a lexicon; an empty text is the same as no file here.
  async read(name: string): Promise<string | null> {
    return (await lexiconStore.read(name)) || null;
  },
  async write(name: string, text: string) {
    try {
      await lexiconStore.write(name, text);
    } catch (err) {
      if (!(err instanceof FileApiError) || err.code !== 'not-found') throw err;
      await lexiconStore.create(name, text);
    }
  },
};

type TermInput = Parameters<typeof saveTerm>[1];

export interface LexiconState {
  current: string | null; // the backlog file name; the lexicon file has the same name
  backlog: Lexicon | null; // the parsed lexicon, under the name useAutosave expects
  selected: string | null; // name of the selected term
  error: string[] | null; // the messages when the last change was refused by a rule; the lexicon is then unchanged
  edits: number; // bumped by every change; the auto-save runs when it changes
}

export type LexiconAction =
  | { type: 'loaded'; name: string; lexicon: Lexicon; keepSelection?: boolean }
  | { type: 'cleared' }
  | { type: 'select'; name: string | null }
  | { type: 'clearError' }
  | { type: 'save'; term: TermInput; replaces?: string | null }
  | { type: 'delete'; name: string }
  | { type: 'apply'; row: LexiconSuggestion; avoid?: string[] };

const initial: LexiconState = {
  current: null,
  backlog: null,
  selected: null,
  error: null,
  edits: 0,
};

const firstName = (lexicon: Lexicon) => lexicon.terms[0]?.name ?? null;
const stillThere = (lexicon: Lexicon, name: string | null) => (name && findTerm(lexicon, name) ? findTerm(lexicon, name)!.name : null);

export function reducer(state: LexiconState, action: LexiconAction): LexiconState {
  switch (action.type) {
    case 'loaded':
      return {
        ...state,
        current: action.name,
        backlog: action.lexicon,
        selected: (action.keepSelection && stillThere(action.lexicon, state.selected)) || firstName(action.lexicon),
        error: null,
      };
    case 'cleared':
      return { ...state, current: null, backlog: null, selected: null, error: null };
    case 'select':
      return { ...state, selected: action.name, error: null };
    case 'clearError':
      return state.error ? { ...state, error: null } : state;
    // Adds a term, or with `replaces` changes that one (a new name also updates its children). A refused change keeps the lexicon.
    case 'save': {
      const result = saveTerm(state.backlog!, action.term, { replaces: action.replaces ?? null });
      if (!result.ok) return { ...state, error: result.errors };
      return { ...state, backlog: result.lexicon, selected: (action.term.name as string).trim(), error: null, edits: state.edits + 1 };
    }
    case 'delete': {
      const result = deleteTerm(state.backlog!, action.name);
      if (!result.ok) return { ...state, error: result.errors };
      const at = state.backlog!.terms.findIndex((t: LexiconTerm) => t.name === action.name);
      const next = result.lexicon.terms[Math.min(at, result.lexicon.terms.length - 1)]?.name ?? null;
      return { ...state, backlog: result.lexicon, selected: next, error: null, edits: state.edits + 1 };
    }
    // Applies a lexicon suggestion (a rename with its Avoid words in one save, or a delete). A refusal keeps the lexicon.
    case 'apply': {
      const result = applySuggestion(state.backlog!, action.row, { avoid: action.avoid });
      if (!result.ok) return state;
      const next = action.row.action === 'rename' ? action.row.newName : result.lexicon.terms[0]?.name ?? null;
      return { ...state, backlog: result.lexicon, selected: next, error: null, edits: state.edits + 1 };
    }
    default:
      return state;
  }
}

// The lexicon of the open backlog (`current`, a file name): loads lexicons/<current>, edits it and keeps it on
// disk. A missing file is an empty lexicon; the first save creates it.
export function useLexicon(current: string | null | undefined) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [status, setStatus] = useState<StatusReport>({ kind: 'idle', detail: '' });
  const [message, setMessage] = useState<string | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const loadToken = useRef(0);

  const autosave = useAutosave({ store, stateRef, onStatus: setStatus, onMessage: setMessage, serialize: composeLexicon });

  useEffect(() => {
    if (state.edits > 0) autosave.markDirty();
  }, [state.edits, autosave]);

  const actions = useMemo(() => {
    // Returns nothing; a stale call (another backlog opened meanwhile) is dropped.
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
      dispatch({ type: 'loaded', name, lexicon: text === null ? emptyLexicon() : parseLexicon(text), keepSelection });
      autosave.setStatus('saved');
    }

    return {
      // Resolves true once everything typed so far is on disk, false if saving is failing.
      settle: () => autosave.settle(),

      // Switch to the lexicon of another backlog (or none). Edits still waiting for a save are saved first.
      async open(name: string | null) {
        try {
          if (stateRef.current.current && !(await autosave.settle())) {
            setMessage('Lexicon edits could not be saved and were discarded.');
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

      // On Reload: pick up a file changed outside (for example written by a skill). Local unsaved edits win.
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

      select: (name: string | null) => dispatch({ type: 'select', name }),
      clearError: () => dispatch({ type: 'clearError' }),
      // Both return { ok, errors }; the same rules run in the reducer, which keeps the refusal in `state.error`.
      save(term: TermInput, replaces: string | null = null) {
        const result = saveTerm(stateRef.current.backlog!, term, { replaces });
        dispatch({ type: 'save', term, replaces });
        return result;
      },
      // Returns { ok, errors }; nothing changes unless ok.
      apply(row: LexiconSuggestion, avoid?: string[]) {
        const result = applySuggestion(stateRef.current.backlog!, row, { avoid });
        if (result.ok) dispatch({ type: 'apply', row, avoid });
        return result;
      },
      remove(name: string) {
        const result = deleteTerm(stateRef.current.backlog!, name);
        dispatch({ type: 'delete', name });
        return result;
      },
    };
  }, [autosave]);

  // Follow the open backlog.
  useEffect(() => {
    actions.open(current ?? null);
  }, [current, actions]);

  const lexicon = state.backlog ?? emptyLexicon();
  const selected = state.selected ? findTerm(lexicon, state.selected) : null;

  return { state, lexicon, selected, status, message, actions };
}
