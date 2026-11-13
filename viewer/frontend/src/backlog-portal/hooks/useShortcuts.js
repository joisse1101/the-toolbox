import { useEffect, useRef } from 'react';
import { ignoresKey } from '../../lib/shortcuts.js';

// Matched on e.code so keyboard layouts and the Mac Option key (which changes e.key) do not matter.
// Ctrl+N, Ctrl+Shift+N and Ctrl+D are reserved by browsers.
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

// One table drives both the key handler and the helper popover. Story shortcuts act on the Editor tab only.
// Returns the rows of the helper popover (shortcuts, then the field navigation hints).
export function useShortcuts({ hasBacklog, hasSelected, inEditor, addStory, newBacklog, deleteSelected, moveSelection }) {
  const shortcuts = [
    { code: 'KeyN', alt: true, label: `${ALT}+N`, action: 'Add story', run: addStory, enabled: hasBacklog && inEditor },
    { code: 'KeyN', alt: true, shift: true, label: `${ALT}+Shift+N`, action: 'New backlog', run: newBacklog, enabled: true },
    { code: 'KeyD', alt: true, label: `${ALT}+D`, action: 'Delete selected story', run: deleteSelected, enabled: hasSelected && inEditor },
    { code: 'ArrowUp', ctrl: true, label: 'Ctrl+Up', action: 'Previous story', run: () => moveSelection(-1), enabled: hasSelected && inEditor },
    { code: 'ArrowDown', ctrl: true, label: 'Ctrl+Down', action: 'Next story', run: () => moveSelection(1), enabled: hasSelected && inEditor },
  ];

  const latest = useRef(shortcuts);
  latest.current = shortcuts;
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.isComposing || ignoresKey(e)) return;
      const hit = latest.current.find((k) => k.code === e.code && !!k.alt === e.altKey && !!k.ctrl === e.ctrlKey && !!k.shift === e.shiftKey);
      if (!hit || !hit.enabled) return;
      e.preventDefault();
      hit.run();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return [...shortcuts, ...NAV_HINTS];
}
