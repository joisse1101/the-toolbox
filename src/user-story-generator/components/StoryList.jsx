import { useState } from 'react';
import { groupByEpic, storyIssues, storyLabel } from '../model.js';
import { issueClass, rowTooltip } from './issues.js';

// Drag a story to reorder it inside its epic, or onto another epic's group to move it there. Dropping on the
// "(No epic)" group does nothing. `drag` is the story being dragged, `drop` = { epic, beforeId } where it would land
// (beforeId null = at the end of the group).
export default function StoryList({ stories, problems, suggestionCounts = new Map(), selectedId, onSelect, onAdd, onDelete, onMove }) {
  const [drag, setDrag] = useState(null);
  const [drop, setDrop] = useState(null);

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
      <h2>Stories</h2>
      <ul id="storyList" className="story-list" onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrop(null); }}>
        {groupByEpic(stories).flatMap((group) => [
          <li
            key={`epic:${group.epic}`} className="epic-head" title={group.label}
            onDragOver={(e) => over(e, group, group.stories[0]?.id ?? null)} onDrop={dropHere}
          >
            {`${group.label} (${group.stories.length})`}
          </li>,
          ...group.stories.map((s, i) => {
            const { errors, warnings } = storyIssues(s, problems.get(s.id));
            const next = group.stories[i + 1];
            const marker = drop?.epic === group.epic && drag !== null
              ? (drop.beforeId === s.id ? 'drop-before' : drop.beforeId === null && !next ? 'drop-after' : '')
              : '';
            return (
              <li
                key={s.id}
                className={[s.id === selectedId ? 'selected' : '', issueClass(errors, warnings), s.id === drag ? 'dragging' : '', marker].join(' ').trim()}
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
          }),
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
