import { useEffect, useMemo, useRef, useState } from 'react';
import { backlogProblems } from '../../../core/ids.js';
import { unitsOf, unitStoryCode, openCounts, orphanUnits, reviewOverview } from '../../../core/review.js';
import { useBacklog } from './hooks/useBacklog.js';
import { useReview } from './hooks/useReview.js';
import { useProposals } from './hooks/useProposals.js';
import { acceptProposed } from '../../../core/proposals.js';
import FileBar from './components/FileBar.jsx';
import Info from './components/Info.jsx';
import StoryList from './components/StoryList.jsx';
import StoryForm from './components/StoryForm.jsx';
import StoriesTab from './components/StoriesTab.jsx';
import GraphTab from './components/GraphTab.jsx';
import ReviewTab from './components/ReviewTab.jsx';
import ProposedTab from './components/ProposedTab.jsx';

const STATUS_TEXT = { saved: 'Saved', saving: 'Saving…', failed: 'Save failed', idle: 'No file' };

// One table drives both the key handler and the helper popover. Matched on e.code so keyboard layouts and
// the Mac Option key (which changes e.key) do not matter. Ctrl+N, Ctrl+Shift+N and Ctrl+D are reserved by browsers.
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
const ALT = IS_MAC ? 'Option' : 'Alt';

// Handled by the field navigation in StoryForm; listed here only so the popover shows them.
const NAV_HINTS = [
  { label: 'Left / Right', action: 'Previous / next field (in text, at the start / end)' },
  { label: 'Ctrl+Alt+Left / Right', action: 'Previous / next text field from anywhere in it' },
  { label: 'Up / Down', action: 'Previous / next field group' },
  { label: 'Left / Right (points)', action: 'Previous / next sprint point' },
  { label: `${ALT}+Right / Left (points)`, action: 'Go to Priority / back to points' },
];

const KEYBOARD_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
  </svg>
);

