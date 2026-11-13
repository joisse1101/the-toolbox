import { useEffect, useRef } from 'react';

const NAME_HINT = 'Optional';

// Add Project: link a code base (folder dialog, optional name, offer to create .plans) or create a new project from a name.
// `projects` is the useProjects hook's result. A refusal is shown inside the dialog, and nothing changes until it succeeds.
export default function AddProjectDialog({ projects }) {
  const { dialog, error, working, actions } = projects;
  const ref = useRef(null);
  const opener = useRef(null);
  const isOpen = !!dialog;

  // The dialog element only exists while open; showModal gives the backdrop, moves focus in and keeps Tab inside.
  // The dialog is unmounted on close, so the browser cannot return focus: remember the opener and focus it again.
  useEffect(() => {
    if (!isOpen) return undefined;
    opener.current = document.activeElement;
    if (!ref.current.open) ref.current.showModal();
    return () => opener.current?.focus();
  }, [isOpen]);

  if (!dialog) return null;

  const isLink = dialog.mode === 'link';
  const submitNew = (e) => {
    e.preventDefault();
    if (dialog.name.trim() && !working) actions.createProject();
  };

  // Shown right under the field it concerns, and announced when it appears.
  const errorText = error && <p id="addProjectError" className="error" role="alert">{error}</p>;

  return (
    <dialog id="addProjectDialog" className="add-project" ref={ref} aria-labelledby="addProjectTitle" onCancel={(e) => { e.preventDefault(); actions.closeDialog(); }}>
      <h2 id="addProjectTitle">Add Project</h2>
      <fieldset className="seg">
        <legend className="sr-only">How to add the project</legend>
        <label className="seg-item">
          <input type="radio" name="addProjectMode" value="link" checked={isLink} disabled={working} onChange={() => actions.setMode('link')} />
          Link a code base
        </label>
        <label className="seg-item">
          <input type="radio" name="addProjectMode" value="new" checked={!isLink} disabled={working} onChange={() => actions.setMode('new')} />
          New project
        </label>
      </fieldset>

      {isLink && !dialog.offer && (
        <div className="dialog-body">
          <p className="muted">Choose the code base folder. Its backlogs are kept in its .plans folder. The name is optional and replaces the folder name in the Project dropdown.</p>
          <label htmlFor="addProjectName">Name</label>
          <input type="text" id="addProjectName" autoComplete="off" spellCheck={false} value={dialog.name} placeholder={NAME_HINT} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'addProjectError' : undefined} onChange={(e) => actions.setName(e.target.value)} />
          {errorText}
          <div className="dialog-actions">
            <button type="button" id="addProjectCancelBtn" onClick={actions.closeDialog}>Cancel</button>
            <button type="button" id="addProjectChooseBtn" className="primary" disabled={working} onClick={actions.linkCodeBase}>Choose folder…</button>
          </div>
        </div>
      )}

      {isLink && dialog.offer && (
        <div className="dialog-body" id="addProjectOffer">
          <p>{`${dialog.offer.codeBase} has no planner files yet. Create its .plans folder with a first backlog?`}</p>
          {errorText}
          <div className="dialog-actions">
            <button type="button" id="addProjectDeclineBtn" disabled={working} onClick={actions.declineOffer}>No, do not add it</button>
            <button type="button" id="addProjectCreateBtn" className="primary" disabled={working} onClick={actions.acceptOffer}>Create .plans and add</button>
          </div>
        </div>
      )}

      {!isLink && (
        <form className="dialog-body" onSubmit={submitNew}>
          <p className="muted">Creates a folder with this name in planner/data, with a first backlog.</p>
          <label htmlFor="newProjectName">Project name</label>
          <input type="text" id="newProjectName" autoComplete="off" spellCheck={false} autoFocus value={dialog.name} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'addProjectError' : undefined} onChange={(e) => actions.setName(e.target.value)} />
          {errorText}
          <div className="dialog-actions">
            <button type="button" id="newProjectCancelBtn" onClick={actions.closeDialog}>Cancel</button>
            <button type="submit" id="newProjectCreateBtn" className="primary" disabled={working || !dialog.name.trim()}>Create project</button>
          </div>
        </form>
      )}
    </dialog>
  );
}
