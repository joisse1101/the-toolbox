// GENERATED. Do not edit this copy.
// The one table of the files written under `<data folder>/<backlog>/`: path, who writes it and how long it lives.
// planner/guidelines/plans-files.md shows the same table to people, and a test keeps the two equal. The .gitignore block
// the story skills print is built from these rows, so a file the table lacks is a file the block would not cover.
//
// Lifecycles: `committed` (belongs in git), `local` (stays on the machine, ignored), `user decides` (re-included so a plain
// `git add` works, untracked until the user commits it or declines), `removed by archive` (/jois-code:archive deletes it).
//
// gitignoreBlock({ dataDir, root }) answers the block as text for a data folder inside the project, or null when the folder
// is outside the project (or is the project itself), where no .gitignore of the project applies.

import path from 'node:path';

export const LIFECYCLES = ['committed', 'local', 'user decides', 'removed by archive'];

export const PLANS_FILES = [
  { path: 'user-stories.csv', writer: 'portal, jois-story-plan (Frozen cell)', lifecycle: ['committed'] },
  { path: 'lexicon.csv', writer: 'portal, jois-story-propose', lifecycle: ['committed'] },
  { path: 'backlog.json', writer: 'portal (story-ID initials)', lifecycle: ['committed'] },
  { path: 'context-map.json', writer: 'jois-story-plan', lifecycle: ['committed'] },
  { path: 'context-map.md', writer: 'jois-story-plan', lifecycle: ['committed'] },
  { path: 'user-stories/proposals.csv', writer: 'jois-story-propose', lifecycle: ['local'] },
  { path: 'user-stories/review.csv', writer: 'jois-story-review, jois-story-propose, portal', lifecycle: ['local'] },
  { path: 'user-stories/review.csv.decided', writer: 'jois-story-review, jois-story-propose, portal', lifecycle: ['local'] },
  { path: 'lexicon/lexicon-suggestions.csv', writer: 'jois-story-propose', lifecycle: ['local'] },
  { path: 'slices/<slice>/ARCHIVED.md', writer: '/jois-code:archive', lifecycle: ['committed'] },
  { path: 'slices/<slice>/source.json', writer: 'jois-story-plan', lifecycle: ['committed'] },
  { path: 'slices/<slice>/UC-<slice>.md', writer: 'jois-story-plan', lifecycle: ['user decides', 'removed by archive'] },
  { path: 'slices/<slice>/tasks.md', writer: 'jois-story-plan, /jois-code:apply (ticks)', lifecycle: ['user decides', 'removed by archive'] },
  { path: 'slices/<slice>/review.md', writer: '/jois-code:apply', lifecycle: ['local', 'removed by archive'] },
  { path: 'slices/<slice>/validation.md', writer: '/jois-code:validate', lifecycle: ['local', 'removed by archive'] },
  { path: 'slices/<slice>/validation.partial.md', writer: '/jois-code:validate', lifecycle: ['local', 'removed by archive'] },
];

// A row's path as a gitignore pattern under the backlog folder: `<slice>` stands for any slice name.
const pattern = (rowPath) => rowPath.replace(/<slice>/g, '*');
const kept = (row) => row.lifecycle.includes('committed') || row.lifecycle.includes('user decides');

export const BLOCK_COMMENT = '# planner data: committed files only (printed by jois-story-plan/print-gitignore.mjs)';

// The data folder as a path relative to the project root with `/` separators, or null when it is outside the root or is the root.
export function relativeDataDir({ dataDir, root }) {
  const rel = path.relative(path.resolve(root), path.resolve(dataDir));
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join('/');
}

export function gitignoreBlock({ dataDir, root }) {
  const base = relativeDataDir({ dataDir, root });
  if (base === null) return null;
  const direct = PLANS_FILES.filter((row) => kept(row) && !row.path.startsWith('slices/'));
  const inSlices = PLANS_FILES.filter((row) => kept(row) && row.path.startsWith('slices/'));
  const lines = [
    BLOCK_COMMENT,
    // Each folder level ignores its contents (`x/*`), never the folder, so a file below can still be re-included.
    `!${base}/`,
    `${base}/*`,
    `!${base}/*/`,
    `${base}/*/*`,
    ...direct.map((row) => `!${base}/*/${pattern(row.path)}`),
    `!${base}/*/slices/`,
    `${base}/*/slices/*`,
    `!${base}/*/slices/*/`,
    `${base}/*/slices/*/*`,
    ...inSlices.map((row) => `!${base}/*/${pattern(row.path)}`),
  ];
  return `${lines.join('\n')}\n`;
}
