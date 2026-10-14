import { useEffect, useMemo, useState } from 'react';
import { backlogProblems } from '../../../../core/ids.js';
import StoryList from './StoryList.jsx';
import StoryForm from './StoryForm.jsx';

// The Proposed tab: the Editor's story list and form on the proposals file, plus Accept selected / Accept all.
// The list and form are mounted only while the tab is shown, because the form finds its fields by DOM id and the
// Editor tab has the same ones.
// `proposed` / `backlogStories`: the two story lists. Depends On choices and Epic / Feature suggestions offer both.
// `notice`: { kind: 'error' | 'ok', text } or null, the result of the last accept.
export default function ProposedTab({
  hidden, proposed, backlogStories, selected, selectedId, notice,
  onSelect, onAdd, onDelete, onEdit, onCommitEpic, onMove, onOpenBacklogStory, onAccept, onAcceptAll,
}) {
  // Ticked stories for Accept selected. Ids that are gone (accepted, deleted) drop out.
  const [ticked, setTicked] = useState(() => new Set());
  useEffect(() => {
    setTicked((prev) => {
      const next = new Set([...prev].filter((id) => proposed.some((s) => s.id === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [proposed]);
  const toggle = (id) => setTicked((prev) => {
    const next = new Set(prev);
    if (!next.delete(id)) next.add(id);
    return next;
  });
  const [focusRequest, setFocusRequest] = useState(null);
  const all = useMemo(() => [...backlogStories, ...proposed], [backlogStories, proposed]);
  // Warnings are computed over both lists so a link to a backlog story is not "missing"; only proposed stories are shown.
  const problems = useMemo(() => {
    const ids = new Set(proposed.map((s) => s.id));
    return new Map([...backlogProblems(all)].filter(([id]) => ids.has(id)));
  }, [all, proposed]);

  const add = () => {
    onAdd();
    setFocusRequest({ id: 'epic' });
  };
  // A Depends On link may name a backlog story: open it in the Editor tab.
  const open = (id) => (proposed.some((s) => s.id === id) ? onSelect(id) : onOpenBacklogStory(id));

  return (
    <div id="proposedView" role="tabpanel" aria-labelledby="tabProposed" hidden={hidden}>
      {!hidden && (
        <>
          <div className="card row proposed-actions">
            <button type="button" id="acceptStoryBtn" className="primary" disabled={!ticked.size} onClick={() => onAccept(ticked)}>{`Accept selected (${ticked.size})`}</button>
            <button type="button" id="acceptAllBtn" disabled={!proposed.length} onClick={onAcceptAll}>Accept all</button>
            <span className="muted">Tick stories to accept some of them. Accepted stories go to the end of their Epic in the backlog.</span>
          </div>
          {notice && <p id="proposedNotice" role="status" className={notice.kind === 'error' ? 'error' : 'card muted'}>{notice.text}</p>}
          {!proposed.length && (
            <p className="card muted">No proposed stories. Use Add story to draft one.</p>
          )}
          <div className="editor">
            <StoryList
              heading="Proposed stories" stories={proposed} problems={problems} selectedId={selectedId}
              checked={ticked} onToggle={toggle}
              onSelect={onSelect} onAdd={add} onDelete={onDelete} onMove={onMove}
            />
            {selected && (
              <StoryForm
                story={selected} stories={all} problems={problems} focusRequest={focusRequest}
                onFocused={() => setFocusRequest(null)} onEdit={onEdit} onCommitEpic={onCommitEpic} onOpen={open}
                onBench={(id, on) => onEdit(id, (d) => { d.benched = on; })}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
