// The word (with an icon) that goes beside a row's red or yellow tint, so the state is not shown by colour alone.
// `kind` is what issueClass returns: 'incomplete', 'warn' or ''.
const MARKS = { incomplete: '✕ Incomplete', warn: '⚠ Warning' };

export default function StateMark({ kind }) {
  if (!MARKS[kind]) return null;
  return <span className={`state-mark ${kind}`}>{MARKS[kind]}</span>;
}

export const stateWord = (kind) => (MARKS[kind] ? MARKS[kind].slice(2) : '');
