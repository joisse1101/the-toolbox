// The link between a slice and the stories it was drawn from. Story IDs are derived and shift on every renumber, so the
// diagram files hold none; `source.json` holds { scope, stories: [{ id, title, hash, epic, feature }], drawnAt } and is
// healed by Title against the backlog on every read. Pure: `backlogStories` are the stories of loadBacklog.
import { createHash } from 'node:crypto';
import { sameTitle } from '../backlog/story-ref.js';
import { storyCellText, criteriaCellText } from '../backlog/model.js';

const norm = (s) => String(s ?? '').trim().toLowerCase();

// Short hash of what a story means: Title, User Story and criteria (not Notes, Priority or points).
export const storyHash = (story) =>
  createHash('sha256')
    .update(JSON.stringify([story.title, storyCellText(story), criteriaCellText(story)].map((s) => String(s ?? '').trim())))
    .digest('hex')
    .slice(0, 12);

// The stories of the backlog a scope covers. scope: { type: 'epic', epic } | { type: 'feature', epic, feature } |
// { type: 'story', epic, feature, title }.
export function scopeStories(backlogStories, scope) {
  return backlogStories.filter((s) => {
    if (norm(s.epic) !== norm(scope.epic)) return false;
    if (scope.type !== 'epic' && norm(s.feature) !== norm(scope.feature)) return false;
    if (scope.type === 'story' && !sameTitle(s.title, scope.title)) return false;
    return true;
  });
}

const entryOf = (s) => ({ id: s.code, title: s.title.trim(), hash: storyHash(s), epic: s.epic.trim(), feature: s.feature.trim() });

// A new source.json for the stories of a scope, as the backlog holds them now.
export function buildSource(backlogStories, scope, drawnAt) {
  return { scope, stories: scopeStories(backlogStories, scope).map(entryOf), drawnAt };
}

// The tie-breakers keep the candidates they select, but never narrow a tie down to nothing: a tie they cannot break stays one.
const narrow = (list, keep) => {
  if (list.length < 2) return list;
  const kept = list.filter(keep);
  return kept.length ? kept : list;
};

// Compares a source with the backlog as it is now and heals shifted IDs by Title.
//   -> { source: the source with healed IDs, stories: [{ title, status: 'ok'|'changed'|'missing'|'ambiguous', id }],
//        healed: [{ title, from, to }], added: [{ id, title }], stale: boolean }
// stale: a story changed, is missing, or the scope now holds a story the slice does not list. An ambiguous story is
// reported and left as it is.
export function compareSource(source, backlogStories) {
  const inScope = scopeStories(backlogStories, source.scope);
  const taken = new Set();
  const healed = [];
  const stories = [];
  const entries = source.stories.map((entry) => {
    let candidates = inScope.filter((s) => !taken.has(s) && sameTitle(s.title, entry.title));
    candidates = narrow(candidates, (s) => entry.feature == null || norm(s.feature) === norm(entry.feature));
    candidates = narrow(candidates, (s) => s.code === entry.id);
    if (candidates.length === 0) {
      stories.push({ title: entry.title, status: 'missing', id: entry.id });
      return entry;
    }
    if (candidates.length > 1) {
      stories.push({ title: entry.title, status: 'ambiguous', id: entry.id });
      return entry;
    }
    const [story] = candidates;
    taken.add(story);
    if (story.code !== entry.id) healed.push({ title: entry.title, from: entry.id, to: story.code });
    stories.push({ title: entry.title, status: storyHash(story) === entry.hash ? 'ok' : 'changed', id: story.code });
    return { ...entry, id: story.code };
  });
  const added = inScope.filter((s) => !taken.has(s)).map((s) => ({ id: s.code, title: s.title.trim() }));
  const stale = added.length > 0 || stories.some((s) => s.status === 'changed' || s.status === 'missing');
  return { source: { ...source, stories: entries }, stories, healed, added, stale };
}

// The criteria of a story as { label, text }, `text` being the criterion as written after its `AC<n>:` label.
export function criteriaOf(story) {
  if (typeof story.rawCriteria === 'string') {
    return story.rawCriteria
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((l, i) => {
        const m = /^\s*(AC\d+)\s*:\s*(.*)$/i.exec(l);
        return { label: m ? m[1].toUpperCase() : `AC${i + 1}`, text: (m ? m[2] : l).trim() };
      });
  }
  return story.criteria
    .filter((c) => c.given.trim() || c.when.trim() || c.then.trim())
    .map((c, i) => ({ label: `AC${i + 1}`, text: `Given ${c.given.trim()}, when ${c.when.trim()}, then ${c.then.trim()}` }));
}

const BLOCK = /<!-- stories:start -->[\s\S]*?<!-- stories:end -->/;

// The generated story list of the specification: one `- <id> <Title>` line per story of the source.
export const storiesBlock = (source) =>
  ['<!-- stories:start -->', ...source.stories.map((s) => `- ${s.id} ${s.title}`), '<!-- stories:end -->'].join('\n');

// Specification text with its generated block replaced. Throws when the markers are missing.
export function applyStoriesBlock(markdown, source) {
  if (!BLOCK.test(markdown)) throw new Error('the specification has no <!-- stories:start --> ... <!-- stories:end --> block');
  return markdown.replace(BLOCK, () => storiesBlock(source));
}
