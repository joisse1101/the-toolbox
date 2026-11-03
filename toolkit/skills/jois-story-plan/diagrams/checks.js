// The structural checks of a slice (planner/guidelines/diagram-conventions.md). They read the slice's one document and
// return problems; whether a diagram is valid Mermaid is for the parser step of the skill side to judge (planner/logic is
// pure and has no DOM). Pure: the caller reads the file.
import { sameTitle } from '../backlog/story-ref.js';
import { criteriaOf } from './source.js';
import { layerForStereotype } from './limits.js';
import { readDocument } from './document.js';

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const STORY_ID = /\b[A-Z][A-Z0-9]*-\d{4}\b/;
const FILE_PATH = /\b[\w.-]+(?:\/[\w.-]+)*\.(?:py|js|jsx|mjs|cjs|ts|tsx|java|cs|go|rb|php|rs|kt|swift|sql|ya?ml|json|toml|xml|html|css|sh|ps1)\b/;
const FAILURE_WORDS = /\b(fail\w*|invalid|wrong|reject\w*|refus\w*|denied|error\w*|expired|unauthori[sz]ed)\b/i;
const TYPES = { class: 'classDiagram', sequence: 'sequenceDiagram' };
// The line every sequence diagram opens with (conventions, "Readable in both themes"): it fixes the message text color so
// the diagram reads on GitHub and in the VS Code preview in either theme. The conventions show the same text.
export const SEQUENCE_INIT = "%%{init: {'themeVariables': {'signalTextColor':'#1f2328','labelTextColor':'#1f2328','loopTextColor':'#1f2328','signalColor':'#444','labelBoxBkgColor':'#dde3ea','labelBoxBorderColor':'#444'}}}%%";
const CLASS_DECL =/^class\s+([A-Za-z_]\w*)(?:\[[^\]]*\]|~[^~]*~)?\s*(\{)?(.*)$/;
const STEREOTYPE_LINE = /^<<([^>]+)>>\s+([A-Za-z_]\w*)\s*$/;
const PARTICIPANT = /^(actor|participant)\s+([A-Za-z_]\w*)(?:\s+as\s+(.*))?$/;
const PHASE_NOTE = /^Note\s+over\s+[^:]*:\s*Phase\s+(\d+)\b/i;
const BLOCK_OPEN = /^(rect|alt|opt|loop|par|critical|break|box)\b/;
const MESSAGE = /^([A-Za-z_]\w*)\s*(?:-->>|->>|--x|-x|--\)|-\)|-->|->)\s*[+-]?([A-Za-z_]\w*)\s*:\s*(.*)$/;
const STEP = /^(\d+)\.(\d+)('*)(?=\s|$)/;

const SPEC_HEADINGS = ['## Description', '## Preconditions', '## Main flow', '## Alternative and exception flows', '## Postconditions', '## Acceptance criteria', '## Class diagram', '## Sequence diagrams', '## Design decisions', '## Interface contracts', '## Failure responses', '## Non-functional and security rules', '## Open questions', '## Implementation overview', '## Traceability'];
const DESIGN_SECTIONS = ['## Design decisions', '## Interface contracts', '## Failure responses', '## Non-functional and security rules', '## Open questions'];
const DECISION_SOURCES = ['user-confirmed', 'repo', 'TBC'];
const NAMESPACE_OPEN = /^namespace\s+([A-Za-z_]\w*)\s*\{\s*$/;
const RELATIONSHIP = /^([A-Za-z_]\w*)\s*(?:"[^"]*"\s*)?[<|*o]?(?:--|\.\.)[>|*o]?\s*(?:"[^"]*"\s*)?([A-Za-z_]\w*)/;
const STUB_NOTE = /^note\s+for\s+([A-Za-z_]\w*)\s+"\(see\s/;
const RULE_NOTE = /^note\s+for\s+([A-Za-z_]\w*)\s+"Rule:\s*\S/;
const AGGREGATE_SUFFIX = 'Aggregate';
const ROOT_STEREOTYPE = 'root entity';

const problem = (file, message, line) => ({ file, ...(line ? { line } : {}), message });
const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every class states a stereotype as the first line of its body (`<<service>>`) or as a `<<service>> Name` line.
// -> the classes declared, name -> { line, stereotype, namespace }.
function checkClasses(lines, comment, stereotypeProblem) {
  const classes = new Map();
  let open = null; // the class whose body is open
  let namespace = null; // the namespace whose braces are open
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (comment(raw)) return;
    if (open) {
      if (line.startsWith('}')) open = null;
      else if (!classes.get(open).stereotype) classes.get(open).stereotype = /^<<([^>]+)>>$/.exec(line)?.[1].trim();
      return;
    }
    const ns = NAMESPACE_OPEN.exec(line);
    if (ns) {
      namespace = ns[1];
      return;
    }
    if (line === '}' && namespace) {
      namespace = null;
      return;
    }
    const decl = CLASS_DECL.exec(line);
    if (decl) {
      const [, name, brace, rest] = decl;
      classes.set(name, { line: i + 1, namespace, stereotype: brace ? /^<<([^>]+)>>/.exec(rest.trim())?.[1].trim() : undefined });
      if (brace && !line.includes('}')) open = name;
      return;
    }
    const standalone = STEREOTYPE_LINE.exec(line);
    if (standalone && classes.has(standalone[2])) classes.get(standalone[2]).stereotype = standalone[1].trim();
  });
  for (const [name, { line, stereotype }] of classes) stereotypeProblem(line, name, stereotype);
  return classes;
}

