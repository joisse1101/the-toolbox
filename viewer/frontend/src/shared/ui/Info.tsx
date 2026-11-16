import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Popover (guideline and shortcuts): hover/focus shows (CSS), click pins, Escape or an outside click closes.
export default function Info({ id, buttonId, buttonClass = '', label, icon, popoverId, popoverClass = '', children }: {
  id?: string; buttonId?: string; buttonClass?: string; label: string; icon?: ReactNode; popoverId: string; popoverClass?: string; children?: ReactNode;
}) {
  const [pinned, setPinned] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setPinned(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinned(false);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <span className={`info${pinned ? ' pinned' : ''}`} id={id} ref={root}>
      <button
        type="button" className={`info-btn ${buttonClass}`.trim()} id={buttonId} aria-label={label}
        title={buttonClass.includes('shortcuts-btn') ? label : undefined}
        aria-expanded={pinned} aria-controls={popoverId} onClick={() => setPinned((p) => !p)}
      >
        {icon}
      </button>
      <div className={`popover${popoverClass ? ` ${popoverClass}` : ''}`} id={popoverId} role="tooltip">{children}</div>
    </span>
  );
}
