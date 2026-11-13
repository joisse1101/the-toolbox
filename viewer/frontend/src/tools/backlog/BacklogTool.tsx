import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { backlogProblems, gatherFeatures } from '../../../../shared/backlog/ids.ts';
import { groupByEpic } from '../../../../shared/backlog/model.ts';
import { useBacklog } from './shell/useBacklog.ts';
import { useTab } from './shell/useTab.ts';
import NotFoundPage from '../../app/NotFoundPage.tsx';
import { useConfirm } from '../../shared/hooks/useConfirm.ts';
import { useReviewFlow } from './features/review/useReviewFlow.ts';
import { useProposedFlow } from './features/proposed/useProposedFlow.ts';
import { useShortcuts } from './shell/useShortcuts.ts';
import { useLexicon } from './features/lexicon/useLexicon.ts';
import { useLexiconSuggestions } from './features/lexicon/useLexiconSuggestions.ts';
import FileBar from './shell/FileBar.tsx';
import Info from '../../shared/ui/Info.tsx';
import EmptyState from '../../shared/ui/EmptyState.tsx';
import EditorTab from './features/editor/EditorTab.tsx';
import StoriesTab from './features/stories/StoriesTab.tsx';
import GraphTab from './features/graph/GraphTab.tsx';
import ReviewTab from './features/review/ReviewTab.tsx';
import ProposedTab from './features/proposed/ProposedTab.tsx';
import { openRows } from '../../../../shared/lexicon/lexicon-suggestions.ts';
import LexiconTab from './features/lexicon/LexiconTab.tsx';
import SettingsTab from './features/settings/SettingsTab.tsx';
import { useSettings } from './features/settings/useSettings.ts';
import { useProjects } from './shell/useProjects.ts';
import type { GroupRef } from './shell/useBacklog.ts';
import type { LexiconSuggestion } from '../../../../shared/types.ts';
import useCollapsed from '../../shared/hooks/useCollapsed.ts';

const STATUS_TEXT = { saved: 'Saved', saving: 'Saving…', failed: '✕ Save failed', idle: 'No file' };

const KEYBOARD_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
  </svg>
);

