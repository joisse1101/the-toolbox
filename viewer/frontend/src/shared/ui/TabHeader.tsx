// The top line of every tab: its title on the left and its actions (buttons) on the right.
import type { ReactNode } from 'react';

export default function TabHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="tab-header">
      <h2>{title}</h2>
      {children && <div className="tab-actions">{children}</div>}
    </div>
  );
}
