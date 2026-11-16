import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LexiconSuggestionsFile, ReviewStatus } from '../../../../../../shared/types.ts';
import { createFileStore, messageOf } from '../../../../shared/api/files.ts';
import { composeSuggestions, emptySuggestions, parseSuggestions } from '../../../../../../shared/lexicon/lexicon-suggestions.ts';

const store = createFileStore('lexicon-suggestions');
const SAVE_DEBOUNCE_MS = 400;
const RETRY_START_MS = 2000;
const RETRY_MAX_MS = 30000;

// The suggested term renames and deletes for the open backlog (lexicon-suggestions/<same file name>), written by the
// jois-story-propose skill. Loaded when the backlog opens and on Reload. Apply/Dismiss change a row's Status; the file is
// rewritten shortly after and retried while it is locked (open in Excel), like the review suggestions.
export function useLexiconSuggestions(current: string | null | undefined) {
  const [file, setFile] = useState(emptySuggestions);
  const [message, setMessage] = useState<string | null>(null);
  const m = useRef<{
    file: LexiconSuggestionsFile; name: string | null | undefined; dirty: boolean; dirtyName: string | null; inFlight: Promise<void> | null;
    timer: ReturnType<typeof setTimeout> | undefined; retry: ReturnType<typeof setTimeout> | undefined; delay: number;
  }>({ file: emptySuggestions(), name: null, dirty: false, dirtyName: null, inFlight: null, timer: undefined, retry: undefined, delay: RETRY_START_MS }).current;

  const setAll = useCallback((next: LexiconSuggestionsFile) => {
    m.file = next;
    setFile(next);
  }, [m]);

  const flush = useCallback(async (): Promise<void> => {
    clearTimeout(m.timer);
    clearTimeout(m.retry);
    if (m.inFlight) return m.inFlight;
    if (!m.dirty) return undefined;
    const name = m.dirtyName!;
    const text = composeSuggestions(m.file);
    m.dirty = false;
    m.inFlight = (async () => {
      try {
        await store.write(name, text);
        m.delay = RETRY_START_MS;
        setMessage(null);
      } catch (err) {
        m.dirty = true;
        setMessage(`${messageOf(err)} The status of lexicon suggestions is not saved yet; retrying.`);
        m.retry = setTimeout(flush, m.delay);
        m.delay = Math.min(m.delay * 2, RETRY_MAX_MS);
      } finally {
        m.inFlight = null;
      }
    })();
    return m.inFlight;
  }, [m]);

  // Waits until the decisions made so far are on disk. Resolves false if the file could not be written.
  const settle = useCallback(async () => {
    await flush();
    await flush(); // a decision made while the first write was running
    return !m.dirty && !m.inFlight;
  }, [m, flush]);

  const load = useCallback(async () => {
    const name = m.name;
    if (!name || m.dirty || m.inFlight) return;
    try {
      const files = await store.list();
      if (m.name !== name || m.dirty || m.inFlight) return;
      if (!files.includes(name)) {
        setAll(emptySuggestions());
        setMessage(null);
        return;
      }
      const text = await store.read(name);
      if (m.name !== name || m.dirty || m.inFlight) return;
      const parsed = parseSuggestions(text);
      setAll(parsed);
      setMessage(parsed.skipped ? `${parsed.skipped} row${parsed.skipped > 1 ? 's' : ''} of the lexicon suggestions file could not be read and ${parsed.skipped > 1 ? 'were' : 'was'} ignored.` : null);
    } catch (err) {
      if (m.name !== name) return;
      setAll(emptySuggestions());
      setMessage(`Could not read the lexicon suggestions: ${messageOf(err)}`);
    }
  }, [m, setAll]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await flush(); // decisions made on the previous backlog go to its own file first
      if (cancelled) return;
      m.dirty = false;
      m.name = current;
      setAll(emptySuggestions());
      setMessage(null);
      if (current) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [current, flush, load, m, setAll]);

  // Mark the row at `index` applied or dismissed and save the file.
  const decide = useCallback((index: number, status: ReviewStatus) => {
    if (!m.name) return;
    setAll({ ...m.file, rows: m.file.rows.map((r, i) => (i === index ? { ...r, status } : r)) });
    m.dirty = true;
    m.dirtyName = m.name;
    clearTimeout(m.timer);
    clearTimeout(m.retry);
    m.timer = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }, [m, setAll, flush]);

  useEffect(() => () => {
    clearTimeout(m.timer);
    clearTimeout(m.retry);
  }, [m]);

  return useMemo(() => ({ file, message, decide, settle, reload: load }), [file, message, decide, settle, load]);
}
