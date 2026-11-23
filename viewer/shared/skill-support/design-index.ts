// The story index of a design (viewer/shared/guidelines/design-conventions.md): builds it from the rows of `design-index.csv`
// (see ../design/design-index-csv.ts), compares it with the backlog's stories by story ID and exact criterion text, and checks
// that every criterion has an artboard. Pure: no file is read or written, so jois-story-design and jois-story-plan each run it
// from their own script. The comparison uses the categories of read-diagrams.mjs (changed, missing, new); a story with an open
// clarification is left out of a design on purpose, so it is never reported as new.

import type { Story } from '../types.ts';
import { clarificationsCellText } from '../backlog/model.ts';
import { sameTitle } from '../backlog/story-ref.ts';
import { openCount, parseClarifications } from '../backlog/story-text.ts';
import { IndexError } from '../design/design-index-csv.ts';
import type { CriterionKind, DesignIndexRow, Viewport } from '../design/design-index-csv.ts';

export { IndexError };
export type { CriterionKind, Viewport };

export type DesignScope =
  | { type: 'epic'; epic: string }
  | { type: 'feature'; epic: string; feature: string }
  | { type: 'story'; epic: string; feature: string; title: string };

// One entry of `<backlog>/designs.json`: the scope a canvas designs and the canvas link, which a row's Canvas joins to.
export interface DesignEntry {
  scope: DesignScope;
  url: string;
}

const SCOPE_FIELDS: Record<string, string[]> = { epic: ['epic'], feature: ['epic', 'feature'], story: ['epic', 'feature', 'title'] };
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

