// Writes the shared logic and guidelines that each story skill needs into the skill's own folder, so an installed
// skill runs with nothing from viewer/. The viewer's shared/ folder stays the source; the copies are generated and never edited.
//
//   node viewer/scripts/sync-skill-logic.ts [--skills-dir <folder>] [--out <folder>]
//
// --skills-dir  where the skill folders are (default: <repo>/toolkit/skills). A skill in SKILLS whose folder is not
//               there yet is skipped, so the script works before and after each skill moves into the toolkit.
// --out         where to write (default: the same folder as --skills-dir). The sync test points it at a temp folder.
//
// Per skill it writes
//   lib/<path under viewer/shared>.mjs   the files in SKILLS[skill].logic and every file they import at the top level of
//                                    the file (an import inside a function is lazy and is not followed). Each source is
//                                    a .ts file; the copy is plain JavaScript: Node's own stripper (module.stripTypeScriptTypes)
//                                    removes the types, and every relative specifier ending in .ts now ends in .mjs
//   references/<file>                the guidelines in SKILLS[skill].guidelines
// The folders under lib/ mirror viewer/shared/, so a relative import between two copied files differs only in its
// extension; imports are still rewritten from the new location (see rewriteImports) so a later change of layout stays correct.
// Each copy starts with a line naming its source and saying not to edit it.

import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VIEWER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.dirname(VIEWER);
const LOGIC = path.join(VIEWER, 'shared');
const GUIDELINES = path.join(LOGIC, 'guidelines');

export const DEFAULT_SKILLS_DIR = path.join(REPO, 'toolkit', 'skills');

// backlog-initials gives a script the initials to pass to loadBacklog (it reads backlog.json, else the default).
const SUPPORT = ['skill-support/paths.ts', 'skill-support/write-atomic.ts', 'skill-support/resolve-data-dir.ts', 'skill-support/backlog-initials.ts'];
// The skills that may create `.plans` after asking (explore only reports, so it has no init-plans.mjs).
const INIT = ['skill-support/init-plans.ts', 'skill-support/plans-files.ts'];
const STORY_GUIDELINES = ['product-backlog.md', 'sprint-points-guideline.md', 'plans-files.md'];
// Plan and design share the rules for story changes, the design canvas conventions, the story-index file reader and the checker.
const DESIGN_SHARED_GUIDELINES = ['story-changes.md', 'design-conventions.md'];
const DESIGN_INDEX = ['skill-support/design-index.ts', 'design/design-index-csv.ts'];

// What each skill's scripts import (paths under viewer/shared/; the files those import come along). Diagram logic is
// not here: it belongs to jois-story-plan and is not copied.
interface SkillSpec {
  logic: string[];
  guidelines: string[];
}

export const SKILLS: Record<string, SkillSpec> = {
  'jois-story-review': {
    // read-backlog, backlog-checks, write-review
    logic: ['backlog/model.ts', 'backlog/ids.ts', 'lexicon/lexicon.ts', 'review/review.ts', 'storage/backlog-paths.ts', ...SUPPORT, ...INIT],
    guidelines: STORY_GUIDELINES,
  },
  'jois-story-explore': {
    // read-story-context
    logic: [
      'backlog/csv.ts', 'backlog/model.ts', 'backlog/story-search.ts', 'backlog/story-ref.ts', 'review/review.ts',
      'lexicon/lexicon-suggestions.ts', 'storage/backlog-paths.ts', ...SUPPORT,
    ],
    guidelines: STORY_GUIDELINES,
  },
  'jois-story-propose': {
    // proposal-input, write-proposal, write-lexicon, suggest-lexicon, and read-story-context (a copy of the explore skill's reader)
    logic: [
      'backlog/csv.ts', 'backlog/model.ts', 'backlog/proposals.ts', 'backlog/ids.ts', 'backlog/story-ref.ts', 'backlog/story-search.ts',
      'backlog/story-text.ts', 'review/review.ts', 'lexicon/lexicon.ts', 'lexicon/lexicon-suggestions.ts', 'storage/backlog-paths.ts', ...SUPPORT, ...INIT,
    ],
    guidelines: STORY_GUIDELINES,
  },
  'jois-story-plan': {
    // read-diagrams, write-diagram, write-context-map, write-freeze (the diagram logic is the skill's own), check-design-index
    logic: ['backlog/model.ts', 'backlog/ids.ts', 'backlog/story-ref.ts', 'storage/backlog-paths.ts', ...DESIGN_INDEX, ...SUPPORT, ...INIT],
    guidelines: [...STORY_GUIDELINES, 'diagram-conventions.md', ...DESIGN_SHARED_GUIDELINES],
  },
  'jois-story-design': {
    // write-design-pointer, check-design-index (the design index logic is shared with plan)
    logic: ['backlog/model.ts', 'backlog/ids.ts', 'backlog/story-ref.ts', 'storage/backlog-paths.ts', ...DESIGN_INDEX, ...SUPPORT, ...INIT],
    guidelines: [...STORY_GUIDELINES, ...DESIGN_SHARED_GUIDELINES],
  },
};

