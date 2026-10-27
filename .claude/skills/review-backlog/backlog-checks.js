// The checks of a backlog that need no judgement: dependency links, duplicates, points, missing parts, words the lexicon
// says to avoid, and overlap with the proposals. Feeds the review skill's `checks` section. Pure: no file access.
//   backlogChecks({ stories, lexicon, proposals }) -> [{ storyId, title, locked, kind, message }]
// A problem about a lexicon term has `term` instead of `storyId` and `title`. Locked stories are checked too, and marked
// `locked`, because the review uses them as context but does not review them. Priority is never checked.

import { backlogProblems } from '../../../planner/logic/backlog/ids.js';
import { POINTS, SPLIT_ABOVE, storyIssues } from '../../../planner/logic/backlog/model.js';
import { lexiconProblems } from '../../../planner/logic/lexicon/lexicon.js';

const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const same = (s) => `${norm(s.epic)} | ${norm(s.feature)} | ${norm(s.title)}`;
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The text of a story where a lexicon word can appear: [label, text] pairs.
function wordingOf(story) {
  const criteria = story.rawCriteria ?? story.criteria.map((c) => `${c.given} ${c.when} ${c.then}`).join('\n');
  const userStory = story.rawUserStory ?? `${story.asA} ${story.iWant} ${story.soThat}`;
  return [['Title', story.title], ['User Story', userStory], ['User Acceptance Criteria', criteria]];
}

const hasWord = (text, word) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word.trim())}(?![\\p{L}\\p{N}])`, 'iu').test(text);

function pointsProblem(story) {
  const raw = String(story.points ?? '').trim();
  if (!raw) return 'Sprint points are missing';
  if (!POINTS.includes(Number(raw))) return `Sprint points "${raw}" are not on the scale ${POINTS.join(', ')}`;
  if (Number(raw) > SPLIT_ABOVE) return `Sprint points ${raw} are above ${SPLIT_ABOVE}: the story is to be split`;
  return null;
}

export function backlogChecks({ stories, lexicon = null, proposals = [] }) {
  const out = [];
  const add = (story, kind, message) => out.push({ storyId: story.code || '(no ID)', title: story.title, locked: story.locked, kind, message });

  const dependency = backlogProblems(stories);
  const proposed = proposals.filter((p) => !p.benched);
  const proposedByKey = new Map();
  for (const p of proposed) if (norm(p.title)) proposedByKey.set(same(p), [...(proposedByKey.get(same(p)) ?? []), p]);
  const byKey = new Map();
  for (const s of stories) if (norm(s.title)) byKey.set(same(s), [...(byKey.get(same(s)) ?? []), s]);
  const avoided = (lexicon?.terms ?? []).flatMap((t) => t.avoid.map((word) => ({ word, term: t.name })));

  for (const s of stories) {
    for (const message of dependency.get(s.id) ?? []) add(s, 'dependency', message);
    for (const message of storyIssues(s).errors) add(s, 'incomplete', message);
    const points = pointsProblem(s);
    if (points) add(s, 'points', points);

    const twins = (byKey.get(same(s)) ?? []).filter((o) => o !== s);
    if (twins.length) add(s, 'duplicate', `Same Epic, Feature and Title as ${twins.map((o) => o.code || '(no ID)').join(', ')}`);
    for (const p of proposedByKey.get(same(s)) ?? []) add(s, 'proposal-overlap', `Same Epic, Feature and Title as the proposed story ${p.code}`);

    for (const { word, term } of avoided) {
      const where = wordingOf(s).filter(([, text]) => hasWord(text, word)).map(([label]) => label);
      if (where.length) add(s, 'avoid-word', `Uses "${word}" in ${where.join(', ')}; the lexicon says to use "${term}"`);
    }

    s.clarifications.forEach((pair, i) => {
      if (pair.q.trim() && pair.a.trim()) add(s, 'unresolved-answer', `Q${i + 1} is answered but still in Clarifications: resolve it into Notes`);
    });
  }

  if (lexicon) for (const p of lexiconProblems(lexicon)) out.push({ term: p.term, kind: 'lexicon', message: p.message });
  return out;
}
