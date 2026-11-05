// The build tasks of a slice (references/diagram-conventions.md, section 10): reads `tasks.md`, checks it against the slice's
// document, carries ticks over a redraw and counts progress. Pure: the caller reads and writes the files.
import { readDocument } from './document.js';

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const FILE = 'tasks.md';
const GROUP = /^##\s+(.*?)\s*$/;
const TASK_LINE = /^- \[([ xX])\]\s*(\S*)\s*(.*?)\s*$/;
const SATISFIES = /^\s+Satisfies:\s*(.*?)\s*$/;
const VERIFY = /^\s+Verify:\s*(.*?)\s*$/;
const STEPS_PART = /^(.*?)\s*\(steps?\s+([^)]*)\)$/;
const CHECKBOX = /^(- \[)[ xX](\])/;
const COUNTED_LINE = /^\s*- \[([ xX])\]/;
const STEP_ID = /:\s*(\d+\.\d+'*)(?=\s|$)/;
const AC_HEADING = '## Acceptance criteria';

const problem = (message, line) => ({ file: FILE, ...(line ? { line } : {}), message });
const list = (text) => text.split(/[\s,]+/).filter(Boolean);
const label = (task) => `${task.id}${task.title ? ` "${task.title}"` : ''}`;

// tasks.md text -> { groups: [{ flow, line }], tasks: [{ id, title, done, flow, line, acIds, steps, verify }], problems }
// `flow` is the group a task sits under (null before the first group). `verify` and `acIds` are empty when the line is missing.
// Problems found here: a task before any group, a repeated task id, a task with no Satisfies, no steps or no Verify.
export function parseTasks(text) {
  const groups = [];
  const tasks = [];
  const problems = [];
  const ids = new Map(); // task id -> line of its first task
  let flow = null;
  let task = null;

  String(text ?? '').split(/\r?\n/).forEach((raw, i) => {
    const n = i + 1;
    const group = GROUP.exec(raw);
    if (group) {
      flow = group[1];
      groups.push({ flow, line: n });
      task = null;
      return;
    }
    const head = TASK_LINE.exec(raw);
    if (head) {
      const [, mark, id, title] = head;
      task = { id, title, done: mark !== ' ', flow, line: n, acIds: [], steps: [], verify: '', hasSatisfies: false };
      tasks.push(task);
      if (flow === null) problems.push(problem(`the task ${label(task)} is not under a "## <flow>" group`, n));
      if (ids.has(id)) problems.push(problem(`the task id ${id} is used twice (lines ${ids.get(id)} and ${n})`, n));
      else ids.set(id, n);
      return;
    }
    if (!task) return;
    const satisfies = SATISFIES.exec(raw);
    if (satisfies) {
      const parts = STEPS_PART.exec(satisfies[1]);
      task.hasSatisfies = true;
      task.acIds = list(parts ? parts[1] : satisfies[1]);
      task.steps = parts ? list(parts[2]) : [];
      return;
    }
    const verify = VERIFY.exec(raw);
    if (verify) task.verify = verify[1];
  });

  for (const t of tasks) {
    if (!t.hasSatisfies || t.acIds.length === 0) problems.push(problem(`the task ${label(t)} has no "Satisfies: <AC id> (steps <step ids>)" line`, t.line));
    else if (t.steps.length === 0) problems.push(problem(`the task ${label(t)} names no step; write "(steps <step ids>)" after its AC ids`, t.line));
    if (t.verify === '') problems.push(problem(`the task ${label(t)} has no "Verify:" line, or an empty one`, t.line));
  }
  return { groups, tasks, problems };
}

// The document's acceptance-criteria table, which readDocument does not expose.
// document markdown -> [{ id, story, flow, text }] (the AC id without its bold marks, the Title, the flow, the criterion verbatim).
export function criteriaTable(document) {
  const lines = String(document ?? '').split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === AC_HEADING);
  if (start === -1) return [];
  const rows = [];
  for (const raw of lines.slice(start + 1)) {
    const line = raw.trim();
    if (/^## /.test(line)) break;
    if (!line.startsWith('|')) continue;
    const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue;
    const id = (cells[0] ?? '').replace(/\*/g, '');
    if (/^AC id$/i.test(id)) continue;
    rows.push({ id, story: cells[1] ?? '', flow: cells[3] ?? '', text: cells[4] ?? '' });
  }
  return rows;
}

// document markdown -> Map flow -> Set of the step ids its sequence diagram holds.
function flowSteps(document) {
  const flows = new Map();
  for (const diagram of readDocument(document).diagrams) {
    if (diagram.kind !== 'sequence') continue;
    const ids = new Set();
    for (const line of diagram.text.split('\n')) {
      const step = STEP_ID.exec(line);
      if (step) ids.add(step[1]);
    }
    flows.set(diagram.flow, ids);
  }
  return flows;
}

// The format and coverage checks (conventions, section 10). `document` is the markdown text of UC-<slice>.md.
// -> [{ file: 'tasks.md', line?, message }], the shape checks.js uses. Stories are named by Title.
export function checkTasks({ tasksText, document, slice }) {
  const { groups, tasks, problems } = parseTasks(tasksText);
  const flows = flowSteps(document);
  const table = criteriaTable(document);
  const rows = new Map(table.map((r) => [r.id, r]));
  const idFormat = new RegExp(`^T-${slice}-${SLUG}$`);

  for (const g of groups) {
    if (!flows.has(g.flow)) problems.push(problem(`the group "${g.flow}" is not a flow: the document has no "### Sequence: ${g.flow}" diagram`, g.line));
  }
  const named = new Set();
  for (const t of tasks) {
    if (!idFormat.test(t.id)) problems.push(problem(`the task id "${t.id}" must be T-${slice}-<name> in kebab-case`, t.line));
    if (t.title === '') problems.push(problem(`the task ${t.id} has no title`, t.line));
    for (const ac of t.acIds) {
      named.add(ac);
      if (!rows.has(ac)) problems.push(problem(`the task ${label(t)} names the AC id ${ac}, which is not a row of the acceptance-criteria table`, t.line));
    }
    const known = flows.get(t.flow);
    if (known) for (const step of t.steps) if (!known.has(step)) problems.push(problem(`the task ${label(t)} names the step ${step}, which the "### Sequence: ${t.flow}" diagram does not contain`, t.line));
  }
  for (const row of table) {
    if (!named.has(row.id)) problems.push(problem(`the AC id ${row.id} (story "${row.story}") has no task; add a task that names it`));
  }
  return problems;
}

// The ticks of the old file that stay (conventions, "Carry-over"). The new text is rewritten so that a task is ticked only when
// the old file ticked the same task id and the text of every criterion it names is unchanged in the old document's table.
// -> { text, reset: [{ id, title }], dropped: [{ id, title }] }. `reset`: ticked before, written unticked because a criterion
// changed. `dropped`: ticked before, and the new text holds no such id. Only the checkbox characters change, line endings stay.
export function carryTicks({ oldTasksText, oldDocument, newTasksText, newDocument }) {
  const oldTicked = new Map(parseTasks(oldTasksText).tasks.filter((t) => t.done).map((t) => [t.id, t]));
  const newTasks = parseTasks(newTasksText).tasks;
  const oldText = new Map(criteriaTable(oldDocument).map((r) => [r.id, r.text]));
  const newText = new Map(criteriaTable(newDocument).map((r) => [r.id, r.text]));
  const unchanged = (t) => t.acIds.every((ac) => oldText.has(ac) && oldText.get(ac) === newText.get(ac));

  const keep = new Set(); // line numbers of the tasks written ticked
  const reset = [];
  for (const t of newTasks) {
    if (!oldTicked.has(t.id)) continue;
    if (unchanged(t)) keep.add(t.line);
    else reset.push({ id: t.id, title: t.title });
  }
  const present = new Set(newTasks.map((t) => t.id));
  const dropped = [...oldTicked.values()].filter((t) => !present.has(t.id)).map((t) => ({ id: t.id, title: t.title }));

  const taskLines = new Set(newTasks.map((t) => t.line));
  const lines = String(newTasksText ?? '').split('\n').map((raw, i) => {
    if (!taskLines.has(i + 1)) return raw;
    return raw.replace(CHECKBOX, `$1${keep.has(i + 1) ? 'x' : ' '}$2`);
  });
  return { text: lines.join('\n'), reset, dropped };
}

// tasks.md text -> { done, total }: the checkbox lines, `[x]` and `[X]` done.
export function countTasks(text) {
  let done = 0;
  let total = 0;
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const box = COUNTED_LINE.exec(line);
    if (!box) continue;
    total += 1;
    if (box[1] !== ' ') done += 1;
  }
  return { done, total };
}
