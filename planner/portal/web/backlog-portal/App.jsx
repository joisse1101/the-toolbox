import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { backlogProblems, gatherFeatures } from '../../../logic/backlog/ids.js';
import { groupByEpic } from '../../../logic/backlog/model.js';
import { useBacklog } from './hooks/useBacklog.js';
import { useConfirm } from './hooks/useConfirm.js';
import { useReviewFlow } from './hooks/useReviewFlow.js';
import { useProposedFlow } from './hooks/useProposedFlow.js';
import { useShortcuts } from './hooks/useShortcuts.js';
import { useLexicon } from './hooks/useLexicon.js';
import { useLexiconSuggestions } from './hooks/useLexiconSuggestions.js';
import FileBar from './components/FileBar.jsx';
import Info from './components/Info.jsx';
import StoryList from './components/StoryList.jsx';
import TabHeader from './components/TabHeader.jsx';
import EmptyState from './components/EmptyState.jsx';
import StoryForm from './components/StoryForm.jsx';
import StoriesTab from './components/StoriesTab.jsx';
import GraphTab from './components/GraphTab.jsx';
import ReviewTab from './components/ReviewTab.jsx';
import ProposedTab from './components/ProposedTab.jsx';
import { openRows } from '../../../logic/lexicon/lexicon-suggestions.js';
import LexiconTab from './components/LexiconTab.jsx';
import SettingsTab from './components/SettingsTab.jsx';
import { useSettings } from './hooks/useSettings.js';
import { useProjects } from './hooks/useProjects.js';
import ResizeHandle from './components/ResizeHandle.jsx';
import useListWidth from './hooks/useListWidth.js';
import useCollapsed from './hooks/useCollapsed.js';

const STATUS_TEXT = { saved: 'Saved', saving: 'Saving…', failed: '✕ Save failed', idle: 'No file' };

const KEYBOARD_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
  </svg>
);

