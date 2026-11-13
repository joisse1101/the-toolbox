import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmContext } from '../hooks/useConfirm.js';

// The one confirmation dialog of the portal. `request` is { title, message, confirmLabel, danger } or null (closed).
// `message` may hold blank lines, which become separate paragraphs. `onAnswer(true | false)` closes it.
// Only a `danger` request gets the bold red final button; any other confirm button is the normal primary one.
export function ConfirmDialog({ request, onAnswer }) {
  const ref = useRef(null);
  const cancelRef = useRef(null);
  const opener = useRef(null);
  const isOpen = !!request;

  // The dialog element only exists while open. showModal gives the backdrop and keeps Tab inside; Cancel takes focus
  // because it is the safe default. The dialog is unmounted on close, so remember the opener and focus it again.
  useEffect(() => {
    if (!isOpen) return undefined;
    opener.current = document.activeElement;
    if (!ref.current.open) ref.current.showModal();
    cancelRef.current.focus();
    return () => opener.current?.focus();
  }, [isOpen]);

  if (!request) return null;

  const paragraphs = String(request.message ?? '').split('\n\n');
  return (
    <dialog id="confirmDialog" className="confirm-dialog" ref={ref} aria-labelledby="confirmTitle" aria-describedby="confirmMessage" onCancel={(e) => { e.preventDefault(); onAnswer(false); }}>
      <h2 id="confirmTitle">{request.title}</h2>
      <div id="confirmMessage">
        {paragraphs.map((text) => <p key={text}>{text}</p>)}
      </div>
      <div className="dialog-actions">
        <button type="button" id="confirmCancelBtn" ref={cancelRef} onClick={() => onAnswer(false)}>Cancel</button>
        <button type="button" id="confirmOkBtn" className={request.danger ? 'confirm-danger' : 'primary'} onClick={() => onAnswer(true)}>{request.confirmLabel ?? 'Confirm'}</button>
      </div>
    </dialog>
  );
}

// Wraps the app once. `useConfirm()` then gives `ask(request)` anywhere below it: a promise that resolves true when the
// user confirms and false on Cancel or Escape, so `if (!(await ask({...}))) return` replaces the old blocking browser dialog.
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const ask = useCallback((next) => new Promise((resolve) => {
    resolver.current?.(false); // a second question answers the first one with No
    resolver.current = resolve;
    setRequest(next);
  }), []);

  const answer = useCallback((yes) => {
    const resolve = resolver.current;
    resolver.current = null;
    setRequest(null);
    resolve?.(yes);
  }, []);

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <ConfirmDialog request={request} onAnswer={answer} />
    </ConfirmContext.Provider>
  );
}