// The aggregate boundary (conventions, section 3): a root entity sits in a `<Root>Aggregate` namespace with its rule
// line, and a class outside the namespace is linked only to the root.
function checkAggregates(lines, comment, classes, at) {
  const stubs = new Set();
  const rules = new Set();
  const relations = [];
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (comment(raw)) return;
    const stub = STUB_NOTE.exec(line);
    if (stub) stubs.add(stub[1]);
    const rule = RULE_NOTE.exec(line);
    if (rule) rules.add(rule[1]);
    const rel = RELATIONSHIP.exec(line);
    if (rel && classes.has(rel[1]) && classes.has(rel[2])) relations.push({ line: i + 1, from: rel[1], to: rel[2] });
  });
  const roots = new Map(); // namespace -> its root entity
  for (const [name, { line, stereotype, namespace }] of classes) {
    if (stereotype !== ROOT_STEREOTYPE || stubs.has(name)) continue;
    if (!namespace?.endsWith(AGGREGATE_SUFFIX)) at(line, `the root entity ${name} is not inside an aggregate boundary: draw it in "namespace ${name}${AGGREGATE_SUFFIX} { ... }" with the classes it owns`);
    else roots.set(namespace, name);
    if (namespace?.endsWith(AGGREGATE_SUFFIX) && !rules.has(name)) at(line, `the aggregate ${namespace} has no line naming its rule: add note for ${name} "Rule: <what the aggregate protects>" after the namespace`);
  }
  const namespaces = new Set([...classes.values()].map((c) => c.namespace).filter((n) => n?.endsWith(AGGREGATE_SUFFIX)));
  for (const ns of namespaces) if (!roots.has(ns)) at(0, `the aggregate ${ns} holds no root entity`);
  for (const { line, from, to } of relations) {
    for (const [inner, outer] of [[to, from], [from, to]]) {
      const ns = classes.get(inner).namespace;
      if (ns?.endsWith(AGGREGATE_SUFFIX) && classes.get(outer).namespace !== ns && roots.get(ns) !== inner) {
        at(line, `${outer} is outside the aggregate ${ns} but is linked to ${inner}, which is not its root; link ${outer} to the root only`);
      }
    }
  }
}

