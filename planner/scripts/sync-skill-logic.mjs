// Writes the planner logic and guidelines that each story skill needs into the skill's own folder, so an installed
// skill runs with nothing from planner/. The planner stays the source; the copies are generated and never edited.
//
//   node planner/scripts/sync-skill-logic.mjs [--skills-dir <folder>] [--out <folder>]
//
// --skills-dir  where the skill folders are (default: <repo>/toolkit/skills). A skill in SKILLS whose folder is not
//               there yet is skipped, so the script works before and after each skill moves into the toolkit.
// --out         where to write (default: the same folder as --skills-dir). The sync test points it at a temp folder.
//
// Per skill it writes
//   lib/<path under planner/logic>   the files in SKILLS[skill].logic and every file they import at the top level of
//                                    the file (an import inside a function is lazy and is not followed)
//   references/<file>                the guidelines in SKILLS[skill].guidelines
// The folders under lib/ mirror planner/logic/, so a relative import between two copied files is unchanged; imports
// are still rewritten from the new location (see rewriteImports) so a later change of layout stays correct.
// Each copy starts with a line naming its source and saying not to edit it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLANNER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.dirname(PLANNER);
const LOGIC = path.join(PLANNER, 'logic');
const GUIDELINES = path.join(PLANNER, 'guidelines');

export const DEFAULT_SKILLS_DIR = path.join(REPO, 'toolkit', 'skills');

const SUPPORT = ['skill-support/paths.cjs', 'skill-support/write-atomic.mjs', 'skill-support/resolve-data-dir.mjs'];
// The skills that may create `.plans` after asking (explore only reports, so it has no init-plans.mjs).
const INIT = ['skill-support/init-plans.mjs'];
const STORY_GUIDELINES =['product-backlog.md', 'sprint-points-guideline.md'];

// What each skill's scripts import (paths under planner/logic/; the files those import come along). Diagram logic is
// not here: it belongs to jois-story-plan and is not copied.
export const SKILLS = {
  'jois-story-review': {
    // read-backlog, backlog-checks, write-review
    logic: ['backlog/model.js', 'backlog/ids.js', 'lexicon/lexicon.js', 'review/review.js', 'storage/backlog-paths.cjs', ...SUPPORT, ...INIT],
    guidelines: STORY_GUIDELINES,
  },
  'jois-story-explore': {
    // read-story-context
    logic: [
      'backlog/csv.js', 'backlog/model.js', 'backlog/story-search.js', 'backlog/story-ref.js', 'review/review.js',
      'lexicon/lexicon-suggestions.js', 'storage/backlog-paths.cjs', ...SUPPORT,
    ],
    guidelines: STORY_GUIDELINES,
  },
  'jois-story-propose': {
    // proposal-input, write-proposal, write-lexicon, suggest-lexicon, and read-story-context (a copy of the explore skill's reader)
    logic: [
      'backlog/csv.js', 'backlog/model.js', 'backlog/proposals.js', 'backlog/ids.js', 'backlog/story-ref.js', 'backlog/story-search.js',
      'backlog/story-text.js', 'review/review.js', 'lexicon/lexicon.js', 'lexicon/lexicon-suggestions.js', 'storage/backlog-paths.cjs', ...SUPPORT, ...INIT,
    ],
    guidelines: STORY_GUIDELINES,
  },
  'jois-story-plan': {
    // read-diagrams, write-diagram, write-context-map (the diagram logic is the skill's own)
    logic: ['backlog/model.js', 'backlog/story-ref.js', 'storage/backlog-paths.cjs', ...SUPPORT, ...INIT],
    guidelines: [...STORY_GUIDELINES, 'diagram-conventions.md'],
  },
};

const posix = (p) => p.split(path.sep).join('/');

// A relative import or require at the start of a line (the only kind that is followed).
const TOP_LEVEL_IMPORT = /^(?:import\b[^'";]*?from\s*|import\s*|(?:const|let|var)\b[^\n]*?=\s*require\(\s*)['"](\.{1,2}\/[^'"]+)['"]/gm;
// Every relative specifier, wherever it is, for rewriting.
const ANY_RELATIVE = /((?:from\s*|import\s*\(?\s*|require\(\s*)['"])(\.{1,2}\/[^'"]+)(['"])/g;

function topLevelImports(file) {
  const text = fs.readFileSync(file, 'utf8');
  return [...text.matchAll(TOP_LEVEL_IMPORT)].map((m) => path.resolve(path.dirname(file), m[1]));
}

// The files of `roots` (absolute paths) and everything they import at the top level, all under planner/logic/.
function closure(roots) {
  const seen = new Set();
  const queue = [...roots];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    if (!file.startsWith(LOGIC + path.sep)) throw new Error(`${posix(path.relative(REPO, file))} is outside planner/logic/ and cannot be copied into a skill`);
    if (!fs.existsSync(file)) throw new Error(`${posix(path.relative(REPO, file))} does not exist`);
    seen.add(file);
    queue.push(...topLevelImports(file));
  }
  return [...seen].sort();
}

// Points each relative specifier of a copied file at the copy of its target. A specifier whose target is not copied
// is left as written (a lazy require that is never reached in a skill).
export function rewriteImports(text, sourceFile, destFile, destOf) {
  return text.replace(ANY_RELATIVE, (whole, before, specifier, after) => {
    const target = destOf.get(path.resolve(path.dirname(sourceFile), specifier));
    if (!target) return whole;
    let rel = posix(path.relative(path.dirname(destFile), target));
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return `${before}${rel}${after}`;
  });
}

const NOTE = 'Do not edit this copy.';

// All generated files of one skill as Map<path relative to the skill folder, text>.
export function generateSkill(skill) {
  const spec = SKILLS[skill];
  const files = closure(spec.logic.map((rel) => path.join(LOGIC, rel)));
  const destOf = new Map(files.map((file) => [file, path.join('lib', path.relative(LOGIC, file))]));
  const out = new Map();
  for (const file of files) {
    const dest = destOf.get(file);
    const body = rewriteImports(fs.readFileSync(file, 'utf8'), file, dest, destOf);
    out.set(posix(dest), `// GENERATED. ${NOTE}\n${body}`);
  }
  for (const name of spec.guidelines) {
    const file = path.join(GUIDELINES, name);
    out.set(`references/${name}`, `<!-- GENERATED. ${NOTE} -->\n\n${fs.readFileSync(file, 'utf8')}`);
  }
  return out;
}

// Writes every skill whose folder exists under skillsDir into outDir. Returns { written: [{skill, file}], skipped: [skill] }.
export function syncSkills({ skillsDir = DEFAULT_SKILLS_DIR, outDir = skillsDir } = {}) {
  const written = [];
  const skipped = [];
  for (const skill of Object.keys(SKILLS)) {
    if (!fs.existsSync(path.join(skillsDir, skill))) {
      skipped.push(skill);
      continue;
    }
    for (const [rel, text] of generateSkill(skill)) {
      const target = path.join(outDir, skill, ...rel.split('/'));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, text, 'utf8');
      written.push({ skill, file: rel });
    }
  }
  return { written, skipped };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? undefined : path.resolve(args[i + 1] ?? '');
  };
  const skillsDir = option('--skills-dir') ?? DEFAULT_SKILLS_DIR;
  const { written, skipped } = syncSkills({ skillsDir, outDir: option('--out') ?? skillsDir });
  for (const { skill, file } of written) console.log(`${skill}/${file}`);
  for (const skill of skipped) console.log(`skipped ${skill}: no folder in ${skillsDir}`);
}
