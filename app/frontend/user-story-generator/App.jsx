import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { backlogProblems } from '../../../core/ids.js';
import { unitsOf, unitStoryCode, openCounts, orphanUnits, reviewOverview, openUnitsFor } from '../../../core/review.js';
import { useBacklog } from './hooks/useBacklog.js';
import { useReview } from './hooks/useReview.js';
import { useProposals } from './hooks/useProposals.js';
import { useLexicon } from './hooks/useLexicon.js';
import { backup } from '../shared/files.js';
import { acceptProposed, moveToProposed as moveStoryToProposed } from '../../../core/proposals.js';
import FileBar from './components/FileBar.jsx';
import Info from './components/Info.jsx';
import StoryList from './components/StoryList.jsx';
import StoryForm from './components/StoryForm.jsx';
import StoriesTab from './components/StoriesTab.jsx';
import GraphTab from './components/GraphTab.jsx';
import ReviewTab from './components/ReviewTab.jsx';
import ProposedTab from './components/ProposedTab.jsx';
import LexiconTab from './components/LexiconTab.jsx';
import BackupsTab from './components/BackupsTab.jsx';

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
  // The Unlock button of an unlock row: lift the lock, change nothing else, and mark the row applied.
  const unlockUnit = (unit) => {
    const story = stories.find((s) => s.code === unitStoryCode(unit));
    if (!story) return;
    actions.lockStory(story.id, false);
    review.decide(unit.indexes, 'applied');
  };
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

  // The lexicon of the open backlog (lexicons/<same name>.md); the tab is always there, the file may not be.
  const lexicon = useLexicon(current);
  const refreshLexicon = lexicon.actions.refreshFromDisk;
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
  const acceptSelected = (ids) => ids.size && accept(new Set(ids));
  const acceptAll = () => accept(new Set(proposals.stories.map((s) => s.id)));

  // Editor -> Proposed for the open story. Its open review suggestions are marked dismissed (after a confirm, only
  // when there are any). Order: backlog, proposals, review, like accept, so a crash leaves a duplicate, not a lost story.
  const moveToProposed = (story) => {
    const result = moveStoryToProposed(stories, proposals.stories, story.id, backlog.headers);
    if (result.error) return review.notify(result.error);
    const units = openUnitsFor(review.rows, story.code);
    if (units.length && !window.confirm(`${story.code} has ${units.length} open review suggestion${units.length > 1 ? 's' : ''}. Moving it to Proposed marks ${units.length > 1 ? 'them' : 'it'} as dismissed. Continue?`)) return;
    actions.replaceStories(result.backlog);
    proposals.actions.replaceStories(result.proposals);
    if (units.length) review.decide(units.flatMap((u) => u.indexes), 'dismissed');
    // The stories below it were renumbered: their open suggestions follow them. Links to the moved story now name its placeholder.
    review.retarget(new Map([...result.recoded, [story.code, result.moved.code]]));
    setProposedNotice({ kind: 'ok', text: `Moved ${story.code} to Proposed as ${result.moved.code}.` }); // shown in the Proposed tab
  };

  // Backup: wait until backlog, proposals and review are on disk, so the copy matches the screen.
  const settleAll = async () => {
    const saved = await Promise.all([actions.settle(), proposals.actions.settle(), review.settle(), lexicon.actions.settle()]);
    return saved.every(Boolean);
  };
  const [backupNote, setBackupNote] = useState(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupCount, setBackupCount] = useState(0); // lets the Backups tab reload its list
  useEffect(() => setBackupNote(null), [current]);
  const backUp = async () => {
    const name = current;
    setBackupNote(null);
    setBackingUp(true);
    try {
      if (!(await settleAll())) {
        return setBackupNote({ kind: 'error', text: 'No backup made: the latest changes could not be saved yet.' });
      }
      const { folder } = await backup(name); // folder is YYYY-MM-DD_HHMMSS[-n]
      setBackupCount((n) => n + 1);
      setBackupNote({ kind: 'ok', text: `Backed up ${name} at ${folder.slice(11, 13)}:${folder.slice(13, 15)}` });
    } catch (err) {
      setBackupNote({ kind: 'error', text: `No backup made: ${err.message}` });
    } finally {
      setBackingUp(false);
    }
  };

  // Ask the Story form to focus a field once it has rendered (default: Epic).
  const [focusRequest, setFocusRequest] = useState(null);
  const [focusNameToken, setFocusNameToken] = useState(0);
  const requestFocus = (id) => setFocusRequest({ id });

  // Re-read backlog, review and proposals from the CSVs. Unsaved local edits win (see refreshFromDisk).
  const refreshAll = useCallback(() => {
    actions.refreshFromDisk();
    reload();
    refreshProposals();
    refreshLexicon();
  }, [actions, reload, refreshProposals, refreshLexicon]);

  useEffect(() => {
    actions.init();
  }, [actions]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshAll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshAll]);

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
          files={files} current={current} message={message} backupNote={backupNote} backingUp={backingUp} focusNameToken={focusNameToken}
          onSelect={actions.selectFile} onRename={actions.renameFile} onNew={newBacklog} onBackup={backUp} onOpenFolder={actions.openFolder} onRefresh={refreshAll}
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
          <button type="button" role="tab" id="tabLexicon" className="tab" aria-controls="lexiconView" aria-selected={view === 'lexicon'} onClick={() => actions.setView('lexicon')}>
            {`Lexicon (${lexicon.lexicon.terms.length})`}
          </button>
          <button type="button" role="tab" id="tabBackups" className="tab" aria-controls="backupsView" aria-selected={view === 'backups'} onClick={() => actions.setView('backups')}>Backups</button>
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
                  onApplySuggestion={applyUnit} onDismissSuggestion={dismissUnit} onUnlockSuggestion={unlockUnit} onMoveToProposed={moveToProposed} onLock={actions.lockStory}
                />
              )}
            </>
          )}
        </div>

        <ProposedTab
          hidden={!current || view !== 'proposed'} proposed={proposals.stories} backlogStories={stories}
          selected={proposals.selected} selectedId={proposals.state.selectedId} notice={proposedNotice}
          onSelect={proposals.actions.selectStory} onAdd={() => proposals.actions.addStory(stories)} onDelete={proposals.actions.deleteMany}
          onEdit={proposals.actions.editStory} onCommitEpic={proposals.actions.commitEpic} onMove={proposals.actions.moveStory}
          onOpenBacklogStory={openInEditor} onAccept={acceptSelected} onAcceptAll={acceptAll}
        />

        <LexiconTab
          hidden={!current || view !== 'lexicon'} lexicon={lexicon.lexicon} selected={lexicon.selected} error={lexicon.state.error} message={lexicon.message}
          onSelect={lexicon.actions.select} onSave={lexicon.actions.save} onRemove={lexicon.actions.remove} onClearError={lexicon.actions.clearError}
        />

        <StoriesTab
          stories={stories} headers={backlog?.headers ?? []} problems={problems} checked={checked} lastChecked={lastChecked} hidden={!current || view !== 'stories'}
          onOpen={openInEditor} onCheck={actions.toggleChecked} onCheckAll={actions.checkAll} onApplyBulk={actions.applyBulkPatch} onLockChecked={actions.lockChecked}
        />

        {review.exists && (
          <ReviewTab
            rows={review.rows} stories={stories} hidden={!current || view !== 'review'}
            onOpen={openInEditor} onApply={applyUnit} onDismiss={dismissUnit} onUnlock={unlockUnit}
          />
        )}

        <BackupsTab name={current} hidden={!current || view !== 'backups'} refreshToken={backupCount} settleAll={settleAll} />

        <GraphTab
          stories={stories} problems={problems} current={current} hidden={!current || view !== 'graph'}
          onOpen={openInEditor} onAddDependency={actions.addDependency} onRemoveDependency={actions.removeDependency}
        />
      </main>
    </>
  );
}