export default function App() {
  const ask = useConfirm();
  const { state, selected, status, message, actions } = useBacklog();
  const { files, current, backlog, selectedId, view, checked, lastChecked } = state;
  const stories = backlog?.stories ?? [];
  const problems = useMemo(() => backlogProblems(stories), [stories]);
  const renumberDisabled = useMemo(() => !state.initials || gatherFeatures(stories, state.initials) === stories, [stories, state.initials]); // nothing to put in order (and no backlog open yet: no initials)

  // Folded epics and features of the story list, remembered per backlog file. A story that turns up inside a folded group
  // (added, accepted from Proposed, or given another Epic or Feature in the form) opens just its feature and that feature's epic.
  const groups = useMemo(() => groupByEpic(stories), [stories]);
  const collapse = useCollapsed(current, groups, backlog !== null);
  const reveal = collapse.reveal;
  const selectedEpic = String(selected?.epic ?? '').trim();
  const selectedFeature = String(selected?.feature ?? '').trim();
  const lastSelected = useRef(null);
  useEffect(() => {
    const now = selected ? { file: current, id: selected.id, epic: selectedEpic, feature: selectedFeature } : null;
    const before = lastSelected.current;
    lastSelected.current = now;
    const sameStory = now && before && before.file === now.file && before.id === now.id;
    if (sameStory && (before.epic !== now.epic || before.feature !== now.feature)) reveal(now.epic, now.feature);
  }, [current, selected?.id, selectedEpic, selectedFeature, reveal]);

  // Review suggestions and Proposed stories for the open backlog (see the two flow hooks).
  const { review, suggestionCounts, orphans, selectedUnits, applyUnit, dismissUnit, acceptSummary, acceptUnits, openReviewCount, dismissOrphans } =
    useReviewFlow({ current, stories, backlog, initials: state.initials, selected, view, actions, ask });
  const reload = review.reload;
  const { proposals, proposedNotice, acceptSelected, acceptAll, moveToProposed } =
    useProposedFlow({ current, stories, backlog, initials: state.initials, actions, review, ask, reveal });
  const refreshProposals = proposals.actions.refreshFromDisk;

  // The lexicon of the open backlog (its lexicon file); the tab is always there, the file may not be.
  const lexicon = useLexicon(current);
  const editorList = useListWidth('editor');
  const refreshLexicon = lexicon.actions.refreshFromDisk;
  const lexiconSuggestions = useLexiconSuggestions(current);
  const reloadLexiconSuggestions = lexiconSuggestions.reload;
  const openSuggestions = openRows(lexiconSuggestions.file).length;

  // Wait until every pending save is on disk; the Settings tab needs it before it switches the data folder.
  const settleAll = async () => {
    const saved = await Promise.all([actions.settle(), proposals.actions.settle(), review.settle(), lexicon.actions.settle(), lexiconSuggestions.settle()]);
    return saved.every(Boolean);
  };
  // Project settings; the name goes in the header and the page title. Pending saves are settled before a folder switch.
  const settingsState = useSettings(settleAll, () => refreshAll());
  const projects = useProjects(settleAll, settingsState);
  const projectName = settingsState.settings?.projectName ?? '';
  useEffect(() => {
    document.title = projectName ? `${projectName} - Backlog portal` : 'Backlog portal';
  }, [projectName]);
  // After a folder switch the page reloads; land on Settings so the note about skill sessions is seen.
  useEffect(() => {
    if (settingsState.switched) actions.setView('settings');
  }, []); // once, on load
  const showSettings = view === 'settings' || !current; // with no backlog there is nothing else to show

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
    reloadLexiconSuggestions();
  }, [actions, reload, refreshProposals, refreshLexicon, reloadLexiconSuggestions]);

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

  // Dragging a story or a group, and Renumber, renumber stories: their open review suggestions follow them.
  const moveStory = (id, epic, beforeId) => review.retarget(actions.moveStory(id, epic, beforeId));
  const moveGroup = (group, beforeKey) => review.retarget(actions.moveGroup(group, beforeKey));
  const renumberDisplayed = async () => {
    const recoded = await actions.renumberDisplayed();
    if (recoded) review.retarget(recoded);
  };

  const addStory = () => {
    actions.addStory();
    reveal('', ''); // the new story has no Epic or Feature yet
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

  const inEditor = view === 'editor';
  const shortcutRows = useShortcuts({
    hasBacklog: !!backlog, hasSelected: !!selected, inEditor, addStory, newBacklog, deleteSelected: actions.deleteSelected, moveSelection,
  });

  // The tab bar is built from this one array, so a tab, its panel and its keyboard position cannot drift apart.
  const tabs = [
    ...(current ? [
      { view: 'editor', tabId: 'tabEditor', panelId: 'editor', label: 'Editor' },
      { view: 'stories', tabId: 'tabStories', panelId: 'storiesView', label: 'Stories' },
      { view: 'graph', tabId: 'tabGraph', panelId: 'graphView', label: 'Graph' },
      { view: 'proposed', tabId: 'tabProposed', panelId: 'proposedView', label: `Proposed (${proposals.stories.length})` },
      { view: 'lexicon', tabId: 'tabLexicon', panelId: 'lexiconView', label: `Lexicon (${lexicon.lexicon.terms.length}${openSuggestions ? `, ${openSuggestions} suggested` : ''})` },
      ...(review.exists ? [{ view: 'review', tabId: 'tabReview', panelId: 'reviewView', label: openReviewCount ? `Review (${openReviewCount})` : 'Review' }] : []),
    ] : []),
    { view: 'settings', tabId: 'tabSettings', panelId: 'settingsView', label: 'Settings' },
  ];
  const activeView = showSettings ? 'settings' : view;
  const focusableView = tabs.some((t) => t.view === activeView) ? activeView : tabs[0].view; // the one Tab stop
  // Left and Right move between tabs (wrapping), Home and End jump to the ends; selection follows focus.
  const onTabKey = (e) => {
    const from = tabs.findIndex((t) => t.tabId === e.target.id);
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    let to;
    if (from < 0) return;
    if (step) to = (from + step + tabs.length) % tabs.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = tabs.length - 1;
    else return;
    e.preventDefault();
    actions.setView(tabs[to].view);
    document.getElementById(tabs[to].tabId).focus();
  };

  const openInEditor = (id) => {
    actions.selectStory(id);
    actions.setView('editor');
  };

  return (
    <>
      <main className="page">
        <header className="top">
          <h1><a href="/" className="home" title="All tools">&larr;</a> Backlog portal{projectName && <span className="muted"> - {projectName}</span>}</h1>
          <div className="top-right">
            <Info id="shortcuts" buttonId="shortcutsBtn" buttonClass="shortcuts-btn" label="Keyboard shortcuts" icon={KEYBOARD_ICON} popoverId="shortcutsText" popoverClass="right">
              <dl className="shortcut-list">
                {shortcutRows.flatMap((k) => [<dt key={`${k.label}-t`}>{k.label}</dt>, <dd key={`${k.label}-d`}>{k.action}</dd>])}
              </dl>
            </Info>
            <span id="saveStatus" className={`status-chip ${status.kind}`} role="status" aria-live="polite" title={status.detail}>
              {STATUS_TEXT[status.kind]}
            </span>
          </div>
        </header>

        <FileBar
          files={files} current={current} initials={state.initials} message={message} olderLayout={settingsState.settings?.olderLayout} focusNameToken={focusNameToken} projects={projects}
          onSelect={actions.selectFile} onRename={actions.renameFile} onSetInitials={actions.setInitials} onNew={newBacklog} onOpenFolder={actions.openFolder} onRefresh={refreshAll}
        />

        {(review.message || review.notice || acceptSummary || orphans.length > 0) && (
          <div id="reviewNotices" role="status">
            {review.message && <p className="warning">{review.message}</p>}
            {review.notice && <p className="error">{review.notice}</p>}
            {acceptSummary && <p id="acceptSummary" className="card muted">{acceptSummary}</p>}
            {orphans.length > 0 && (
              <p className="warning">
                {`${orphans.length} review suggestion${orphans.length > 1 ? 's' : ''} no longer match a story (it was renumbered, moved or deleted). Run /jois-story:review again, or `}
                <button type="button" className="link-btn" onClick={dismissOrphans}>dismiss {orphans.length > 1 ? 'them' : 'it'}</button>.
              </p>
            )}
          </div>
        )}

        <div id="emptyPrompt" className="card" hidden={!!current}>
          <EmptyState title="No backlog yet" help="There are no backlog folders in the data folder yet. Click New to create one." />
        </div>

        <div id="tabs" className="tabs" role="tablist" aria-label="Views" onKeyDown={onTabKey}>
          {tabs.map((t) => (
            <button
              key={t.view} type="button" role="tab" id={t.tabId} className="tab" aria-controls={t.panelId}
              aria-selected={t.view === activeView} tabIndex={t.view === focusableView ? 0 : -1} onClick={() => actions.setView(t.view)}
            >{t.label}</button>
          ))}
        </div>

        <div id="editor" role="tabpanel" aria-labelledby="tabEditor" hidden={!current || view !== 'editor'}>
          <TabHeader title="Editor" />
          {inEditor && !stories.length && (
            <EmptyState title="No stories yet" help="Draft a story here, or use the explore and propose skills." action={{ id: 'addStoryBtn', label: 'Add story', onClick: addStory }} />
          )}
          {inEditor && stories.length > 0 && (
            <div className="editor" style={editorList.style}>
              <StoryList stories={stories} problems={problems} suggestionCounts={suggestionCounts} selectedId={selectedId} onSelect={actions.selectStory} onAdd={addStory} onMove={moveStory} onMoveGroup={moveGroup} onRenumber={renumberDisplayed} renumberDisabled={renumberDisabled} collapse={collapse} />
              {selected && (
                <StoryForm
                  story={selected} stories={stories} problems={problems} suggestions={selectedUnits} focusRequest={focusRequest}
                  onFocused={() => setFocusRequest(null)} onEdit={actions.editStory} onCommitEpic={actions.commitEpic} onOpen={actions.selectStory}
                  onApplySuggestion={applyUnit} onDismissSuggestion={dismissUnit} onMoveToProposed={moveToProposed} onDelete={actions.deleteSelected}
                />
              )}
              <ResizeHandle className="list-divider" {...editorList.handleProps} />
            </div>
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
          suggestions={lexiconSuggestions.file} suggestionsMessage={lexiconSuggestions.message}
          onApplySuggestion={(index, row, avoid) => {
            const result = lexicon.actions.apply(row, avoid);
            if (result.ok) lexiconSuggestions.decide(index, 'applied');
            return result;
          }}
          onDismissSuggestion={(index) => lexiconSuggestions.decide(index, 'dismissed')}
          onSelect={lexicon.actions.select} onSave={lexicon.actions.save} onRemove={lexicon.actions.remove} onClearError={lexicon.actions.clearError}
        />

        <StoriesTab
          stories={stories} headers={backlog?.headers ?? []} problems={problems} checked={checked} lastChecked={lastChecked} hidden={!current || view !== 'stories'}
          onOpen={openInEditor} onCheck={actions.toggleChecked} onCheckAll={actions.checkAll} onApplyBulk={actions.applyBulkPatch} onDeleteChecked={actions.deleteChecked}
        />

        {review.exists && (
          <ReviewTab
            rows={review.rows} stories={stories} hidden={!current || view !== 'review'}
            onOpen={openInEditor} onApply={applyUnit} onDismiss={dismissUnit} onAcceptAll={acceptUnits} onClear={review.clear}
          />
        )}

        <SettingsTab hidden={!showSettings} settingsState={settingsState} />

        <GraphTab
          stories={stories} problems={problems} current={current} hidden={!current || view !== 'graph'}
          onOpen={openInEditor} onAddDependency={actions.addDependency} onRemoveDependency={actions.removeDependency}
        />
      </main>
    </>
  );
}