export default function App() {
  const { state, selected, status, message, actions } = useBacklog();
  const { files, current, backlog, selectedId, view, checked, lastChecked } = state;
  const stories = backlog?.stories ?? [];
  const problems = useMemo(() => backlogProblems(stories), [stories]);

  // Review suggestions for the open backlog (reviews/<same name>), shown next to the fields they concern.
  const review = useReview(current);
  const reload = review.reload;
  const reviewUnits = useMemo(() => unitsOf(review.rows), [review.rows]);
  const suggestionCounts = useMemo(() => openCounts(review.rows, stories), [review.rows, stories]);
  const orphans = useMemo(() => orphanUnits(review.rows, stories), [review.rows, stories]);
  const selectedUnits = selected?.code ? reviewUnits.filter((u) => unitStoryCode(u) === selected.code) : [];
  const applyUnit = (unit) => {
    const result = actions.applySuggestions(unit.rows);
    if (result.error) review.notify(result.error);
    else review.decide(unit.indexes, 'applied');
  };
  const dismissUnit = (unit) => review.decide(unit.indexes, 'dismissed');
  const openReviewCount = useMemo(() => reviewOverview(review.rows, stories).openCount, [review.rows, stories]);
  const dismissOrphans = () => review.decide(orphans.flatMap((u) => u.indexes), 'dismissed');
  // The Review tab only exists while the backlog has a review file; leave it when the file goes away.
  const leaveReview = view === 'review' && !review.exists;
  useEffect(() => {
    if (leaveReview) actions.setView('editor');
  }, [leaveReview, actions]);

  // Proposed stories for the open backlog (proposals/<same name>); the tab is always there, the file may not be.
  const proposals = useProposals(current, backlog?.headers);
  const refreshProposals = proposals.actions.refreshFromDisk;
  const [proposedNotice, setProposedNotice] = useState(null);
  useEffect(() => setProposedNotice(null), [current]);

  // Move proposed stories into the backlog. Nothing changes when acceptProposed refuses. The backlog is replaced
  // first and the proposals second, so a crash between the two saves leaves a duplicate rather than a lost story.
  const accept = (ids) => {
    const result = acceptProposed(stories, proposals.stories, ids, backlog.headers);
    if (result.error) return setProposedNotice({ kind: 'error', text: result.error });
    actions.replaceStories(result.backlog);
    proposals.actions.replaceStories(result.proposals);
    const names = result.accepted.map((s) => s.code).join(', ');
    setProposedNotice({ kind: 'ok', text: `Accepted ${result.accepted.length === 1 ? '1 story' : `${result.accepted.length} stories`} into the backlog: ${names}.` });
  };
  const acceptSelected = () => proposals.selected && accept(new Set([proposals.selected.id]));
  const acceptAll = () => accept(new Set(proposals.stories.map((s) => s.id)));

  // Ask the Story form to focus a field once it has rendered (default: Epic).
  const [focusRequest, setFocusRequest] = useState(null);
  const [focusNameToken, setFocusNameToken] = useState(0);
  const requestFocus = (id) => setFocusRequest({ id });

  useEffect(() => {
    actions.init();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        actions.refreshFromDisk();
        reload();
        refreshProposals();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [actions, reload, refreshProposals]);

  const addStory = () => {
    actions.addStory();
    requestFocus();
  };

  const newBacklog = async () => {
    if (await actions.newBacklog()) setFocusNameToken((n) => n + 1);
  };

  // Select the neighbouring story. The focused form field keeps focus (falling back to Epic).
  const moveSelection = (delta) => {
    const focusedId = document.activeElement?.id;
    if (actions.moveSelection(delta)) requestFocus(focusedId);
  };

  // Story shortcuts act on the Editor tab only.
  const inEditor = view === 'editor';
  const SHORTCUTS = [
    { code: 'KeyN', alt: true, label: `${ALT}+N`, action: 'Add story', run: addStory, enabled: !!backlog && inEditor },
    { code: 'KeyN', alt: true, shift: true, label: `${ALT}+Shift+N`, action: 'New backlog', run: newBacklog, enabled: true },
    { code: 'KeyD', alt: true, label: `${ALT}+D`, action: 'Delete selected story', run: actions.deleteSelected, enabled: !!selected && inEditor },
    { code: 'ArrowUp', ctrl: true, label: 'Ctrl+Up', action: 'Previous story', run: () => moveSelection(-1), enabled: !!selected && inEditor },
    { code: 'ArrowDown', ctrl: true, label: 'Ctrl+Down', action: 'Next story', run: () => moveSelection(1), enabled: !!selected && inEditor },
  ];

  const shortcuts = useRef(SHORTCUTS);
  shortcuts.current = SHORTCUTS;
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.isComposing) return;
      const hit = shortcuts.current.find((k) => k.code === e.code && !!k.alt === e.altKey && !!k.ctrl === e.ctrlKey && !!k.shift === e.shiftKey);
      if (!hit || !hit.enabled) return;
      e.preventDefault();
      hit.run();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const openInEditor = (id) => {
    actions.selectStory(id);
    actions.setView('editor');
  };

  return (
    <>
      <main className="page">
        <header className="top">
          <h1><a href="/" className="home" title="All tools">&larr;</a> User story generator</h1>
          <div className="top-right">
            <Info id="shortcuts" buttonId="shortcutsBtn" buttonClass="shortcuts-btn" label="Keyboard shortcuts" icon={KEYBOARD_ICON} popoverId="shortcutsText" popoverClass="right">
              <dl className="shortcut-list">
                {[...SHORTCUTS, ...NAV_HINTS].flatMap((k) => [<dt key={`${k.label}-t`}>{k.label}</dt>, <dd key={`${k.label}-d`}>{k.action}</dd>])}
              </dl>
            </Info>
            <span id="saveStatus" className={`status-chip ${status.kind}`} role="status" aria-live="polite" title={status.detail}>
              {STATUS_TEXT[status.kind]}
            </span>
          </div>
        </header>

        <FileBar
          files={files} current={current} message={message} focusNameToken={focusNameToken}
          onSelect={actions.selectFile} onRename={actions.renameFile} onNew={newBacklog} onOpenFolder={actions.openFolder}
        />

        {(review.message || review.notice || orphans.length > 0) && (
          <div id="reviewNotices" role="status">
            {review.message && <p className="warning">{review.message}</p>}
            {review.notice && <p className="error">{review.notice}</p>}
            {orphans.length > 0 && (
              <p className="warning">
                {`${orphans.length} review suggestion${orphans.length > 1 ? 's' : ''} no longer match a story (it was renumbered, moved or deleted). Run /review-backlog again, or `}
                <button type="button" className="link-btn" onClick={dismissOrphans}>dismiss {orphans.length > 1 ? 'them' : 'it'}</button>.
              </p>
            )}
          </div>
        )}

        <p id="emptyPrompt" className="card muted" hidden={!!current}>
          There are no backlogs in <code>data/user-stories/</code> yet. Click <strong>New</strong> to create one.
        </p>

        <div id="tabs" className="tabs" role="tablist" aria-label="Views" hidden={!current}>
          <button type="button" role="tab" id="tabEditor" className="tab" aria-controls="editor" aria-selected={view === 'editor'} onClick={() => actions.setView('editor')}>Editor</button>
          <button type="button" role="tab" id="tabStories" className="tab" aria-controls="storiesView" aria-selected={view === 'stories'} onClick={() => actions.setView('stories')}>Stories</button>
          <button type="button" role="tab" id="tabGraph" className="tab" aria-controls="graphView" aria-selected={view === 'graph'} onClick={() => actions.setView('graph')}>Graph</button>
          <button type="button" role="tab" id="tabProposed" className="tab" aria-controls="proposedView" aria-selected={view === 'proposed'} onClick={() => actions.setView('proposed')}>
            {`Proposed (${proposals.stories.length})`}
          </button>
          {review.exists && (
            <button type="button" role="tab" id="tabReview" className="tab" aria-controls="reviewView" aria-selected={view === 'review'} onClick={() => actions.setView('review')}>
              {openReviewCount ? `Review (${openReviewCount})` : 'Review'}
            </button>
          )}
        </div>

        <div id="editor" className="editor" role="tabpanel" aria-labelledby="tabEditor" hidden={!current || view !== 'editor'}>
          {inEditor && (
            <>
              <StoryList stories={stories} problems={problems} suggestionCounts={suggestionCounts} selectedId={selectedId} onSelect={actions.selectStory} onAdd={addStory} onDelete={actions.deleteSelected} onMove={actions.moveStory} />
              {selected && (
                <StoryForm
                  story={selected} stories={stories} problems={problems} suggestions={selectedUnits} focusRequest={focusRequest}
                  onFocused={() => setFocusRequest(null)} onEdit={actions.editStory} onCommitEpic={actions.commitEpic} onOpen={actions.selectStory}
                  onApplySuggestion={applyUnit} onDismissSuggestion={dismissUnit}
                />
              )}
            </>
          )}
        </div>

        <ProposedTab
          hidden={!current || view !== 'proposed'} proposed={proposals.stories} backlogStories={stories}
          selected={proposals.selected} selectedId={proposals.state.selectedId} notice={proposedNotice}
          onSelect={proposals.actions.selectStory} onAdd={() => proposals.actions.addStory(stories)} onDelete={proposals.actions.deleteSelected}
          onEdit={proposals.actions.editStory} onCommitEpic={proposals.actions.commitEpic} onMove={proposals.actions.moveStory}
          onOpenBacklogStory={openInEditor} onAccept={acceptSelected} onAcceptAll={acceptAll}
        />

        <StoriesTab
          stories={stories} problems={problems} checked={checked} lastChecked={lastChecked} hidden={!current || view !== 'stories'}
          onOpen={openInEditor} onCheck={actions.toggleChecked} onCheckAll={actions.checkAll} onApplyBulk={actions.applyBulkPatch}
        />

        {review.exists && (
          <ReviewTab
            rows={review.rows} stories={stories} hidden={!current || view !== 'review'}
            onOpen={openInEditor} onApply={applyUnit} onDismiss={dismissUnit}
          />
        )}

        <GraphTab
          stories={stories} problems={problems} current={current} hidden={!current || view !== 'graph'}
          onOpen={openInEditor} onAddDependency={actions.addDependency} onRemoveDependency={actions.removeDependency}
        />
      </main>
    </>
  );
}
