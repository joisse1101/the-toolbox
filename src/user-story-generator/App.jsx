import { useEffect, useRef, useState } from 'react';
import { useBacklog } from './hooks/useBacklog.js';
import FileBar from './components/FileBar.jsx';
import Info from './components/Info.jsx';
import StoryList from './components/StoryList.jsx';
import StoryForm from './components/StoryForm.jsx';
import StoriesTab from './components/StoriesTab.jsx';

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

  // Ask the Story form to focus a field once it has rendered (default: Epic).
  const [focusRequest, setFocusRequest] = useState(null);
  const [focusNameToken, setFocusNameToken] = useState(0);
  const requestFocus = (id) => setFocusRequest({ id });

  useEffect(() => {
    actions.init();
    const onVisible = () => {
      if (document.visibilityState === 'visible') actions.refreshFromDisk();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [actions]);

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

        <p id="emptyPrompt" className="card muted" hidden={!!current}>
          There are no backlogs in <code>user-stories/</code> yet. Click <strong>New</strong> to create one.
        </p>

        <div id="tabs" className="tabs" role="tablist" aria-label="Views" hidden={!current}>
          <button type="button" role="tab" id="tabEditor" className="tab" aria-controls="editor" aria-selected={view === 'editor'} onClick={() => actions.setView('editor')}>Editor</button>
          <button type="button" role="tab" id="tabStories" className="tab" aria-controls="storiesView" aria-selected={view === 'stories'} onClick={() => actions.setView('stories')}>Stories</button>
        </div>

        <div id="editor" className="editor" role="tabpanel" aria-labelledby="tabEditor" hidden={!current || view !== 'editor'}>
          <StoryList stories={stories} selectedId={selectedId} onSelect={actions.selectStory} onAdd={addStory} onDelete={actions.deleteSelected} />
          {selected && (
            <StoryForm
              story={selected} stories={stories} focusRequest={focusRequest}
              onFocused={() => setFocusRequest(null)} onEdit={actions.editStory}
            />
          )}
        </div>

        <StoriesTab
          stories={stories} checked={checked} lastChecked={lastChecked} hidden={!current || view !== 'stories'}
          onOpen={openInEditor} onCheck={actions.toggleChecked} onCheckAll={actions.checkAll} onApplyBulk={actions.applyBulkPatch}
        />
      </main>
    </>
  );
}
