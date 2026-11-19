import { useEffect, useRef, useState } from 'react';
import type { MigrateTarget } from './useMigrateFlow.ts';

// Asks which backlog the ticked stories move to. Nothing happens until Migrate is pressed; Cancel and Escape change nothing.
// `targets` is null while the other backlogs are being read.
export default function MigrateDialog({ count, source, targets, problem, onMigrate, onCancel }: {
  count: number; source: string; targets: MigrateTarget[] | null; problem: string | null;
  onMigrate: (name: string) => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const [chosen, setChosen] = useState('');

  // showModal gives the backdrop and keeps Tab inside. The dialog is unmounted on close, so focus goes back to its opener.
  useEffect(() => {
    opener.current = document.activeElement;
    ref.current!.showModal();
    return () => (opener.current as HTMLElement | null)?.focus();
  }, []);

  const noun = count === 1 ? 'story' : 'stories';
  return (
    <dialog id="migrateDialog" className="migrate-dialog" ref={ref} aria-labelledby="migrateTitle" aria-describedby="migrateHelp" onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <h2 id="migrateTitle">Migrate to another backlog</h2>
      <p id="migrateHelp">{`${count} ${noun} will move from ${source}. Choose the backlog they go to.`}</p>
      <fieldset className="migrate-targets">
        <legend className="sr-only">Target backlog</legend>
        {targets === null && <p className="muted" role="status">Reading the other backlogs…</p>}
        {targets?.map((t) => (
          <label key={t.name} className="seg-item">
            <input type="radio" name="migrateTarget" value={t.name} checked={chosen === t.name} onChange={() => setChosen(t.name)} />
            <span>{`${t.name} (${t.initials})`}</span>
          </label>
        ))}
        {targets?.length === 0 && <p className="muted">No other backlog could be read.</p>}
      </fieldset>
      {problem && <p className="warning" role="status">{problem}</p>}
      <div className="dialog-actions">
        <button type="button" id="migrateCancelBtn" onClick={onCancel}>Cancel</button>
        <button type="button" id="migrateOkBtn" className="primary" disabled={!chosen} onClick={() => onMigrate(chosen)}>Migrate</button>
      </div>
    </dialog>
  );
}
