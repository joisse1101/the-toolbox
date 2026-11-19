import { useEffect, useMemo, useRef } from 'react';
import type { Backlog, Story } from '#shared/types.ts';
import { relink } from '../api/files.ts';
import type { FileStore } from '../api/files.ts';
import { serializeBacklog } from '#shared/backlog/model.ts';
import { idChanges } from '#shared/backlog/ids.ts';
import { createRelinkQueue } from '../lib/relink-queue.ts';
import { useConfirm } from './useConfirm.ts';

const SAVE_DEBOUNCE_MS = 600;
const RETRY_FIRST_MS = 2000;
const RETRY_MAX_MS = 16000;

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

// Opt-in: follow the ID changes of the stories this file holds. `stories` reads the story list out of the state's `backlog`;
// `onIdChanges` receives each save's list (old code -> new code, '' = deleted) once the file is written, so the open
// backlog's own review rows and proposals can follow it. The other backlogs are rewritten by the server (see relink-queue.ts).
// `onRelinked` is called each time a relink job has reached the other backlogs' files.
export interface AutosaveIds<B> {
  stories: (backlog: B) => readonly Story[];
  onIdChanges: (changes: ReadonlyMap<string, string>) => void;
  onRelinked?: () => void;
}

// A forward replaces the '' (deleted) entry of the same old code: the story was moved to another backlog, not removed.
function withForwards(changes: Map<string, string>, forwards: ReadonlyMap<string, string>) {
  for (const [oldCode, newCode] of forwards) if (changes.get(oldCode) === '') changes.set(oldCode, newCode);
  return changes;
}

