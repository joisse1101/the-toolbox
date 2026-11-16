import { useEffect, useMemo, useRef } from 'react';
import type { Backlog } from '#shared/types.ts';
import type { FileStore } from '../api/files.ts';
import { serializeBacklog } from '#shared/backlog/model.ts';
import { useConfirm } from './useConfirm.ts';

const SAVE_DEBOUNCE_MS = 600;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';
export interface StatusReport {
  kind: SaveStatus;
  detail: string;
}

// What the machine reads from the store: the open file's name and the data that `serialize` turns into its text.
export interface AutosaveState<B> {
  current: string | null;
  backlog: B | null;
}

// Debounced auto-save of the open backlog. `stateRef.current` must always hold the latest store state
// ({ current, backlog }); the save machine reads it when a write starts, so it never writes stale text.
// One write in flight at a time; edits made during a write trigger one follow-up with the latest state.
// `serialize(backlog)` turns the state's `backlog` into the file text (default: a backlog CSV); pass a stable function.
export function useAutosave<B = Backlog>({ store, stateRef, onStatus, onMessage, serialize = serializeBacklog as unknown as (backlog: B) => string }: { // the default only runs for the backlog store, where B is Backlog
  store: Pick<FileStore, 'write'>;
  stateRef: { current: AutosaveState<B> };
  onStatus: (status: StatusReport) => void;
  onMessage: (message: string | null) => void;
  serialize?: (backlog: B) => string;
}) {
  const ask = useConfirm();
  const callbacks = useRef({ onStatus, onMessage });
  callbacks.current = { onStatus, onMessage };

  const api = useMemo(() => {
    const m: {
      dirty: boolean; inFlight: Promise<void> | null; status: SaveStatus; lastText: string | null;
      saveTimer: ReturnType<typeof setTimeout> | undefined; retryTimer: ReturnType<typeof setTimeout> | undefined; retryDelay: number;
    } = { dirty: false, inFlight: null, status: 'idle', lastText: null, saveTimer: undefined, retryTimer: undefined, retryDelay: 2000 };

    function setStatus(kind: SaveStatus, detail = '') {
      m.status = kind;
      callbacks.current.onStatus({ kind, detail });
      if (kind === 'failed') callbacks.current.onMessage(`${detail} Your edits are kept here and saving will retry automatically.`);
      else if (kind === 'saved') callbacks.current.onMessage(null);
    }

    function markDirty() {
      if (!stateRef.current.current) return;
      m.dirty = true;
      setStatus('saving');
      clearTimeout(m.saveTimer);
      m.saveTimer = setTimeout(flush, SAVE_DEBOUNCE_MS);
    }

    function flush() {
      const { current: name, backlog } = stateRef.current;
      if (m.inFlight || !m.dirty || !name) return m.inFlight ?? Promise.resolve();
      clearTimeout(m.retryTimer);
      const text = serialize(backlog!);
      m.dirty = false;
      setStatus('saving');
      m.inFlight = (async () => {
        let failed = false;
        try {
          await store.write(name, text);
          m.lastText = text;
          m.retryDelay = 2000;
        } catch (err) {
          failed = true;
          m.dirty = true;
          setStatus('failed', err instanceof Error ? err.message : String(err));
          m.retryTimer = setTimeout(flush, m.retryDelay);
          m.retryDelay = Math.min(m.retryDelay * 2, 16000);
        } finally {
          m.inFlight = null;
        }
        if (failed) return;
        if (m.dirty) flush();
        else setStatus('saved');
      })();
      return m.inFlight;
    }

    // Waits until everything typed so far is on disk. Resolves false if saving is failing.
    async function settle() {
      clearTimeout(m.saveTimer);
      while (m.dirty || m.inFlight) {
        await (m.inFlight ?? flush());
        if (m.status === 'failed') return false;
      }
      return true;
    }

    // For actions that leave the current file: save first, or ask before discarding failed edits.
    async function leaveCurrentFile() {
      if (!stateRef.current.current || (await settle())) return true;
      const discard = await ask({ title: 'Discard unsaved changes?', message: 'Your latest changes could not be saved. Continue and discard them?', confirmLabel: 'Discard changes', danger: true });
      if (!discard) return false;
      clearTimeout(m.retryTimer);
      m.dirty = false;
      return true;
    }

    return {
      setStatus,
      markDirty,
      settle,
      leaveCurrentFile,
      // The file now on screen was just read from disk (or there is none): nothing is pending.
      loaded(text: string | null) {
        m.lastText = text;
        m.dirty = false;
      },
      discardPending() {
        m.dirty = false;
      },
      isBusy: () => m.dirty || !!m.inFlight,
      isFailed: () => m.status === 'failed',
      lastText: () => m.lastText,
    };
  }, [store, stateRef, serialize, ask]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (api.isBusy() || api.isFailed()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [api]);

  return api;
}
