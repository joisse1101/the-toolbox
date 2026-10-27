import { COLUMNS, BENCHED_COLUMN, NO_EPIC, NO_FEATURE, clarificationsCellText, criteriaCellText, storyCellText } from './model.js';

const KNOWN = new Set([...COLUMNS, BENCHED_COLUMN].map((c) => c.toLowerCase()));

// Every text of a story that a search looks in, lowercased. A known column is read from the live story fields, since
// `story.cells` is only rebuilt on save; a column the tool does not know is read from `cells`, its only home.
function haystack(story, headers) {
  const unknown = headers.map((h, i) => (KNOWN.has(h.trim().toLowerCase()) ? '' : story.cells[i] ?? ''));
  return [
    story.code, story.epic, story.feature, story.title, story.points, story.priority, story.notes,
    story.dependsOn.join(' '), storyCellText(story), criteriaCellText(story), clarificationsCellText(story),
    ...unknown,
  ].join('\n').toLowerCase();
}

// A story matches when every space-separated word of the query appears (ignoring case) in some field. A blank query
// matches every story.
export function matchesQuery(story, query, headers) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = haystack(story, headers);
  return words.every((w) => text.includes(w));
}

export const SEARCH_CAP = 25;

// One line per matching story, `ID | Title | Epic > Feature | source`. Benched proposed stories never match.
export function findStories(stories, query, headers, source) {
  return stories
    .filter((s) => !s.benched && matchesQuery(s, query, headers))
    .map((s) => `${s.code} | ${s.title || '(no title)'} | ${s.epic || NO_EPIC} > ${s.feature || NO_FEATURE} | ${source}`);
}

// The reply for the lines of all sources: the count, at most SEARCH_CAP lines, and what was left out.
export function searchReply(lines) {
  if (!lines.length) return 'No story matches.';
  const shown = lines.slice(0, SEARCH_CAP);
  const more = lines.length - shown.length;
  const head = `${lines.length} ${lines.length === 1 ? 'story matches' : 'stories match'} (ID | Title | Epic > Feature | source):`;
  return [head, ...shown, ...(more ? [`${more} more matched; narrow the query.`] : [])].join('\n');
}
