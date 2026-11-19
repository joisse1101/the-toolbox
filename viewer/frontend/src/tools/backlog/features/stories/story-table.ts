import type { Story } from '#shared/types.ts';

// Filter and sort for the Stories tab table. Pure: the table's rows come in, the rows to show come out.

export const NONE = '(none)'; // filter value that matches a story with an empty field

export type FilterKey = 'epic' | 'feature';
export type SortDir = 'asc' | 'desc';
export type Filter = Record<FilterKey, string>;

export const SORT_KEYS: readonly string[] = ['code', 'epic', 'feature', 'title', 'points', 'dependsOn'];

const sortValue = (story: Story, key: string) => (key === 'dependsOn' ? story.dependsOn.join(', ') : String(story[key as keyof Story] ?? '')).trim();

// A blank filter value ('') keeps every story. Each of epic and feature, when set, must equal the story's
// value (ignoring surrounding spaces); NONE matches an empty one.
export function filterStories(stories: readonly Story[], { epic = '', feature = '' }: Partial<Filter> = {}): Story[] {
  const matches = (value: string, wanted: string) => !wanted || (wanted === NONE ? value.trim() === '' : value.trim() === wanted);
  return stories.filter((s) => matches(s.epic, epic) && matches(s.feature, feature));
}

// The ticked stories a bulk action may touch: those among the rows on screen. A ticked story the search or filters hide is
// left alone and only counted. Returns { ids: Set of ticked visible ids, hiddenCount }.
export function visibleChecked(rows: readonly Story[], checked: ReadonlySet<number>): { ids: Set<number>; hiddenCount: number } {
  const ids = new Set(rows.filter((s) => checked.has(s.id)).map((s) => s.id));
  return { ids, hiddenCount: checked.size - ids.size };
}

// Alphabetical by one column, ignoring case, with digit runs in numeric order (IAM-0002 before IAM-0010, 3 before 13).
// Empty values go last either way. The sort is stable, so ties keep their incoming order. dir is 'asc' or 'desc'.
export function sortStories(stories: Story[], key: string, dir: SortDir = 'asc'): Story[] {
  if (!SORT_KEYS.includes(key)) return stories;
  const sign = dir === 'desc' ? -1 : 1;
  return [...stories].sort((a, b) => {
    const [x, y] = [sortValue(a, key), sortValue(b, key)];
    if (!x || !y) return x === y ? 0 : x ? -1 : 1;
    return sign * x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
  });
}

// The values a filter dropdown offers, sorted, with NONE last when some story has no value.
export function filterOptions(stories: readonly Story[], key: FilterKey): string[] {
  const values = stories.map((s) => s[key].trim());
  const named = [...new Set(values.filter(Boolean))];
  named.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return values.includes('') ? [...named, NONE] : named;
}