export default function App() {
  const ask = useConfirm();
  const { state, selected, status, message, ready, actions } = useBacklog();
  const { files, current, backlog, selectedId, checked, lastChecked } = state;
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
  const lastSelected = useRef<{ file: string | null; id: number; epic: string; feature: string } | null>(null);
  useEffect(() => {
    const now = selected ? { file: current, id: selected.id, epic: selectedEpic, feature: selectedFeature } : null;
    const before = lastSelected.current;
    lastSelected.current = now;
    if (now && before && before.file === now.file && before.id === now.id && (before.epic !== now.epic || before.feature !== now.feature)) reveal(now.epic, now.feature);
  }, [current, selected?.id, selectedEpic, selectedFeature, reveal]);

  // Review suggestions and Proposed stories for the open backlog (see the two flow hooks).
  const { review, suggestionCounts, orphans, selectedUnits, applyUnit, dismissUnit, acceptSummary, acceptUnits, openReviewCount, dismissOrphans } =
    useReviewFlow({ current, stories, backlog, initials: state.initials, selected, actions, ask });
  const reload = review.reload;
  // The tab comes from the address. It is only resolved once the backlog list and the review file have been read.
  const { tab, setTab } = useTab({ settled: ready && (!current || review.loaded), hasBacklog: !!current, hasReview: review.exists });
  const { proposals, proposedNotice, acceptSelected, acceptAll, moveToProposed } =
    useProposedFlow({ current, stories, backlog, initials: state.initials, actions, review, ask, reveal });
  const refreshProposals = proposals.actions.refreshFromDisk;

  // The lexicon of the open backlog (its lexicon file); the tab is always there, the file may not be.
  const lexicon = useLexicon(current);
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
    return () => { document.title = 'Backlog planner'; }; // the title of the home page
  }, [projectName]);
  // After a folder switch the page reloads; land on Settings so the note about skill sessions is seen.
  useEffect(() => {
    if (settingsState.switched) setTab('settings', { replace: true });
  }, []); // once, on load
  const showSettings = tab === 'settings' || !current; // with no backlog there is nothing else to show

  // Ask the Story form to focus a field once it has rendered (default: Epic).
  const [focusRequest, setFocusRequest] = useState<{ id: string | undefined } | null>(null);
  const [focusNameToken, setFocusNameToken] = useState(0);
  const requestFocus = (id?: string) => setFocusRequest({ id });

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
  const moveStory = (id: number, epic: unknown, beforeId?: number | null) => review.retarget(actions.moveStory(id, epic, beforeId));
  const moveGroup = (group: GroupRef, beforeKey?: string | null) => review.retarget(actions.moveGroup(group, beforeKey));
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
  const moveSelection = (delta: number) => {
    const focusedId = document.activeElement?.id;
    if (actions.moveSelection(delta)) requestFocus(focusedId);
  };

  const inEditor = tab === 'editor';
  const shortcutRows = useShortcuts({
    hasBacklog: !!backlog, hasSelected: !!selected, inEditor, addStory, newBacklog, deleteSelected: actions.deleteSelected, moveSelection,
  });

  // The tab bar is built from this one array, so a tab, its panel and its keyboard position cannot drift apart.
  const tabs = [
    ...(current ? [
      { tab: 'editor', tabId: 'tabEditor', panelId: 'editor', label: 'Editor' },
      { tab: 'stories', tabId: 'tabStories', panelId: 'storiesView', label: 'Stories' },
      { tab: 'graph', tabId: 'tabGraph', panelId: 'graphView', label: 'Graph' },
      { tab: 'proposed', tabId: 'tabProposed', panelId: 'proposedView', label: `Proposed (${proposals.stories.length})` },
      { tab: 'lexicon', tabId: 'tabLexicon', panelId: 'lexiconView', label: `Lexicon (${lexicon.lexicon.terms.length}${openSuggestions ? `, ${openSuggestions} suggested` : ''})` },
      ...(review.exists ? [{ tab: 'review', tabId: 'tabReview', panelId: 'reviewView', label: openReviewCount ? `Review (${openReviewCount})` : 'Review' }] : []),
    ] : []),
    { tab: 'settings', tabId: 'tabSettings', panelId: 'settingsView', label: 'Settings' },
  ];
  const activeTab = showSettings ? 'settings' : tab;
  const focusableTab = tabs.some((t) => t.tab === activeTab) ? activeTab : tabs[0].tab; // the one Tab stop
  // Left and Right move between tabs (wrapping), Home and End jump to the ends; selection follows focus.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = tabs.findIndex((t) => t.tabId === (e.target as HTMLElement).id);
    const step = ({ ArrowLeft: -1, ArrowRight: 1 } as Record<string, number | undefined>)[e.key];
    let to;
    if (from < 0) return;
    if (step) to = (from + step + tabs.length) % tabs.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = tabs.length - 1;
    else return;
    e.preventDefault();
    setTab(tabs[to].tab);
    document.getElementById(tabs[to].tabId)?.focus();
  };

  const openInEditor = (id: number) => {
    actions.selectStory(id);
    setTab('editor');
  };

  if (tab === null) return <NotFoundPage />;

  return (
    <>
      <main className="page">
        <header className="top">
          <h1><Link to="/" className="home" title="All tools">&larr;</Link> Backlog portal{projectName && <span className="muted"> - {projectName}</span>}</h1>
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
              key={t.tab} type="button" role="tab" id={t.tabId} className="tab" aria-controls={t.panelId}
              aria-selected={t.tab === activeTab} tabIndex={t.tab === focusableTab ? 0 : -1} onClick={() => setTab(t.tab)}
            >{t.label}</button>
          ))}
        </div>

        <EditorTab
          hidden={!current || tab !== 'editor'} stories={stories} problems={problems} suggestionCounts={suggestionCounts} selectedId={selectedId} selected={selected}
          selectedUnits={selectedUnits} focusRequest={focusRequest} renumberDisabled={renumberDisabled} collapse={collapse} actions={actions}
          onFocused={() => setFocusRequest(null)} onAdd={addStory} onMove={moveStory} onMoveGroup={moveGroup} onRenumber={renumberDisplayed}
          onApplySuggestion={applyUnit} onDismissSuggestion={dismissUnit} onMoveToProposed={moveToProposed}
        />

        <ProposedTab
          hidden={!current || tab !== 'proposed'} proposed={proposals.stories} backlogStories={stories}
          selected={proposals.selected} selectedId={proposals.state.selectedId} notice={proposedNotice}
          onSelect={proposals.actions.selectStory} onAdd={() => proposals.actions.addStory(stories)} onDelete={proposals.actions.deleteMany}
          onEdit={proposals.actions.editStory} onCommitEpic={proposals.actions.commitEpic} onMove={proposals.actions.moveStory}
          onOpenBacklogStory={openInEditor} onAccept={acceptSelected} onAcceptAll={acceptAll}
        />

        <LexiconTab
          hidden={!current || tab !== 'lexicon'} lexicon={lexicon.lexicon} selected={lexicon.selected} error={lexicon.state.error} message={lexicon.message}
          suggestions={lexiconSuggestions.file} suggestionsMessage={lexiconSuggestions.message}
          onApplySuggestion={(index: number, row: LexiconSuggestion, avoid: string[]) => {
            const result = lexicon.actions.apply(row, avoid);
            if (result.ok) lexiconSuggestions.decide(index, 'applied');
            return result;
          }}
          onDismissSuggestion={(index: number) => lexiconSuggestions.decide(index, 'dismissed')}
          onSelect={lexicon.actions.select} onSave={lexicon.actions.save} onRemove={lexicon.actions.remove} onClearError={lexicon.actions.clearError}
        />

        <StoriesTab
          stories={stories} headers={backlog?.headers ?? []} problems={problems} checked={checked} lastChecked={lastChecked} hidden={!current || tab !== 'stories'}
          onOpen={openInEditor} onCheck={actions.toggleChecked} onCheckAll={actions.checkAll} onApplyBulk={actions.applyBulkPatch} onDeleteChecked={actions.deleteChecked}
        />

        {review.exists && (
          <ReviewTab
            rows={review.rows} stories={stories} hidden={!current || tab !== 'review'}
            onOpen={openInEditor} onApply={applyUnit} onDismiss={dismissUnit} onAcceptAll={acceptUnits} onClear={review.clear}
          />
        )}

        <SettingsTab hidden={!showSettings} settingsState={settingsState} />

        <GraphTab
          stories={stories} problems={problems} current={current} hidden={!current || tab !== 'graph'}
          onOpen={openInEditor} onAddDependency={actions.addDependency} onRemoveDependency={actions.removeDependency}
        />
      </main>
    </>
  );
}
