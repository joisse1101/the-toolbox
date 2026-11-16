const TEXT_ENTRY_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// Is the event target a place where the user types or picks a value (input, textarea, select, contenteditable)?
export function isTextEntry(target: EventTarget | null): boolean {
  if (!target) return false;
  return TEXT_ENTRY_TAGS.has((target as HTMLElement).tagName) || (target as HTMLElement).isContentEditable === true;
}

// A plain key (no Ctrl, Alt or Meta) typed in a text field is typing, never a shortcut. A key with Ctrl or Alt
// still counts as a shortcut there: the editor shortcuts are meant to work while a field has focus.
export function ignoresKey(e: KeyboardEvent): boolean {
  const plain = !e.ctrlKey && !e.altKey && !e.metaKey;
  return plain && isTextEntry(e.target);
}