// Participants declared before use, a stereotype in each label, `phase.step` ids and the rect/Note phase.
// -> { hasAlt, ids } (whether the diagram has an alt branch, and the step ids it holds).
function checkSequence(lines, comment, at, stereotypeProblem) {
  const declared = new Set();
  const blocks = []; // the open blocks: { type, line, phase }
  const state = { alt: false, last: null, ids: new Set() };
  const phaseOf = () => blocks.findLast((b) => b.phase != null)?.phase ?? null;
  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trim();
    if (comment(raw)) return;
    const decl = PARTICIPANT.exec(line);
    if (decl) {
      const [, keyword, id, label = ''] = decl;
      declared.add(id);
      if (keyword === 'participant') stereotypeProblem(n, id, /«([^»]+)»/.exec(label)?.[1]?.trim());
      return;
    }
    const note = PHASE_NOTE.exec(line);
    if (note) {
      const open = blocks[blocks.length - 1];
      if (open?.type === 'rect' && open.phase == null) open.phase = Number(note[1]);
      else at(n, 'a phase note must be the first line of a rect block');
      state.last = null;
      return;
    }
    const block = BLOCK_OPEN.exec(line);
    if (block) {
      blocks.push({ type: block[1], line: n });
      if (block[1] === 'alt') state.alt = true;
      return;
    }
    if (/^end\b/.test(line)) {
      const closed = blocks.pop();
      if (closed?.type === 'rect') {
        if (closed.phase == null) at(closed.line, 'a rect block must open with "Note over <participants>: Phase <n> - <name>"');
        state.last = null;
      }
      return;
    }
    const msg = MESSAGE.exec(line);
    if (!msg) return;
    for (const who of [msg[1], msg[2]]) if (!declared.has(who)) at(n, `names the participant ${who}, which is not declared before this line`);
    const step = STEP.exec(msg[3].trim());
    if (!step) return;
    const [, phaseNo, stepNo, primes] = step;
    const id = `${phaseNo}.${stepNo}${primes}`;
    const phase = phaseOf();
    if (phase !== null && Number(phaseNo) !== phase) at(n, `step ${id} is in Phase ${phase}; its first number must be ${phase}`);
    if (state.ids.has(id)) at(n, `step ${id} is used twice in this diagram`);
    state.ids.add(id);
    const key = [Number(stepNo), primes.length];
    if (state.last && (key[0] < state.last[0] || (key[0] === state.last[0] && key[1] <= state.last[1]))) at(n, `step ${id} does not come after the step before it in Phase ${phaseNo}`);
    state.last = key;
  });
  for (const b of blocks) at(b.line, `the ${b.type} block is never closed with end`);
  return { hasAlt: state.alt, ids: state.ids };
}

// One diagram of the document. -> { problems: [{ line, message }], hasAlt, ids }
function checkDiagram({ diagram, limits }) {
  const problems = [];
  const at = (n, message) => problems.push({ line: diagram.line + n, message: `${diagram.heading}: ${message}` });
  const lines = diagram.text.split('\n');
  const comment = (l) => l.trim() === '' || l.trim().startsWith('%%');

  const typeLine = lines.findIndex((l) => !comment(l));
  const type = typeLine === -1 ? '' : lines[typeLine].trim().split(/\s+/)[0];
  if (type !== TYPES[diagram.kind]) {
    at(Math.max(typeLine, 0) + 1, `the block opens with "${type}" but must be a ${TYPES[diagram.kind]}; only classDiagram and sequenceDiagram are accepted`);
    return { problems, hasAlt: false, ids: new Set() };
  }
  const first = lines.find((l) => l.trim() !== '');
  if (diagram.kind === 'sequence' && first.trim() !== SEQUENCE_INIT) {
    at(lines.indexOf(first) + 1, `a sequence diagram must open with the init line of diagram-conventions.md section 3 (Readable in both themes), exactly: ${SEQUENCE_INIT}`);
  }
  lines.forEach((raw, i) => {
    if (!comment(raw) && STORY_ID.test(raw)) at(i + 1, `holds text shaped like a story ID (${STORY_ID.exec(raw)[0]}); story IDs live only in source.json`);
  });
  const stereotypeProblem = (n, name, stereotype) => {
    if (!stereotype) at(n, `${name} has no stereotype`);
    else if (!layerForStereotype(limits, stereotype)) at(n, `${name} has the stereotype ${stereotype}, which is not in the conventions (${Object.keys(limits.stereotypes).join(', ')})`);
  };
  if (diagram.kind === 'class') {
    const classes = checkClasses(lines, comment, stereotypeProblem);
    if (classes.size > limits.maxClasses) at(0, `declares ${classes.size} classes; the limit is ${limits.maxClasses} (diagram-conventions.md); split the slice by Feature`);
    checkAggregates(lines, comment, classes, at);
    return { problems, hasAlt: false, ids: new Set() };
  }
  return { problems, ...checkSequence(lines, comment, at, stereotypeProblem) };
}

