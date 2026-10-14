import { useState } from 'react';
import { groupByEpic, storyIssues, storyLabel } from '../../../../core/model.js';
import { issueClass, rowTooltip } from './issues.js';

// Drag a story to reorder it inside its epic, or onto another epic's group to move it there. Dropping on the
// "(No epic)" group does nothing. `drag` is the story being dragged, `drop` = { epic, beforeId } where it would land
// (beforeId null = at the end of the group).
export default function StoryList({ stories, problems, suggestionCounts = new Map(), selectedId, onSelect, onAdd, onDelete, onMove, heading = 'Stories' }) {
  const [drag, setDrag] = useState(null);
  const [drop, setDrop] = useState(null);
  const [closed, setClosed] = useState(() => new Set()); // collapsed accordion keys; everything starts open

  const epicKey = (g) => `e:${g.epic}`;
  const featureKey = (g, f) => `f:${g.epic}\n${f.feature}`;
  const toggle = (key) => setClosed((prev) => {
    const next = new Set(prev);
    if (!next.delete(key)) next.add(key);
    return next;
  });
  const toggleKey = (e, key) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(key);
    }
  };

  const over = (e, group, beforeId) => {
    if (drag === null || !group.epic) return; // not preventing default = not a drop target
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (drop?.epic !== group.epic || drop?.beforeId !== beforeId) setDrop({ epic: group.epic, beforeId });
  };
  const end = () => {
    setDrag(null);
    setDrop(null);
  };
  const dropHere = (e) => {
    if (drag === null || !drop) return end();
    e.preventDefault();
    onMove(drag, drop.epic, drop.beforeId);
    end();
  };

  return (
    <aside className="card story-list-panel">
      <h2>{heading}</h2>
      <ul id="storyList" className="story-list" onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrop(null); }}>
        {groupByEpic(stories).flatMap((group) => [
          <li
            key={`epic:${group.epic}`} className="epic-head accordion-head" title={group.label}
            role="button" tabIndex={0} aria-expanded={!closed.has(epicKey(group))}
            onClick={() => toggle(epicKey(group))} onKeyDown={(e) => toggleKey(e, epicKey(group))}
            onDragOver={(e) => over(e, group, group.stories[0]?.id ?? null)} onDrop={dropHere}
          >
            {`${closed.has(epicKey(group)) ? '▸' : '▾'} ${group.label} (${group.stories.length})`}
          </li>,
          ...(closed.has(epicKey(group)) ? [] : group.features.flatMap((fg) => [
            <li
              key={`feature:${group.epic}:${fg.feature}`} className="feature-head accordion-head" title={fg.label}
              role="button" tabIndex={0} aria-expanded={!closed.has(featureKey(group, fg))}
              onClick={() => toggle(featureKey(group, fg))} onKeyDown={(e) => toggleKey(e, featureKey(group, fg))}
              onDragOver={(e) => over(e, group, fg.stories[0]?.id ?? null)} onDrop={dropHere}
            >
              {`${closed.has(featureKey(group, fg)) ? '▸' : '▾'} ${fg.label} (${fg.stories.length})`}
            </li>,
            ...(closed.has(featureKey(group, fg)) ? [] : fg.stories.map((s, i) => {
            const { errors, warnings } = storyIssues(s, problems.get(s.id));
            const next = fg.stories[i + 1];
            const marker = drop?.epic === group.epic && drag !== null
              ? (drop.beforeId === s.id ? 'drop-before' : drop.beforeId === null && !next ? 'drop-after' : '')
              : '';
            return (
              <li
                key={s.id}
                className={['in-feature', s.id === selectedId ? 'selected' : '', issueClass(errors, warnings), s.id === drag ? 'dragging' : '', marker].join(' ').trim()}
                title={rowTooltip(s, errors, warnings)}
                draggable
                onClick={() => onSelect(s.id)}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(s.id)); // Firefox needs data to start a drag
                  setDrag(s.id);
                }}
                onDragEnd={end}
                onDragOver={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  over(e, group, e.clientY < r.top + r.height / 2 ? s.id : next?.id ?? null);
                }}
                onDrop={dropHere}
              >
                {s.code && <span className="code">{s.code}</span>}
                <span className="title">{storyLabel(s)}</span>
                {suggestionCounts.get(s.code) > 0 && (
                  <span className="suggestion-badge" title={`${suggestionCounts.get(s.code)} review suggestion(s)`} aria-label={`${suggestionCounts.get(s.code)} review suggestions`}>{suggestionCounts.get(s.code)}</span>
                )}
                <span className="badge">{s.points || '–'}</span>
              </li>
            );
            })),
          ])),
        ])}
        {!stories.length && <li className="muted" style={{ cursor: 'default' }}>No stories yet.</li>}
      </ul>
      <div className="row">
        <button type="button" id="addStoryBtn" className="primary" onClick={onAdd}>Add story</button>
        <button type="button" id="deleteStoryBtn" className="danger" disabled={selectedId === null || !stories.some((s) => s.id === selectedId)} onClick={onDelete}>Delete selected</button>
      </div>
    </aside>
  );
}
