import { groupByEpic, storyIssues, storyLabel } from '../model.js';
import { issueClass, rowTooltip } from './issues.js';

export default function StoryList({ stories, selectedId, onSelect, onAdd, onDelete }) {
  return (
    <aside className="card story-list-panel">
      <h2>Stories</h2>
      <ul id="storyList" className="story-list">
        {groupByEpic(stories).flatMap((group) => [
          <li key={`epic:${group.epic}`} className="epic-head" title={group.label}>{`${group.label} (${group.stories.length})`}</li>,
          ...group.stories.map((s) => {
            const { errors, warnings } = storyIssues(s);
            return (
              <li
                key={s.id}
                className={[s.id === selectedId ? 'selected' : '', issueClass(errors, warnings)].join(' ').trim()}
                title={rowTooltip(s, errors, warnings)}
                onClick={() => onSelect(s.id)}
              >
                <span className="title">{storyLabel(s)}</span>
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
