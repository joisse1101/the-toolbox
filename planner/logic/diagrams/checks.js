// The structural checks of a slice (planner/guidelines/diagram-conventions.md). They read text and return problems; they
// do not parse PlantUML, so a syntax error is for the plugin's render to find. Pure: the caller reads the files.
import { sameTitle } from '../backlog/story-ref.js';
import { criteriaOf } from './source.js';
import { colorForStereotype } from './limits.js';

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const STORY_ID = /\b[A-Z][A-Z0-9]*-\d{4}\b/;
const FILE_PATH = /\b[\w.-]+(?:\/[\w.-]+)*\.(?:py|js|jsx|mjs|cjs|ts|tsx|java|cs|go|rb|php|rs|kt|swift|sql|ya?ml|json|toml|xml|html|css|sh|ps1)\b/;
const FAILURE_WORDS = /\b(fail\w*|invalid|wrong|reject\w*|refus\w*|denied|error\w*|expired|unauthori[sz]ed)\b/i;
const KINDS = 'class|interface|enum|entity|participant|actor|database|boundary|control|collections|queue';
const DECL = new RegExp(`^\\s*(${KINDS})\\s+"([^"]*)"\\s+as\\s+([A-Za-z_]\\w*)\\s*(#[0-9A-Fa-f]{3,8})?`);
const UNQUOTED = new RegExp(`^\\s*(?:abstract\\s+)?(?:${KINDS})\\s+(?!")\\S`);
const CLASS_LINE = /^\s*(?:abstract\s+)?(?:class|interface|enum|entity)\b/;
const MESSAGE = /^\s*([A-Za-z_]\w*)\s*(?:--?>>?|<<?--?)\s*([A-Za-z_]\w*)\s*:\s*(.*)$/;
const STEP = /^(\d+)\.(\d+)('*)(?=\s|$)/;
const PHASE = /^==\s*Phase\s+(\d+)\b/i;

const SPEC_HEADINGS = ['## Description', '## Preconditions', '## Main flow', '## Alternative and exception flows', '## Postconditions', '## Acceptance criteria', '## Implementation overview', '## Traceability'];

const problem = (file, message, line) => ({ file, ...(line ? { line } : {}), message });
const ident = (s) => String(s).replace(/[^A-Za-z0-9]+/g, '_');
const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The `@startuml` name of every `.puml` file of the given slice files, for the cross-slice uniqueness check.
export function diagramNames(files) {
  const names = new Map();
  for (const [file, text] of Object.entries(files)) {
    const m = /^\s*@startuml[ \t]+(\S+)/m.exec(text);
    if (file.endsWith('.puml') && m) names.set(m[1], file);
  }
  return names;
}

// One .puml file. kind: 'class' | 'sequence'. Returns { problems, declared, hasAlt, classes }.
function checkPuml({ file, text, kind, expectedName, limits, otherNames, repo }) {
  const problems = [];
  const lines = text.split(/\r?\n/);
  const at = (n, message) => problems.push(problem(file, message, n));

  const starts = lines.map((l, i) => [l, i + 1]).filter(([l]) => /^\s*@startuml\b/.test(l));
  const ends = lines.map((l, i) => [l, i + 1]).filter(([l]) => /^\s*@enduml\b/.test(l));
  if (starts.length !== 1 || ends.length !== 1) at(starts[1]?.[1] ?? ends[1]?.[1] ?? 1, `needs exactly one @startuml and one @enduml (found ${starts.length} and ${ends.length})`);
  const nameMatch = starts[0] && /^\s*@startuml[ \t]+(\S+)/.exec(starts[0][0]);
  if (starts[0] && !nameMatch) at(starts[0][1], '@startuml needs a name');
  else if (nameMatch && nameMatch[1] !== expectedName) at(starts[0][1], `@startuml name must be ${expectedName}, found ${nameMatch[1]}`);
  if (nameMatch && otherNames.has(nameMatch[1])) at(starts[0][1], `@startuml name ${nameMatch[1]} is already used by ${otherNames.get(nameMatch[1])}`);

  const declared = new Set();
  const state = { classes: 0, alt: false, phase: null, last: null, ids: new Set(), inNote: false };
  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trim();
    if (state.inNote) {
      if (/^end\s+note\b/i.test(line)) state.inNote = false;
      return;
    }
    if (line === '' || line.startsWith("'")) return;
    if (/^note\b/i.test(line) && !line.includes(':')) {
      state.inNote = true;
      return;
    }
    if (/^!(include|import)/i.test(line)) at(n, 'must not use !include or !import; each file is self-contained with its palette inline');
    if (STORY_ID.test(raw)) at(n, `holds text shaped like a story ID (${STORY_ID.exec(raw)[0]}); story IDs live only in source.json`);
    if (!repo && FILE_PATH.test(raw)) at(n, `names a file path (${FILE_PATH.exec(raw)[0]}) with no repo read; analysis level names no path`);
    if (CLASS_LINE.test(line)) state.classes += 1;
    if (UNQUOTED.test(line)) at(n, 'declare it as `<kind> "«stereotype»\\nName" as ID #color`');
    const decl = DECL.exec(raw);
    if (decl) {
      const [, keyword, label, id, color] = decl;
      declared.add(id);
      const stereotype = /«([^»]+)»/.exec(label)?.[1];
      if (keyword === 'actor') return;
      const expected = keyword === 'database' && !stereotype ? colorForStereotype(limits, 'infra') : colorForStereotype(limits, stereotype);
      if (!stereotype && keyword !== 'database') at(n, `${id} has no «stereotype» in its label`);
      else if (stereotype && !expected) at(n, `${id} has the stereotype «${stereotype}», which is not in the conventions (${Object.keys(limits.stereotypes).join(', ')})`);
      else if (!color) at(n, `${id} has no color; «${stereotype ?? 'infra'}» is ${expected}`);
      else if (color.toUpperCase() !== expected) at(n, `${id} is ${color} but «${stereotype ?? 'infra'}» is ${expected}`);
      return;
    }
    if (kind !== 'sequence') return;
    if (/^alt\b/.test(line)) state.alt = true;
    const phase = PHASE.exec(line);
    if (phase) {
      state.phase = Number(phase[1]);
      state.last = null;
      return;
    }
    const msg = MESSAGE.exec(raw);
    if (!msg) return;
    for (const who of [msg[1], msg[2]]) if (!declared.has(who)) at(n, `names the participant ${who}, which is not declared before this line`);
    const step = STEP.exec(msg[3].trim());
    if (!step) return;
    const [, phaseNo, stepNo, primes] = step;
    const id = `${phaseNo}.${stepNo}${primes}`;
    if (state.phase !== null && Number(phaseNo) !== state.phase) at(n, `step ${id} is in Phase ${state.phase}; its first number must be ${state.phase}`);
    if (state.ids.has(id)) at(n, `step ${id} is used twice in this file`);
    state.ids.add(id);
    const key = [Number(stepNo), primes.length];
    if (state.last && (key[0] < state.last[0] || (key[0] === state.last[0] && key[1] <= state.last[1]))) at(n, `step ${id} does not come after the step before it in Phase ${phaseNo}`);
    state.last = key;
  });
  if (kind === 'class' && state.classes > limits.maxClasses) problems.push(problem(file, `declares ${state.classes} classes; the limit is ${limits.maxClasses} (diagram-conventions.md); split the slice by Feature`));
  return { problems, hasAlt: state.alt };
}