const tableRows = (lines) =>
  lines
    .map((text, i) => ({ text, line: i }))
    .filter(({ text }) => text.trim().startsWith('|'))
    .map(({ text, line }) => ({ line, cells: text.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()) }))
    .filter(({ cells }) => !cells.every((c) => /^:?-{3,}:?$/.test(c)));

// The specification. Returns the problems; `flows` maps each flow to { hasAlt, ids }: whether its diagram has an alt branch
// and the step ids it holds.
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
    lines.forEach((l, i) => FILE_PATH.test(l) && at(i + 1, `names a file path (${FILE_PATH.exec(l)[0]}) with no repo read; a slice without a repo names no path`));
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

  const acIds = new Set();
  const acBody = bodyOf('## Acceptance criteria');
  const rows = tableRows(acBody);
  const rowAt = (r) => heading.get('## Acceptance criteria') + 2 + r.line;
  const dataRows = rows.length > 1 && /^AC id$/i.test(rows[0].cells[0].replace(/\*/g, '')) ? rows.slice(1) : rows;
  if (heading.has('## Acceptance criteria') && rows.length === 0) at(heading.get('## Acceptance criteria') + 1, 'has no acceptance-criteria table');
  const seen = new Set();
  const covered = new Set();
  for (const r of dataRows) {
    const [rawId = '', storyTitle = '', path = '', flow = '', criterion = '', stepCell = ''] = r.cells;
    const id = rawId.replace(/\*/g, '');
    acIds.add(id);
    if (r.cells.length !== 6) at(rowAt(r), `row "${id}" must have the six columns AC id | Story | Path | Flow | Given / when / then | Steps`);
    if (!new RegExp(`^AC-${escapeRe(slice)}-${SLUG}$`).test(id)) at(rowAt(r), `AC id "${id}" must be AC-${slice}-<name> in kebab-case`);
    if (seen.has(id)) at(rowAt(r), `AC id ${id} is used twice`);
    seen.add(id);
    const story = stories.find((s) => sameTitle(s.title, storyTitle));
    if (!story) at(rowAt(r), `${id} names the story "${storyTitle}", which is not in the slice`);
    if (path !== 'main' && path !== 'failure') at(rowAt(r), `${id} Path must be main or failure`);
    if (!flows.has(flow)) at(rowAt(r), `${id} names the flow "${flow}", which has no "### Sequence: ${flow}" heading`);
    else if (path === 'failure' && !flows.get(flow).hasAlt) at(rowAt(r), `${id} is a failure path but the "### Sequence: ${flow}" diagram has no alt branch for it`);
    const stepIds = stepCell.split(/[\s,]+/).filter(Boolean);
    if (stepIds.length === 0) at(rowAt(r), `${id} names no step in Steps; give the step ids of the "${flow}" diagram that realise it`);
    if (flows.has(flow)) for (const stepId of stepIds) if (!flows.get(flow).ids.has(stepId)) at(rowAt(r), `${id} names the step ${stepId}, which the "### Sequence: ${flow}" diagram does not contain`);
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
  checkDesignSections({ bodyOf, heading, at, repo, acIds });
  return problems;
}