// The entries of the text of `designs.json`. Throws an Error that names what is wrong, so a caller can put the file's name before it.
export function parseDesignsText(text: string): DesignEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`it is not valid JSON: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.designs)) throw new Error('it must hold { "designs": [ ... ] }');
  const designs: unknown[] = parsed.designs;
  designs.forEach((entry, i) => {
    const scope = isRecord(entry) && isRecord(entry.scope) ? entry.scope : undefined;
    const fields = scope ? SCOPE_FIELDS[String(scope.type)] : undefined;
    if (!scope || !fields || !fields.every((f) => isText(scope[f])) || !isRecord(entry) || !isText(entry.url)) {
      throw new Error(`designs[${i}] must hold a scope (epic, feature or story) and a url`);
    }
  });
  return designs as DesignEntry[];
}

export interface IndexCriterion {
  text: string;
  kind: CriterionKind;
  artboards: string[];
  viewports: Viewport[];
}

export interface IndexStory {
  storyId: string;
  title: string;
  canvases: string[]; // the canvas links of the story's rows
  criteria: IndexCriterion[];
}

export interface DesignIndex {
  stories: IndexStory[];
}

const ERROR_STATE = 'error';

// The index the rows hold: one entry per story ID, in the order its first row appears, with its criteria in row order.
export function buildDesignIndex(rows: readonly DesignIndexRow[]): DesignIndex {
  const stories = new Map<string, IndexStory>();
  for (const row of rows) {
    let story = stories.get(row.storyId);
    if (!story) {
      story = { storyId: row.storyId, title: row.story, canvases: [], criteria: [] };
      stories.set(row.storyId, story);
    }
    if (!story.canvases.includes(row.canvas)) story.canvases.push(row.canvas);
    story.criteria.push({ text: row.criterion, kind: row.kind, artboards: row.artboards, viewports: row.viewports });
  }
  return { stories: [...stories.values()] };
}

const norm = (s: unknown): string => String(s ?? '').trim().toLowerCase();

// The stories of the backlog the scope covers, by Epic, Feature and Title (the same match as the plan skill's source.json).
export function storiesInScope(backlogStories: readonly Story[], scope: DesignScope): Story[] {
  return backlogStories.filter((s) => {
    if (norm(s.epic) !== norm(scope.epic)) return false;
    if (scope.type !== 'epic' && norm(s.feature) !== norm(scope.feature)) return false;
    if (scope.type === 'story' && !sameTitle(s.title, scope.title)) return false;
    return true;
  });
}

// The criteria of a story as the index holds them: the text after the `AC<n>:` label, in the story's order.
export function criterionTexts(story: Story): string[] {
  if (typeof story.rawCriteria === 'string') {
    return story.rawCriteria
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((l) => (/^\s*AC\d+\s*:\s*(.*)$/i.exec(l)?.[1] ?? l).trim());
  }
  return story.criteria
    .filter((c) => c.given.trim() || c.when.trim() || c.then.trim())
    .map((c) => `Given ${c.given.trim()}, when ${c.when.trim()}, then ${c.then.trim()}`);
}

// The stories of the backlog that the scope of any `designs.json` entry covers, each once.
export function storiesInDesigns(backlogStories: readonly Story[], designs: readonly DesignEntry[]): Story[] {
  const found = new Set<Story>();
  for (const { scope } of designs) for (const story of storiesInScope(backlogStories, scope)) if (story.code) found.add(story);
  return [...found];
}

// A story with an open question is left out of a design on purpose. A clarification cell that does not parse counts as
// not open, as in the freeze writer.
function hasOpenClarification(story: Story): boolean {
  const parsed = parseClarifications(clarificationsCellText(story));
  return parsed.ok && openCount(parsed.pairs) > 0;
}

export interface ChangedStory {
  storyId: string;
  title: string; // the story's Title in the backlog now
  oldTitle: string | null; // the Title the rows hold, when it differs
  removed: string[]; // criteria the rows hold and the backlog no longer does, by text
  added: string[]; // criteria the backlog holds and the rows do not
}

export interface StoryName {
  storyId: string;
  title: string;
}

export interface IndexComparison {
  changed: ChangedStory[];
  missing: StoryName[]; // story IDs in the rows and not in the backlog (Title as the rows hold it)
  new: StoryName[]; // stories in a designed scope with no rows, leaving out stories with an open clarification
  stale: boolean;
}

const sameTexts = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((t, i) => t.trim() === b[i].trim());

// The rows' index against the stories of the backlog (loadBacklog's stories). A story is matched by its ID. It is `missing`
// when its ID is not in the backlog, and `changed` when its criteria texts or its Title differ from the rows. A story is `new`
// when it is in the scope of a `designs.json` entry, has no rows and has no open clarification. Only the scopes of `designs`
// are searched, so a row whose Canvas has no entry (a migrated story) is checked for changed and missing and never makes its
// backlog report `new` stories.
export function compareIndex(index: DesignIndex, backlogStories: readonly Story[], designs: readonly DesignEntry[]): IndexComparison {
  const changed: ChangedStory[] = [];
  const missing: StoryName[] = [];
  const indexed = new Set(index.stories.map((entry) => entry.storyId));
  for (const entry of index.stories) {
    const story = backlogStories.find((s) => s.code === entry.storyId);
    if (!story) {
      missing.push({ storyId: entry.storyId, title: entry.title });
      continue;
    }
    const indexedTexts = entry.criteria.map((c) => c.text);
    const current = criterionTexts(story);
    const retitled = !sameTitle(story.title, entry.title);
    if (!retitled && sameTexts(indexedTexts, current)) continue;
    changed.push({
      storyId: entry.storyId,
      title: story.title.trim(),
      oldTitle: retitled ? entry.title : null,
      removed: indexedTexts.filter((t) => !current.some((c) => c.trim() === t.trim())),
      added: current.filter((c) => !indexedTexts.some((t) => t.trim() === c.trim())),
    });
  }
  const fresh = new Map<string, StoryName>();
  for (const story of storiesInDesigns(backlogStories, designs)) {
    if (indexed.has(story.code) || fresh.has(story.code) || hasOpenClarification(story)) continue;
    fresh.set(story.code, { storyId: story.code, title: story.title.trim() });
  }
  return { changed, missing, new: [...fresh.values()], stale: changed.length > 0 || missing.length > 0 || fresh.size > 0 };
}

export interface CoverageProblem {
  storyId: string;
  story: string;
  criterion: string;
}

export interface IndexCoverage {
  noArtboard: CoverageProblem[]; // a criterion whose artboards list is empty
  noErrorArtboard: CoverageProblem[]; // a failure criterion with no artboard whose stem holds "error"
  ok: boolean;
}

// What the index itself can prove. Whether each flow clicks through needs the artboards' links, which only a read of the
// canvas shows, so it is not checked here.
export function checkCoverage(index: DesignIndex): IndexCoverage {
  const noArtboard: CoverageProblem[] = [];
  const noErrorArtboard: CoverageProblem[] = [];
  for (const story of index.stories) {
    for (const criterion of story.criteria) {
      const problem = { storyId: story.storyId, story: story.title, criterion: criterion.text };
      if (criterion.artboards.length === 0) noArtboard.push(problem);
      if (criterion.kind === 'failure' && !criterion.artboards.some((stem) => stem.includes(ERROR_STATE))) noErrorArtboard.push(problem);
    }
  }
  return { noArtboard, noErrorArtboard, ok: noArtboard.length === 0 && noErrorArtboard.length === 0 };
}