const tableRows = (lines) =>
  lines
    .map((text, i) => ({ text, line: i }))
    .filter(({ text }) => text.trim().startsWith('|'))
    .map(({ text, line }) => ({ line, cells: text.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()) }))
    .filter(({ cells }) => !cells.every((c) => /^:?-{3,}:?$/.test(c)));

// The specification. Returns the problems; `flows` maps each flow to whether its diagram has an alt branch.
function checkSpec({ file, text, slice, stories, flows, repo }) {
  const problems = [];
  const lines = text.split(/\r?\n/);
  const at = (n, message) => problems.push(problem(file, message, n));

  if (!new RegExp(`^# UC-${escapeRe(slice)} - \\S`).test(lines[0] ?? '')) at(1, `the first line must be "# UC-${slice} - <name>"`);
  for (const row of ['Slice', 'Scope', 'Primary actor', 'Maturity']) if (!new RegExp(`^\\|\\s*\\*{0,2}${row}\\*{0,2}\\s*\\|`, 'm').test(text)) at(null, `the header table has no ${row} row`);
  if (!/<!-- stories:start -->[\s\S]*<!-- stories:end -->/.test(text)) at(null, 'has no <!-- stories:start --> ... <!-- stories:end --> block');

  const heading = new Map();
  lines.forEach((l, i) => {
    if (/^## /.test(l) && !heading.has(l.trim())) heading.set(l.trim(), i);
  });
  let previous = -1;
  for (const h of SPEC_HEADINGS) {
    if (!heading.has(h)) at(null, `has no "${h}" heading`);
    else if (heading.get(h) < previous) at(heading.get(h) + 1, `"${h}" is out of order`);
    else previous = heading.get(h);
  }
  const bodyOf = (h) => {
    if (!heading.has(h)) return [];
    const start = heading.get(h) + 1;
    const next = [...heading.values()].filter((v) => v > heading.get(h)).sort((a, b) => a - b)[0] ?? lines.length;
    return lines.slice(start, next);
  };
  const maturity = /^\|\s*\*{0,2}Maturity\*{0,2}\s*\|\s*(.*?)\s*\|/m.exec(text)?.[1] ?? '';

  if (!repo) {
    if (maturity && !/^planned\b/i.test(maturity)) at(null, `Maturity is "${maturity}"; without a repo it is "planned"`);
    for (const h of ['## Implementation overview', '## Traceability']) {
      const body = bodyOf(h).join('\n').trim();
      if (heading.has(h) && body !== 'TBC') at(heading.get(h) + 1, `"${h}" must read TBC without a repo`);
    }
    lines.forEach((l, i) => FILE_PATH.test(l) && at(i + 1, `names a file path (${FILE_PATH.exec(l)[0]}) with no repo read; analysis level names no path`));
  } else {
    const trace = bodyOf('## Traceability');
    if (trace.join('\n').trim() !== 'TBC') {
      for (const { line, cells } of tableRows(trace).slice(1)) {
        const code = cells[2] ?? '';
        const refs = [...code.matchAll(/`([^`:]+?)(?:::[^`]*)?`/g)].map((m) => m[1]);
        if (refs.length === 0) at(heading.get('## Traceability') + 2 + line, `traceability row "${cells[0]}" names no \`file::symbol\``);
        for (const ref of refs) if (!repo.readPaths.has(ref.replace(/\\/g, '/'))) at(heading.get('## Traceability') + 2 + line, `traceability row "${cells[0]}" names ${ref}, which repo_read did not return in this session`);
      }
    }
  }

  const acBody = bodyOf('## Acceptance criteria');
  const rows = tableRows(acBody);
  const rowAt = (r) => heading.get('## Acceptance criteria') + 2 + r.line;
  const dataRows = rows.length > 1 && /^AC id$/i.test(rows[0].cells[0].replace(/\*/g, '')) ? rows.slice(1) : rows;
  if (heading.has('## Acceptance criteria') && rows.length === 0) at(heading.get('## Acceptance criteria') + 1, 'has no acceptance-criteria table');
  const seen = new Set();
  const covered = new Set();
  for (const r of dataRows) {
    const [rawId = '', storyTitle = '', path = '', flow = '', criterion = ''] = r.cells;
    const id = rawId.replace(/\*/g, '');
    if (r.cells.length !== 5) at(rowAt(r), `row "${id}" must have the five columns AC id | Story | Path | Flow | Given / when / then`);
    if (!new RegExp(`^AC-${escapeRe(slice)}-${SLUG}$`).test(id)) at(rowAt(r), `AC id "${id}" must be AC-${slice}-<name> in kebab-case`);
    if (seen.has(id)) at(rowAt(r), `AC id ${id} is used twice`);
    seen.add(id);
    const story = stories.find((s) => sameTitle(s.title, storyTitle));
    if (!story) at(rowAt(r), `${id} names the story "${storyTitle}", which is not in the slice`);
    if (path !== 'main' && path !== 'failure') at(rowAt(r), `${id} Path must be main or failure`);
    if (!flows.has(flow)) at(rowAt(r), `${id} names the flow "${flow}", which has no sequence diagram`);
    else if (path === 'failure' && !flows.get(flow)) at(rowAt(r), `${id} is a failure path but the ${flow} sequence has no alt branch for it`);
    if (path === 'main' && FAILURE_WORDS.test(criterion)) at(rowAt(r), `${id} describes a failure (“${FAILURE_WORDS.exec(criterion)[0]}”) but is marked main; mark it failure and draw an alt branch`);
    if (story) covered.add(`${story.title.trim().toLowerCase()}\n${squash(criterion)}`);
  }
  for (const story of stories) {
    for (const c of criteriaOf(story)) {
      if (!covered.has(`${story.title.trim().toLowerCase()}\n${squash(c.text)}`)) {
        problems.push(problem(file, `the story "${story.title.trim()}" has ${c.label} (${c.text}) with no row; add it verbatim`));
      }
    }
  }
  return problems;
}

// The whole slice. Input:
//   backlog      backlog file name without .csv          slice   the slice name
//   files        { 'UC-<slice>.md': text, '...puml': text }
//   stories      the backlog stories in the slice's scope (loadBacklog stories)
//   limits       parseLimits(...)                        otherNames  Map of @startuml names used by other slices -> file
//   repo         null (analysis level) or { readPaths: Set of repo paths returned by repo_read }
// -> { ok, problems: [{ file, line?, message }] }
export function checkSlice({ backlog, slice, files, stories, limits, otherNames = new Map(), repo = null }) {
  const problems = [];
  if (!new RegExp(`^${SLUG}$`).test(slice)) problems.push(problem('', `the slice name "${slice}" must be a lowercase slug`));
  const specName = `UC-${slice}.md`;
  const className = `UC-${slice}-class.puml`;
  const sequence = new RegExp(`^UC-${escapeRe(slice)}-(${SLUG})-sequence\\.puml$`);
  const flowFiles = new Map(Object.keys(files).filter((f) => sequence.test(f)).map((f) => [sequence.exec(f)[1], f]));

  if (!(specName in files)) problems.push(problem(specName, 'is missing'));
  if (!(className in files)) problems.push(problem(className, 'is missing'));
  if (flowFiles.size === 0) problems.push(problem(`UC-${slice}-<flow>-sequence.puml`, 'the slice needs at least one sequence diagram'));
  for (const f of Object.keys(files)) if (f !== specName && f !== className && !sequence.test(f)) problems.push(problem(f, `is not a file of a slice (${specName}, ${className}, UC-${slice}-<flow>-sequence.puml)`));

  const flows = new Map();
  if (className in files) problems.push(...checkPuml({ file: className, text: files[className], kind: 'class', expectedName: `${ident(backlog)}_${ident(slice)}_class`, limits, otherNames, repo }).problems);
  for (const [flow, file] of flowFiles) {
    const r = checkPuml({ file, text: files[file], kind: 'sequence', expectedName: `${ident(backlog)}_${ident(slice)}_${ident(flow)}_seq`, limits, otherNames, repo });
    problems.push(...r.problems);
    flows.set(flow, r.hasAlt);
  }
  if (specName in files) problems.push(...checkSpec({ file: specName, text: files[specName], slice, stories, flows, repo }));
  return { ok: problems.length === 0, problems };
}

// One line per problem: `file:line: message` (or `file: message`).
export const formatProblems = (problems) => problems.map((p) => `${p.file ? p.file + (p.line ? `:${p.line}` : '') + ': ' : ''}${p.message}`);
