import { useEffect, useRef, useState } from 'react';

// Backlog dropdown, rename, New, Open folder and Refresh, plus the message banners.
export default function FileBar({ files, current, message, olderLayout = [], focusNameToken, onSelect, onRename, onNew, onOpenFolder, onRefresh }) {
  const [draft, setDraft] = useState(current ?? '');
  const nameRef = useRef(null);
  const cancelled = useRef(false);

  useEffect(() => setDraft(current ?? ''), [current]);

  useEffect(() => {
    if (!focusNameToken) return;
    nameRef.current?.focus();
    nameRef.current?.select();
  }, [focusNameToken]);

  const commit = async () => {
    if (cancelled.current) {
      cancelled.current = false;
      return setDraft(current ?? '');
    }
    const wanted = draft.trim();
    if (!current || wanted === current) return setDraft(current ?? '');
    const renamed = await onRename(wanted);
    if (!renamed) setDraft(current);
  };

  return (
    <section className="card file-bar">
      <div className="row">
        <div className="grow">
          <label htmlFor="fileSelect">Backlog</label>
          <select id="fileSelect" value={current ?? ''} disabled={!files.length} onChange={(e) => onSelect(e.target.value)}>
            {files.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="grow">
          <label htmlFor="fileName">Backlog name</label>
          <input
            type="text" id="fileName" autoComplete="off" spellCheck={false} ref={nameRef}
            value={draft} disabled={!current}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur();
              if (e.key === 'Escape') {
                cancelled.current = true;
                e.target.blur();
              }
            }}
          />
        </div>
        <button type="button" id="newBtn" onClick={onNew}>New</button>
        <button type="button" id="openBtn" onClick={onOpenFolder}>Open folder</button>
        <button type="button" id="refreshBtn" className="icon-only" title="Refresh from the CSV files" aria-label="Refresh from the CSV files" onClick={onRefresh}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>
      {!files.length && olderLayout.length > 0 && (
        <p id="olderLayoutNotice" className="warning" role="status">
          No backlog folder here, but this data folder holds the older layout. Open the Settings tab and choose "Migrate older layout" to copy it.
        </p>
      )}
      <p id="message" className="warning" hidden={!message}>{message || ''}</p>
    </section>
  );
}
