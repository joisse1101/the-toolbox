import type { ReactNode } from 'react';
import type { Story } from '#shared/types.ts';
import { storyLabel as title } from '#shared/backlog/model.ts';

// A story of another backlog, as the detail list names it: not openable here.
export interface ForeignStory {
  code: string;
  title: string;
  backlog: string;
}

// Coarse levels: the story dependencies behind the selected group or arrow, and a button to show them as stories.
// A story of the open backlog is a button that opens it; a story of another backlog is its ID, Title and backlog name.
export default function GraphDetail({ detailPairs, byId, foreign, canShowStories, onOpen, onShowStories }: {
  detailPairs: Array<{ from: number; to: number }> | null;
  byId: Map<number, Story>;
  foreign: Map<number, ForeignStory>;
  canShowStories: boolean;
  onOpen: (id: number) => void;
  onShowStories: () => void;
}) {
  if (!detailPairs) return null;
  const end = (id: number): ReactNode => {
    const open = byId.get(id);
    if (open) return <button type="button" className="link-btn" onClick={() => onOpen(id)}>{open.code} {title(open)}</button>;
    const other = foreign.get(id)!;
    return <span className="graph-detail-other">{other.code} {other.title} <span className="muted">({other.backlog})</span></span>;
  };
  return (
    <div className="graph-detail">
      <ul>
        {detailPairs.map((p) => (
          <li key={`${p.from}>${p.to}`}>
            {end(p.from)}
            {' depends on '}
            {end(p.to)}
          </li>
        ))}
      </ul>
      <button
        type="button" id="graphShowStories" disabled={!canShowStories} onClick={onShowStories}
        title={canShowStories ? undefined : 'None of these links has a story of the open backlog'}
      >Show stories</button>
    </div>
  );
}
