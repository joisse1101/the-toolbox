import { useEffect, useRef, useState } from 'react';

// Backlog dropdown, rename, New and Open folder, plus the message banner.
export default function FileBar({ files, current, message, focusNameToken, onSelect, onRename, onNew, onOpenFolder }) {
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
          <label htmlFor="fileName">File name</label>
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
      </div>
      <p id="message" className="warning" hidden={!message}>{message || ''}</p>
    </section>
  );
}
