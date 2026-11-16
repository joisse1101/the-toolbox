import StateMark from './StateMark.jsx';

// The ID line (with state mark, Frozen mark and Benched toggle), the move and delete buttons, and the frozen note.
export default function StoryHeader({ story: s, cls, frozen, onBench, onMoveToProposed, onDelete }) {
  return (
    <>
      <div className="story-header" id="storyHeader">
        <div className="story-code" id="storyCode">
          {s.code ? <>ID: <strong>{s.code}</strong></> : 'No ID yet: one is assigned once an Epic is set.'}
          <StateMark kind={cls} />
          {frozen && <span className="frozen-mark" id="frozenMark" title="Frozen: reference only">{'❄'} Frozen</span>}
          {onBench && (
            <label className="lock-toggle" title="Bench this story: the jois-story-explore and jois-story-propose skills ignore it. Nothing else changes.">
              <input type="checkbox" id="benchToggle" checked={!!s.benched} onChange={(e) => onBench(s.id, e.target.checked)} />
              {' '}Benched
            </label>
          )}
        </div>
        <div className="story-actions" id="storyActions">
          {onMoveToProposed && (
            <button
              type="button" id="moveToProposedBtn" disabled={!s.code || frozen}
              title={!s.code ? 'Set an Epic first' : frozen ? 'A frozen story cannot be moved to Proposed' : 'Remove this story from the backlog and make it a proposed story'}
              onClick={() => onMoveToProposed(s)}
            >
              Move to Proposed
            </button>
          )}
          {onDelete && (
            <button
              type="button" id="deleteStoryBtn" disabled={frozen}
              title={frozen ? 'A frozen story cannot be deleted' : 'Delete this story'}
              onClick={() => onDelete()}
            >
              Delete story
            </button>
          )}
        </div>
      </div>

      {frozen && (
        <p className="frozen-note" id="frozenNote" role="status">
          This story is frozen and read-only. It keeps its ID, and a change needs a new story that supersedes it.
        </p>
      )}
    </>
  );
}