// Debounced auto-save of the open backlog. `stateRef.current` must always hold the latest store state
// ({ current, backlog }); the save machine reads it when a write starts, so it never writes stale text.
// One write in flight at a time; edits made during a write trigger one follow-up with the latest state.
// With `ids`, each write also works out the stories' ID changes against the stories on disk (the baseline, set by
// `loaded(text, stories)` and after each write) and queues a relink of the other backlogs; the status stays saving (or failed,
// naming the file) until the queue is empty, and `settle` and the page-close warning wait for it.
// `serialize(backlog)` turns the state's `backlog` into the file text (default: a backlog CSV); pass a stable function.
export function useAutosave<B = Backlog>({ store, stateRef, onStatus, onMessage, serialize = serializeBacklog as unknown as (backlog: B) => string, ids }: { // the default only runs for the backlog store, where B is Backlog
  store: Pick<FileStore, 'write'>;
  stateRef: { current: AutosaveState<B> };
  onStatus: (status: StatusReport) => void;
  onMessage: (message: string | null) => void;
  serialize?: (backlog: B) => string;
  ids?: AutosaveIds<B>;
}) {
  const ask = useConfirm();
  const callbacks = useRef({ onStatus, onMessage });
  callbacks.current = { onStatus, onMessage };
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const api = useMemo(() => {
    const queue = createRelinkQueue(relink);
    const m: {
      dirty: boolean; inFlight: Promise<void> | null; status: SaveStatus; lastText: string | null;
      saveTimer: ReturnType<typeof setTimeout> | undefined; retryTimer: ReturnType<typeof setTimeout> | undefined; retryDelay: number;
      baseline: readonly Story[] | null; forwards: Map<string, string>;
    } = { dirty: false, inFlight: null, status: 'idle', lastText: null, saveTimer: undefined, retryTimer: undefined, retryDelay: RETRY_FIRST_MS, baseline: null, forwards: new Map() };

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

    // A failed write or relink: show it and try again later, with a growing delay shared by both.
    function failAndRetry(detail: string) {
      setStatus('failed', detail);
      m.retryTimer = setTimeout(flush, m.retryDelay);
      m.retryDelay = Math.min(m.retryDelay * 2, RETRY_MAX_MS);
    }

    // Writes the file. Resolves true on success. With `ids`, the save's ID changes join the relink queue once the write is on disk.
    async function writeFile(name: string, backlog: B) {
      const text = serialize(backlog);
      const stories = idsRef.current?.stories(backlog);
      const forwards = new Map(m.forwards);
      const changes = stories && m.baseline ? withForwards(idChanges(m.baseline, stories), forwards) : new Map<string, string>();
      m.dirty = false;
      try {
        await store.write(name, text);
      } catch (err) {
        m.dirty = true;
        failAndRetry(err instanceof Error ? err.message : String(err));
        return false;
      }
      m.lastText = text;
      m.retryDelay = RETRY_FIRST_MS;
      if (stories) m.baseline = stories;
      for (const oldCode of forwards.keys()) m.forwards.delete(oldCode);
      if (changes.size) {
        queue.enqueue(name, changes);
        idsRef.current?.onIdChanges(changes);
      }
      return true;
    }

    // Runs the queued relinks. Resolves true when the queue is empty.
    async function runQueue() {
      const result = await queue.run();
      if (!result.ok) {
        failAndRetry(`Links in other backlogs could not be updated: ${result.message}`);
        return false;
      }
      m.retryDelay = RETRY_FIRST_MS;
      idsRef.current?.onRelinked?.();
      return true;
    }

    // One step at a time: write the file when it is dirty, else run the queued relinks. After a step that worked, the next one
    // starts, and the status turns to saved only when neither is left.
    function flush(): Promise<void> {
      if (m.inFlight) return m.inFlight;
      const { current: name, backlog } = stateRef.current;
      const writing = m.dirty && !!name;
      if (!writing && queue.isEmpty()) return Promise.resolve();
      clearTimeout(m.retryTimer);
      setStatus('saving');
      m.inFlight = (async () => {
        let worked: boolean;
        try {
          worked = writing ? await writeFile(name!, backlog!) : await runQueue();
        } finally {
          m.inFlight = null;
        }
        if (!worked) return;
        if (m.dirty || !queue.isEmpty()) await flush();
        else setStatus('saved');
      })();
      return m.inFlight;
    }

    // Waits until everything typed so far is on disk, and (unless `waitForQueue` is false) in the other backlogs.
    // Resolves false if saving is failing.
    async function settle(waitForQueue = true) {
      clearTimeout(m.saveTimer);
      while (m.dirty || m.inFlight || (waitForQueue && !queue.isEmpty())) {
        await flush();
        if (m.status === 'failed' && (waitForQueue || m.dirty)) return false;
      }
      return true;
    }

    // For actions that leave the current file: save first, or ask before discarding failed edits. Queued relinks keep
    // running for the backlog they belong to, so a failing relink alone does not hold the user here.
    async function leaveCurrentFile() {
      if (!stateRef.current.current || (await settle(false))) return true;
      const discard = await ask({ title: 'Discard unsaved changes?', message: 'Your latest changes could not be saved. Continue and discard them?', confirmLabel: 'Discard changes', danger: true });
      if (!discard) return false;
      if (queue.isEmpty()) clearTimeout(m.retryTimer);
      m.dirty = false;
      return true;
    }

    return {
      // A load or clear says saved or idle, which would hide a relink that is still queued or failing.
      setStatus(kind: SaveStatus, detail = '') {
        const hidesQueue = (kind === 'saved' || kind === 'idle') && !queue.isEmpty();
        if (!hidesQueue) setStatus(kind, detail);
      },
      markDirty,
      settle,
      leaveCurrentFile,
      // The file now on screen was just read from disk (or there is none): nothing is pending. `stories` (with `ids`) are
      // the stories as that text holds them, before any renumber on load: the baseline the next save's ID changes start from.
      loaded(text: string | null, stories: readonly Story[] | null = null) {
        m.lastText = text;
        m.dirty = false;
        m.baseline = stories;
      },
      // The next save's list reports these old codes as moved to a new code (in another backlog) instead of deleted.
      registerForwards(forwards: ReadonlyMap<string, string>) {
        for (const [oldCode, newCode] of forwards) m.forwards.set(oldCode, newCode);
      },
      discardPending() {
        m.dirty = false;
      },
      isBusy: () => m.dirty || !!m.inFlight || !queue.isEmpty(),
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
