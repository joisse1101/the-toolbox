// The word (with an icon) that goes beside a row's red or yellow tint, so the state is not shown by colour alone.
// `kind` is what issueClass returns: 'incomplete', 'warn' or ''.
const MARKS: Record<string, string> = { incomplete: '✕ Incomplete', warn: '⚠ Warning' };

// `iconOnly` shows just the sign for tight places (the story list and the Stories table); the word stays as the
// accessible name and the tooltip, so the state is still not colour alone.
export default function StateMark({ kind, iconOnly = false }: { kind: string; iconOnly?: boolean }) {
  if (!MARKS[kind]) return null;
  if (!iconOnly) return <span className={`state-mark ${kind}`}>{MARKS[kind]}</span>;
  const word = MARKS[kind].slice(2);
  return <span className={`state-mark ${kind}`} role="img" aria-label={word} title={word}>{MARKS[kind].slice(0, 1)}</span>;
}

export const stateWord = (kind: string) => (MARKS[kind] ? MARKS[kind].slice(2) : '');
