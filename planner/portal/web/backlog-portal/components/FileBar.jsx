import { useEffect, useRef, useState } from 'react';
import AddProjectDialog from './AddProjectDialog.jsx';

const ADD_PROJECT = 'add-project';

// Project dropdown, Backlog dropdown, rename, Initials, New, Open folder and Refresh, plus the message banners.
// `projects` is the useProjects hook's result; the Add Project dialog is shown from here.
export default function FileBar({ files, current, initials = '', message, olderLayout = [], focusNameToken, projects, onSelect, onRename, onSetInitials, onNew, onOpenFolder, onRefresh }) {
  const [draft, setDraft] = useState(current ?? '');
  const nameRef = useRef(null);
  const cancelled = useRef(false);
  const [initialsDraft, setInitialsDraft] = useState(initials);
  const [initialsError, setInitialsError] = useState('');
  const initialsCancelled = useRef(false);

  useEffect(() => setDraft(current ?? ''), [current]);
  useEffect(() => {
    setInitialsDraft(initials);
    setInitialsError('');
  }, [current, initials]);

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

  // Committed when the box is left, like the name. A refusal keeps the old initials and shows the server's message.
  const commitInitials = async () => {
    if (initialsCancelled.current) {
      initialsCancelled.current = false;
      setInitialsError('');
      return setInitialsDraft(initials);
    }
    if (!current || initialsDraft.trim().toUpperCase() === initials) {
      setInitialsError('');
      return setInitialsDraft(initials);
    }
    const result = await onSetInitials(initialsDraft);
    if (result.error) {
      setInitialsError(result.error);
      return setInitialsDraft(initials);
    }
    setInitialsError('');
  };

  const onProjectChange = (e) => {
    if (e.target.value === ADD_PROJECT) return projects.actions.openDialog();
    return projects.actions.choose(Number(e.target.value));
  };

  return (
    <section className="card file-bar">
      <div className="row">
        <div className="grow project-pick">
          <label htmlFor="projectSelect">Project</label>
          <select id="projectSelect" value={projects.activeProject < 0 ? '' : String(projects.activeProject)} disabled={projects.working} onChange={onProjectChange}>
            <option value={ADD_PROJECT}>Add Project…</option>
            {projects.projects.map((p, i) => (
              <option key={`${p.label}-${i}`} value={String(i)} disabled={!p.exists}>{p.exists ? p.label : `${p.label} (folder missing)`}</option>
            ))}
          </select>
        </div>
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
        <div className="initials-field">
          <label htmlFor="initials">Initials</label>
          <input
            type="text" id="initials" autoComplete="off" spellCheck={false}
            value={initialsDraft} disabled={!current}
            aria-invalid={initialsError ? 'true' : undefined} aria-describedby={initialsError ? 'initialsError' : undefined}
            title="Starts the ID of every story in this backlog, for example B1-IAM-0003. Frozen stories keep the initials they have."
            onChange={(e) => setInitialsDraft(e.target.value)}
            onBlur={commitInitials}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur();
              if (e.key === 'Escape') {
                initialsCancelled.current = true;
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
      {initialsError && <p id="initialsError" className="error" role="alert">{initialsError}</p>}
      {projects.error && !projects.dialog && <p id="projectError" className="error" role="alert">{projects.error}</p>}
      <p id="message" className="warning" hidden={!message}>{message || ''}</p>
      <AddProjectDialog projects={projects} />
    </section>
  );
}
