import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFileStore } from '../../shared/files.js';
import { parseReview, serializeReview } from '../../../../core/review.js';

const store = createFileStore('reviews');
const SAVE_DEBOUNCE_MS = 400;
const RETRY_START_MS = 2000;
const RETRY_MAX_MS = 30000;

// The review suggestions for the open backlog (reviews/<same file name>). Rows are loaded when the backlog opens
// and on tab focus. Apply/Dismiss change a row's Status; the file is rewritten shortly after, and retried when it is
// locked (open in Excel). A failed review write never undoes the backlog edit.
export function useReview(current) {
  const [rows, setRows] = useState([]);
  const [exists, setExists] = useState(false); // the backlog has a review file (even one with no open rows)
  const [message, setMessage] = useState(null); // problem with the review file itself
  const [notice, setNotice] = useState(null); // why the last Apply did nothing
  const m = useRef({ rows: [], name: null, dirty: false, dirtyName: null, inFlight: null, timer: null, retry: null, delay: RETRY_START_MS }).current;

  const setAll = useCallback((next) => {
    m.rows = next;
    setRows(next);
  }, [m]);

  const flush = useCallback(async () => {
    clearTimeout(m.timer);
    clearTimeout(m.retry);
    if (m.inFlight) return m.inFlight;
    if (!m.dirty) return undefined;
    const name = m.dirtyName;
    const text = serializeReview(m.rows);
    m.dirty = false;
    m.inFlight = (async () => {
      try {
        await store.write(name, text);
        m.delay = RETRY_START_MS;
        setMessage(null);
      } catch (err) {
        m.dirty = true;
        setMessage(`${err.message} The Apply/Dismiss status of review suggestions is not saved yet; retrying.`);
        m.retry = setTimeout(flush, m.delay);
        m.delay = Math.min(m.delay * 2, RETRY_MAX_MS);
      } finally {
        m.inFlight = null;
      }
    })();
    return m.inFlight;
  }, [m]);

  const load = useCallback(async () => {
    const name = m.name;
    if (!name || m.dirty || m.inFlight) return;
    try {
      const files = await store.list();
      if (m.name !== name || m.dirty || m.inFlight) return;
      if (!files.includes(name)) {
        setAll([]);
        setExists(false);
        setMessage(null);
        return;
      }
      const text = await store.read(name);
      if (m.name !== name || m.dirty || m.inFlight) return;
      const parsed = parseReview(text);
      if (!parsed.ok) {
        setAll([]);
        setExists(false);
        setMessage(parsed.error);
        return;
      }
      setAll(parsed.rows);
      setExists(true);
      setMessage(parsed.skipped ? `${parsed.skipped} row${parsed.skipped > 1 ? 's' : ''} of the review file could not be read and ${parsed.skipped > 1 ? 'were' : 'was'} ignored.` : null);
    } catch (err) {
      if (m.name !== name) return;
      setAll([]);
      setExists(false);
      setMessage(`Could not read the review suggestions: ${err.message}`);
    }
  }, [m, setAll]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await flush(); // decisions made on the previous backlog go to its own review file first
      if (cancelled) return;
      m.dirty = false;
      m.name = current;
      setAll([]);
      setExists(false);
      setNotice(null);
      setMessage(null);
      if (current) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [current, flush, load, m, setAll]);

  // Mark rows (by index) applied or dismissed and save the file.
  const decide = useCallback((indexes, status) => {
    if (!m.name) return;
    const set = new Set(indexes);
    setAll(m.rows.map((r, i) => (set.has(i) ? { ...r, status } : r)));
    m.dirty = true;
    m.dirtyName = m.name;
    setNotice(null);
    clearTimeout(m.timer);
    clearTimeout(m.retry);
    m.timer = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }, [m, setAll, flush]);

  useEffect(() => () => {
    clearTimeout(m.timer);
    clearTimeout(m.retry);
  }, [m]);

  return useMemo(
    () => ({ rows, exists, message, notice, notify: setNotice, decide, reload: load }),
    [rows, exists, message, notice, decide, load],
  );
}