// The five design sections (conventions, section 4): present and not empty, decisions with a valid source, and a failure
// response that names an acceptance criterion of the table.
function checkDesignSections({ bodyOf, heading, at, repo, acIds }) {
  for (const h of DESIGN_SECTIONS) {
    if (heading.has(h) && bodyOf(h).join('\n').trim() === '') at(heading.get(h) + 1, `"${h}" is empty; fill it, or say why it does not apply`);
  }
  const dataRowsOf = (h, first) => {
    const rows = tableRows(bodyOf(h));
    return rows.length > 0 && first.test(rows[0].cells[0].replace(/\*/g, '')) ? rows.slice(1) : rows;
  };
  const rowAt = (h, r) => heading.get(h) + 2 + r.line;
  const decisions = '## Design decisions';
  for (const r of dataRowsOf(decisions, /^D id$/i)) {
    const id = r.cells[0] ?? '';
    if (r.cells.length !== 6) at(rowAt(decisions, r), `decision "${id}" must have the six columns D id | Decision | Alternatives | Why | Source | Steps`);
    const source = r.cells[4] ?? '';
    if (!DECISION_SOURCES.includes(source)) at(rowAt(decisions, r), `decision "${id}" has the source "${source}"; it must be one of ${DECISION_SOURCES.join(', ')}`);
    else if (source === 'repo' && !repo) at(rowAt(decisions, r), `decision "${id}" has the source repo, but no repo was read`);
  }
  const failures = '## Failure responses';
  for (const r of dataRowsOf(failures, /^Failure$/i)) {
    const ac = (r.cells[3] ?? '').replace(/\*/g, '');
    if (!acIds.has(ac)) at(rowAt(failures, r), `failure "${r.cells[0] ?? ''}" names the acceptance criterion "${ac}", which is not a row of the Acceptance criteria table`);
  }
}

// The whole slice. Input:
//   backlog      backlog file name without .csv          slice   the slice name
//   files        { 'UC-<slice>.md': text }: a slice is one document plus source.json
//   stories      the backlog stories in the slice's scope (loadBacklog stories)
//   limits       parseLimits(...)
//   repo         null (no repo read) or { readPaths: Set of repo paths returned by repo_read }
// -> { ok, problems: [{ file, line?, message }], diagrams: [{ heading, line, text }] }; `diagrams` are the document's mermaid
// blocks, for the caller's parser step.
export function checkSlice({ slice, files, stories, limits, repo = null }) {
  const problems = [];
  const specName = `UC-${slice}.md`;
  if (!new RegExp(`^${SLUG}$`).test(slice)) problems.push(problem('', `the slice name "${slice}" must be a lowercase slug`));
  if (!(specName in files)) problems.push(problem(specName, 'is missing'));
  for (const f of Object.keys(files)) if (f !== specName) problems.push(problem(f, `is not part of a slice: a slice is one document (${specName}) plus source.json`));
  if (!(specName in files)) return { ok: false, problems, diagrams: [] };

  const document = readDocument(files[specName]);
  for (const p of document.problems) problems.push(problem(specName, p.message, p.line));
  if (!document.diagrams.some((d) => d.kind === 'class')) problems.push(problem(specName, 'has no "## Class diagram" heading with a mermaid block'));
  if (!document.diagrams.some((d) => d.kind === 'sequence')) problems.push(problem(specName, 'the slice needs at least one "### Sequence: <flow>" heading with a mermaid block'));

  const flows = new Map();
  for (const diagram of document.diagrams) {
    const r = checkDiagram({ diagram, limits });
    problems.push(...r.problems.map((p) => problem(specName, p.message, p.line)));
    if (diagram.kind === 'sequence') flows.set(diagram.flow, { hasAlt: r.hasAlt, ids: r.ids });
  }
  problems.push(...checkSpec({ file: specName, text: files[specName], slice, stories, flows, repo }));
  return { ok: problems.length === 0, problems, diagrams: document.diagrams.map(({ heading, line, text }) => ({ heading, line, text })) };
}

// One line per problem: `file:line: message` (or `file: message`).
export const formatProblems = (problems) => problems.map((p) => `${p.file ? p.file + (p.line ? `:${p.line}` : '') + ': ' : ''}${p.message}`);
