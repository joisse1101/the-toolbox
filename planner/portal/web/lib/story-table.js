import { PRIORITIES } from '../../../logic/backlog/model.js';

// Filter and sort for the Stories tab table. Pure: the table's rows come in, the rows to show come out.

export const NONE = '(none)'; // filter value that matches a story with an empty field

export const SORT_KEYS = ['code', 'epic', 'feature', 'title', 'points', 'dependsOn']; // Priority is filtered, not sorted

const sortValue = (story, key) => (key === 'dependsOn' ? story.dependsOn.join(', ') : String(story[key] ?? '')).trim();

// A blank filter value ('') keeps every story. Each of priority, epic and feature, when set, must equal the story's
// value (ignoring surrounding spaces); NONE matches an empty one.
export function filterStories(stories, { priority = '', epic = '', feature = '' } = {}) {
  const matches = (value, wanted) => !wanted || (wanted === NONE ? value.trim() === '' : value.trim() === wanted);
  return stories.filter((s) => matches(s.priority, priority) && matches(s.epic, epic) && matches(s.feature, feature));
}

// Alphabetical by one column, ignoring case, with digit runs in numeric order (IAM-0002 before IAM-0010, 3 before 13).
// Empty values go last either way. The sort is stable, so ties keep their incoming order. dir is 'asc' or 'desc'.
export function sortStories(stories, key, dir = 'asc') {
  if (!SORT_KEYS.includes(key)) return stories;
  const sign = dir === 'desc' ? -1 : 1;
  return [...stories].sort((a, b) => {
    const [x, y] = [sortValue(a, key), sortValue(b, key)];
    if (!x || !y) return x === y ? 0 : x ? -1 : 1;
    return sign * x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
  });
}

// The values a filter dropdown offers, sorted, with NONE last when some story has no value. Priority keeps its own order.
export function filterOptions(stories, key) {
  const values = stories.map((s) => s[key].trim());
  const named = [...new Set(values.filter(Boolean))];
  named.sort(key === 'priority' ? (a, b) => PRIORITIES.indexOf(a) - PRIORITIES.indexOf(b) : (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return values.includes('') ? [...named, NONE] : named;
}
