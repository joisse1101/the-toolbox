import StateMark from './StateMark.jsx';
import { storyIssues, storyLabel as title } from '../../../../logic/backlog/model.js';
import { issueClass, rowTooltip } from './issues.js';

// The stories or groups that no arrow touches, listed below the graph.
export default function GraphUnlinked({ coarse, layout, grouping, groupLabel, problems, linkFrom, link, onToggleLink, onOpen }) {
  if (layout.unlinked.length === 0) return null;
  if (coarse) {
    return (
      <div className="graph-unlinked">
        <h3 className="dep-heading">No dependencies</h3>
        <ul>
          {layout.unlinked.map((item) => {
            const g = grouping.groups.get(item.id);
            return <li key={item.id}>{groupLabel(item.id)} <span className="code">{g.storyIds.length} {g.storyIds.length === 1 ? 'story' : 'stories'}</span></li>;
          })}
        </ul>
      </div>
    );
  }
  return (
    <div className="graph-unlinked">
      <h3 className="dep-heading">No dependencies</h3>
      <ul>
        {layout.unlinked.map((s) => {
          const { errors, warnings } = storyIssues(s, problems.get(s.id));
          return (
            <li key={s.id} className={issueClass(errors, warnings)}>
              <button
                type="button" className="link-btn" title={linkFrom !== null ? 'Make this the story it depends on' : rowTooltip(s, errors, warnings)}
                onClick={() => (linkFrom !== null ? link(linkFrom, s.id) : onOpen(s.id))}
              >
                {s.code ? <span className="code">{s.code}</span> : null} {title(s)}
                <StateMark kind={issueClass(errors, warnings)} />
              </button>
              <button
                type="button" className="graph-link-btn" disabled={!s.code} aria-label={`Link ${s.code || title(s)}`}
                title={s.code ? 'Choose the story this one depends on' : 'A story needs an epic, and so an ID, before it can be linked.'}
                onClick={() => onToggleLink(s.id)}
              >Link</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
