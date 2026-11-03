// GENERATED. Do not edit this copy.
// Checks that a story ID still names the story the caller means: the caller sends the ID with the story's Title, and a
// mismatch comes back as a message that lets the agent find the story again. Pure: `stories` is a list of
// { code, title, epic, feature, benched? } (backlog stories, or proposed ones).

// The same comparison as the repeated-story key of the proposals writer: ignoring case and surrounding spaces.
export const sameTitle = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

const where = (s) => [s.epic, s.feature].map((x) => String(x ?? '').trim()).filter(Boolean).join(' > ') || 'no Epic';
const quoted = (t) => `"${String(t ?? '').trim()}"`;

// { id, title } -> { ok: true, story } (story is undefined when the ID is not in the list and no Title was required or given)
// or { ok: false, message }.
//   required: a missing Title is refused (the skills ask for it when they pass a Title with every ID); otherwise it is not checked (the CLI scripts), and a Title that is
//             given is always checked.
//   key:      the name of the Title in the caller's input, used in the "add the Title" message.
//   hint:     where to look when no story has the Title, e.g. "the index section (read-story-context.mjs <backlog> --section index)".
export function resolveStoryRef(stories, { id, title }, { required = false, key = 'storyTitle', hint = 'the index section (read-story-context.mjs <backlog> --section index)' } = {}) {
  const held = stories.filter((s) => s.code === id);
  const given = typeof title === 'string' && title.trim() !== '';
  if (!given) {
    if (required) return { ok: false, message: `${id} needs the story's current Title next to it (${key}); read it with read-story-context.mjs (--search or --section index) and send both.` };
    return { ok: true, story: held[0] };
  }
  const match = held.find((s) => sameTitle(s.title, title));
  if (match) return { ok: true, story: match };
  const now = held.length ? `${id} is now ${held.map((s) => `${quoted(s.title)} (${where(s)})`).join(' and ')}, not ${quoted(title)}` : `${id} is not in the file`;
  const found = stories.filter((s) => sameTitle(s.title, title));
  const candidates = found.length
    ? `Stories titled ${quoted(title)}: ${found.map((s) => `${s.code} (${where(s)})${s.benched ? ' [benched]' : ''}`).join(', ')}. Read the one you mean (read-story-context.mjs <backlog> <ID> --title <Title>) and repeat the command with its ID and Title, or ask the user when you cannot tell which it is.`
    : `No story is titled ${quoted(title)}: look in ${hint}, or ask the user which story is meant.`;
  return { ok: false, message: `${now}. ${candidates}` };
}
