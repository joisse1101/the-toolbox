import { useEffect, useMemo, useRef } from 'react';
import { serializeBacklog } from '../../../../core/model.js';

const SAVE_DEBOUNCE_MS = 600;

// Debounced auto-save of the open backlog. `stateRef.current` must always hold the latest store state
// ({ current, backlog }); the save machine reads it when a write starts, so it never writes stale text.
// One write in flight at a time; edits made during a write trigger one follow-up with the latest state.
// `serialize(backlog)` turns the state's `backlog` into the file text (default: a backlog CSV); pass a stable function.
export function useAutosave({ store, stateRef, onStatus, onMessage, serialize = serializeBacklog }) {
  const callbacks = useRef({ onStatus, onMessage });
  callbacks.current = { onStatus, onMessage };

  const api = useMemo(() => {
    const m = { dirty: false, inFlight: null, status: 'idle', lastText: null, saveTimer: null, retryTimer: null, retryDelay: 2000 };

    function setStatus(kind, detail = '') {
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
      const text = serialize(backlog);
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
          setStatus('failed', err.message);
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
      if (!confirm('Your latest changes could not be saved. Continue and discard them?')) return false;
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
      loaded(text) {
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
  }, [store, stateRef, serialize]);

  useEffect(() => {
    const warn = (e) => {
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