// Sources are read as LF whatever the checkout converted, so the copies are the same on every machine.
const readLf = (file: string): string => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// A copy is written with its source's line ending, so git sees the ending of the checkout and a copy never mixes endings.
// The text is built with \n; this changes each \n to \r\n when the source file had \r\n.
const withSourceEnding = (file: string, text: string): string => (fs.readFileSync(file, 'utf8').includes('\r\n') ? text.replace(/\n/g, '\r\n') : text);

const posix = (p: string): string => p.split(path.sep).join('/');

// A relative import or re-export at the start of a line (the only kind that is followed). It is matched in the text with
// the types already removed, so a type-only import, which leaves no code behind, brings no file along.
const TOP_LEVEL_IMPORT = /^(?:(?:import|export)\b[^'";]*?from\s*|import\s*)['"](\.{1,2}\/[^'"]+)['"]/gm;
// Every relative specifier, wherever it is, for rewriting.
const ANY_RELATIVE = /((?:from\s*|import\s*\(?\s*)['"])(\.{1,2}\/[^'"]+)(['"])/g;

// The source as plain JavaScript: LF text with the types replaced by blank space, as Node does when it runs the file.
function stripTypes(file: string): string {
  return stripTypeScriptTypes(readLf(file));
}

function topLevelImports(file: string): string[] {
  return [...stripTypes(file).matchAll(TOP_LEVEL_IMPORT)].map((m) => path.resolve(path.dirname(file), m[1]));
}

// The files of `roots` (absolute paths) and everything they import at the top level, all under viewer/shared/.
function closure(roots: string[]): string[] {
  const seen = new Set<string>();
  const queue = [...roots];
  while (queue.length) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    if (!file.startsWith(LOGIC + path.sep)) throw new Error(`${posix(path.relative(REPO, file))} is outside viewer/shared/ and cannot be copied into a skill`);
    if (!fs.existsSync(file)) throw new Error(`${posix(path.relative(REPO, file))} does not exist`);
    seen.add(file);
    queue.push(...topLevelImports(file));
  }
  return [...seen].sort();
}

// Points each relative specifier of a copied file at the copy of its target. A specifier whose target is not copied
// is left as written (a lazy require that is never reached in a skill).
export function rewriteImports(text: string, sourceFile: string, destFile: string, destOf: ReadonlyMap<string, string>): string {
  return text.replace(ANY_RELATIVE, (whole: string, before: string, specifier: string, after: string) => {
    const target = destOf.get(path.resolve(path.dirname(sourceFile), specifier));
    if (!target) return whole;
    let rel = posix(path.relative(path.dirname(destFile), target));
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return `${before}${rel}${after}`;
  });
}

const NOTE = 'Do not edit this copy.';

// All generated files of one skill as Map<path relative to the skill folder, text>.
export function generateSkill(skill: string): Map<string, string> {
  const spec = SKILLS[skill];
  const files = closure(spec.logic.map((rel) => path.join(LOGIC, rel)));
  const destOf = new Map(files.map((file) => [file, path.join('lib', path.relative(LOGIC, file).replace(/\.ts$/, '.mjs'))] as const));
  const out = new Map<string, string>();
  for (const file of files) {
    const dest = destOf.get(file) as string;
    const body = rewriteImports(stripTypes(file), file, dest, destOf);
    out.set(posix(dest), withSourceEnding(file, `// GENERATED. ${NOTE}\n${body}`));
  }
  for (const name of spec.guidelines) {
    const file = path.join(GUIDELINES, name);
    out.set(`references/${name}`, withSourceEnding(file, `<!-- GENERATED. ${NOTE} -->\n\n${readLf(file)}`));
  }
  return out;
}

// Writes every skill whose folder exists under skillsDir into outDir. Returns { written: [{skill, file}], skipped: [skill] }.
export function syncSkills({ skillsDir = DEFAULT_SKILLS_DIR, outDir = skillsDir }: { skillsDir?: string; outDir?: string } = {}): { written: { skill: string; file: string }[]; skipped: string[] } {
  const written: { skill: string; file: string }[] = [];
  const skipped: string[] = [];
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

// Node prints one ExperimentalWarning the first time the stripper runs. This drops that warning and prints any other.
function silenceStripperWarning(): void {
  process.removeAllListeners('warning');
  process.on('warning', (warning) => {
    if (warning.name === 'ExperimentalWarning' && warning.message.startsWith('stripTypeScriptTypes')) return;
    console.error(`${warning.name}: ${warning.message}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  silenceStripperWarning();
  const args = process.argv.slice(2);
  const option = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i === -1 ? undefined : path.resolve(args[i + 1] ?? '');
  };
  const skillsDir = option('--skills-dir') ?? DEFAULT_SKILLS_DIR;
  const { written, skipped } = syncSkills({ skillsDir, outDir: option('--out') ?? skillsDir });
  for (const { skill, file } of written) console.log(`${skill}/${file}`);
  for (const skill of skipped) console.log(`skipped ${skill}: no folder in ${skillsDir}`);
}
