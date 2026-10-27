import { useEffect, useState } from 'react';
import { listBackups, compareBackups } from '../../shared/files.js';
import { diffLines } from '../diff-lines.js';

const CURRENT = 'current';

// 2026-10-15_143205-2 -> 2026-10-15 14:32:05 (#2)
function label(folder) {
  const [, date, h, m, s, n] = /^(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})(\d{2})(?:-(\d+))?$/.exec(folder);
  return `${date} ${h}:${m}:${s}${n ? ` (#${n})` : ''}`;
}

// The backups of the open backlog, newest first, and a diff between any two of them or one against the current files.
// `settleAll` resolves true once every pending save is on disk; `refreshToken` changes when a backup was just made.
export default function BackupsTab({ name, hidden, refreshToken, settleAll }) {
  const [backups, setBackups] = useState(null); // null while loading
  const [a, setA] = useState('');
  const [b, setB] = useState(CURRENT);
  const [result, setResult] = useState(null); // { diff } or { error }
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    if (hidden || !name) return undefined;
    let cancelled = false;
    setResult(null);
    listBackups(name).then(
      (list) => {
        if (cancelled) return;
        setBackups(list);
        setA((prev) => (list.some((x) => x.folder === prev) ? prev : (list[0]?.folder ?? '')));
        setB((prev) => (prev === CURRENT || list.some((x) => x.folder === prev) ? prev : CURRENT));
      },
      (err) => !cancelled && setResult({ error: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [name, hidden, refreshToken]);

  const compare = async () => {
    setComparing(true);
    setResult(null);
    try {
      // "Current" must match the screen, so pending edits are written first.
      if ((a === CURRENT || b === CURRENT) && !(await settleAll())) {
        return setResult({ error: 'The latest changes could not be saved yet, so "Current" would not match the screen.' });
      }
      setResult({ diff: await compareBackups(name, a, b) });
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setComparing(false);
    }
  };

  const options = [
    ...(backups ?? []).map((x) => <option key={x.folder} value={x.folder}>{label(x.folder)}</option>),
    <option key={CURRENT} value={CURRENT}>Current</option>,
  ];

  return (
    <section id="backupsView" className="card" role="tabpanel" aria-labelledby="tabBackups" hidden={hidden}>
      {backups && backups.length === 0 && (
        <p className="muted">No backups of {name} yet. Press <strong>Backup</strong> in the file bar to make one.</p>
      )}
      {backups && backups.length > 0 && (
        <>
          <p className="muted">{backups.length} backup{backups.length > 1 ? 's' : ''}, newest first. Compare two of them, or one with the current files.</p>
          <div className="row">
            <div className="grow">
              <label htmlFor="backupA">From</label>
              <select id="backupA" value={a} onChange={(e) => setA(e.target.value)}>{options}</select>
            </div>
            <div className="grow">
              <label htmlFor="backupB">To</label>
              <select id="backupB" value={b} onChange={(e) => setB(e.target.value)}>{options}</select>
            </div>
            <button type="button" id="compareBtn" disabled={!a || a === b || comparing} onClick={compare}>Compare</button>
          </div>
        </>
      )}
      {result?.error && <p className="warning" role="alert">{result.error}</p>}
      {result && result.diff === '' && <p className="muted">No differences.</p>}
      {result?.diff && (
        <pre className="diff" aria-label="Differences">
          {diffLines(result.diff).map((line, i) => (
            <div key={i}>{line.length ? line.map((p, j) => <span key={j} className={p.kind ? `diff-${p.kind}` : undefined}>{p.text}</span>) : '​'}</div>
          ))}
        </pre>
      )}
    </section>
  );
}
