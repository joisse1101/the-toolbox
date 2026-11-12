import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBacklog } from '../../skills/jois-story-plan/lib/backlog/model.js';
import { parseLimits } from '../../skills/jois-story-plan/diagrams/limits.js';
import { scopeStories } from '../../skills/jois-story-plan/diagrams/source.js';
import { readDocument } from '../../skills/jois-story-plan/diagrams/document.js';
import { checkSlice, formatProblems, SEQUENCE_INIT } from '../../skills/jois-story-plan/diagrams/checks.js';
import { SAMPLE_SLICE, FIXTURE_BACKLOG_CSV } from './helpers/backlog-tree.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONVENTIONS = path.join(HERE, '..', '..', 'skills', 'jois-story-plan', 'references', 'diagram-conventions.md');
const SLICE_DIR = SAMPLE_SLICE;
const SPEC = 'UC-streaks.md';
const limits = parseLimits(fs.readFileSync(CONVENTIONS, 'utf8'));
const stories = scopeStories(loadBacklog(fs.readFileSync(FIXTURE_BACKLOG_CSV, 'utf8'), { initials: 'H1' }).stories, { type: 'feature', epic: 'Habit tracking', feature: 'Streaks' });

// A Windows checkout may hold CRLF; the tests edit the text with "\n" strings.
const mock = fs.readFileSync(path.join(SLICE_DIR, SPEC), 'utf8');
const run = (text, extra = {}) => checkSlice({ slice: 'streaks', files: { [SPEC]: text }, stories, limits, ...extra });
const messages = (r) => formatProblems(r.problems).join('\n');
const changed = (from, to) => {
  assert.ok(mock.includes(from), `the mock holds "${from}"`);
  return mock.replace(from, to);
};

test('the mock slice passes every check and yields its three diagrams', () => {
  const r = run(mock);
  assert.deepEqual(formatProblems(r.problems), []);
  assert.deepEqual(r.diagrams.map((d) => d.heading), ['## Class diagram', '### Sequence: current', '### Sequence: best']);
});

test('a second document and a missing document are reported', () => {
  const text = messages(checkSlice({ slice: 'streaks', files: { [SPEC]: mock, 'UC-streaks-extra.md': 'x' }, stories, limits }));
  assert.match(text, /UC-streaks-extra\.md: is not part of a slice: a slice is one document \(UC-streaks\.md\) plus source\.json/);
  assert.match(messages(checkSlice({ slice: 'streaks', files: {}, stories, limits })), /UC-streaks\.md: is missing/);
});

test('a heading with no block, a heading with two blocks and a block under no diagram heading are named', () => {
  const noBlock = readDocument('## Class diagram\n\ntext\n\n## Sequence diagrams\n\n### Sequence: a\n');
  assert.match(noBlock.problems[0].message, /"## Class diagram" must have exactly one mermaid block \(found 0\)/);
  const two = readDocument('## Class diagram\n\n```mermaid\nclassDiagram\n```\n\n```mermaid\nclassDiagram\n```\n');
  assert.match(two.problems[0].message, /exactly one mermaid block \(found 2\)/);
  const orphan = readDocument('## Notes\n\n```mermaid\nclassDiagram\n```\n');
  assert.deepEqual([orphan.problems[0].line, /not under/.test(orphan.problems[0].message)], [3, true]);
});

test('a block of another diagram type is rejected and names its heading', () => {
  const r = run(changed('classDiagram\n  namespace', 'pie\n  namespace'));
  assert.match(messages(r), /UC-streaks\.md:\d+: ## Class diagram: the block opens with "pie" but must be a classDiagram/);
});

test('a document with no class diagram or no sequence diagram is reported', () => {
  const noClass = mock.replace('## Class diagram', '## Other');
  assert.match(messages(run(noClass)), /has no "## Class diagram" heading/);
  const noSequence = mock.slice(0, mock.indexOf('### Sequence: current'));
  assert.match(messages(run(noSequence)), /at least one "### Sequence: <flow>"/);
});

test('a sequence diagram without the init line, or with another one, is rejected and shows the line', () => {
  const missing = changed(`${SEQUENCE_INIT}\nsequenceDiagram\n  actor U as Person\n  participant LIST`, 'sequenceDiagram\n  actor U as Person\n  participant LIST');
  assert.match(messages(run(missing)), /### Sequence: current: a sequence diagram must open with the init line .*%%\{init:/);
  const other = changed(SEQUENCE_INIT, "%%{init: {'theme': 'dark'}}%%");
  assert.match(messages(run(other)), /must open with the init line/);
});

test('the conventions show the same init line the check requires', () => {
  const conventions = fs.readFileSync(CONVENTIONS, 'utf8');
  assert.ok(conventions.includes(SEQUENCE_INIT));
});

test('an undeclared participant is named with its diagram', () => {
  assert.match(messages(run(changed('LIST->>SVC: 1.2', 'LIST->>GHOST: 1.2'))), /### Sequence: current: names the participant GHOST, which is not declared/);
});

test('a class or participant with no stereotype, or an unknown one, is named', () => {
  assert.match(messages(run(changed('<<service>>\n    +currentStreak', '+currentStreak'))), /## Class diagram: StreakService has no stereotype/);
  assert.match(messages(run(changed('<<service>>\n    +currentStreak', '<<magic>>\n    +currentStreak'))), /StreakService has the stereotype magic, which is not in the conventions/);
  assert.match(messages(run(changed('participant SVC as «service»<br/>StreakService', 'participant SVC as StreakService'))), /SVC has no stereotype/);
  assert.match(messages(run(changed('«service»<br/>StreakService', '«magic»<br/>StreakService'))), /SVC has the stereotype magic/);
});

test('an actor needs no stereotype and a stereotype line before the name is accepted', () => {
  assert.deepEqual(formatProblems(run(mock).problems), []);
  const standalone = changed('    class DaySet {\n      <<value object>>\n    }', '    class DaySet\n    <<value object>> DaySet');
  assert.deepEqual(formatProblems(run(standalone).problems), []);
});

test('text shaped like a story ID is rejected inside a diagram', () => {
  assert.match(messages(run(changed('Habit ..> DaySet', 'Habit ..> DaySet : H1-HT-0001'))), /story ID \(H1-HT-0001\)/);
});

test('step ids: a duplicate, a step out of order and a step in the wrong phase are rejected', () => {
  assert.match(messages(run(changed('REPO-->>SVC: 2.2 none', 'REPO-->>SVC: 2.1 none'))), /step 2\.1 is used twice/);
  assert.match(messages(run(changed('2.5 checkedDays', '2.0 checkedDays'))), /step 2\.0 does not come after/);
  assert.match(messages(run(changed('CLOCK: 3.1 today(', 'CLOCK: 4.1 today('))), /step 4\.1 is in Phase 3; its first number must be 3/);
});

test('a primed step may follow its step', () => {
  const r = run(changed('        SVC-->>LIST: 2.7 {days: 0}', "        SVC-->>LIST: 2.7 {days: 0}\n        SVC->>HABIT: 2.7' recheck()"));
  assert.deepEqual(formatProblems(r.problems), []);
});

test('a rect block must open with a phase note, and a phase note must open a rect', () => {
  const note = '    Note over U,SVC: Phase 1 - Validate the request\n';
  assert.match(messages(run(changed(note, ''))), /a rect block must open with "Note over/);
  assert.match(messages(run(changed(note, `${note}    Note over U,SVC: Phase 9 - Again\n`))), /a phase note must be the first line of a rect block/);
});

test('thirteen classes break the limit and name it, and the namespace is not counted', () => {
  assert.doesNotMatch(messages(run(mock)), /declares/);
  const extra = ['One', 'Two', 'Three'].map((n) => `  class Extra${n} {\n    <<value object>>\n  }`).join('\n');
  assert.match(messages(run(changed('  class LocalStore {', `${extra}\n  class LocalStore {`))), /## Class diagram: declares 13 classes; the limit is 12/);
});

test('a story criterion with no row names the story by Title and the criterion', () => {
  const r = run(mock.split('\n').filter((l) => !l.includes('AC-streaks-best')).join('\n'));
  assert.match(messages(r), /the story "See the best streak" has AC1 \(Given a habit whose longest run was 5 days and whose current streak is 2, when I open the habit list, then it shows a best streak of 5\.\) with no row/);
});

test('a criterion changed in the row is not verbatim, so the story criterion has no row', () => {
  assert.match(messages(run(changed('it shows a streak of 3', 'it shows a page'))), /"See the current streak" has AC1/);
});

test('a failure row needs an alt branch in its flow, and a flow with no diagram is named', () => {
  const failureRow = changed('| main | best |', '| failure | best |');
  const flat = `### Sequence: best\n\n\`\`\`mermaid\n${SEQUENCE_INIT}\nsequenceDiagram\n  actor U as Person\n  U->>U: 1.1 ask\n\`\`\`\n\n`;
  const noAlt = failureRow.slice(0, failureRow.indexOf('### Sequence: best')) + flat + failureRow.slice(failureRow.indexOf('## Design decisions'));
  assert.match(messages(run(noAlt)), /failure path but the "### Sequence: best" diagram has no alt branch/);
  assert.doesNotMatch(messages(run(changed('| main | current |', '| failure | current |'))), /no alt branch/);
  assert.match(messages(run(changed('| main | current |', '| main | nowhere |'))), /flow "nowhere", which has no "### Sequence: nowhere" heading/);
});

test('a criterion that describes a failure but is marked main is reported', () => {
  assert.match(messages(run(changed('it shows a best streak of 5', 'the request is rejected'))), /describes a failure/);
});

test('a bad AC id and an unknown story are reported', () => {
  assert.match(messages(run(changed('AC-streaks-current', 'AC-A1-dashboard'))), /must be AC-streaks-<name>/);
  assert.match(messages(run(changed('| See the best streak | main |', '| Not a story | main |'))), /story "Not a story"/);
});

test('analysis level: maturity, TBC sections and file paths, inside a diagram too', () => {
  assert.match(messages(run(changed('| **Maturity** | planned |', '| **Maturity** | done |'))), /Maturity is "done"/);
  assert.match(messages(run(changed('## Traceability\nTBC', '## Traceability\n| Step | What | Code |\n|---|---|---|\n| 1.2 | x | `a.js::f` |'))), /Traceability" must read TBC/);
  assert.match(messages(run(changed('participant LIST as «boundary»<br/>HabitList', 'participant LIST as «boundary»<br/>HabitList ui/habit-list.tsx'))), /names a file path \(ui\/habit-list\.tsx\)/);
});

test('repo level: Maturity may be built, and a traceability row has to name a file::symbol (which files were read is the skill\'s rule)', () => {
  const traced = (code) => changed('| **Maturity** | planned |', '| **Maturity** | built |').replace('## Traceability\nTBC', `## Traceability\n| Step | What | Code |\n|---|---|---|\n| 1.2 | sign in | ${code} |`).replace('## Implementation overview\nTBC', '## Implementation overview\n| Layer | File |\n|---|---|\n| API | `src/streak.ts` |');
  const repo = {};
  assert.deepEqual(formatProblems(run(traced('`src/streak.ts::currentStreak`'), { repo }).problems), []);
  assert.match(messages(run(traced('signs in'), { repo })), /traceability row "1\.2" names no `file::symbol`/);
  assert.match(messages(run(traced('`src/streak.ts::currentStreak`'))), /Maturity is "built"; without a repo it is "planned"/);
});

test('every problem of a failing slice is reported together', () => {
  const r = run(changed('LIST->>SVC: 1.2', 'LIST->>GHOST: 1.2').replace('<<service>>\n    +currentStreak', '+currentStreak'));
  assert.equal(r.ok, false);
  assert.equal(r.problems.length >= 2, true);
});

test('a missing design section is named by its heading, and an empty one is reported', () => {
  assert.match(messages(run(changed('## Design decisions', '## Decisions'))), /has no "## Design decisions" heading/);
  assert.match(messages(run(changed('## Open questions', '## Open questions\n\n## Notes'))), /"## Open questions" is empty/);
});

const CHANGES_TABLE = '| modified | Home.md | the habit list shows a streak next to each habit | See the current streak adds it |\n| added | Streaks.md | a page describing how a streak is counted | no page describes it yet |\n';
const withChanges = (body) => changed(`## Changes to existing specs\n\n| Change | Wiki page | What changes | Reason |\n|---|---|---|---|\n${CHANGES_TABLE}`, `## Changes to existing specs\n\n${body}`);

test('changes to existing specs: a valid row is accepted, and an added row may name a page that does not exist', () => {
  assert.deepEqual(formatProblems(run(mock).problems), []);
  assert.deepEqual(formatProblems(run(withChanges('| Change | Wiki page | What changes | Reason |\n|---|---|---|---|\n| modified | planner/Story-Skills.md | one role becomes many | Story says a user can hold many roles |\n')).problems), []);
  assert.deepEqual(formatProblems(run(withChanges('| Change | Wiki page | What changes | Reason |\n|---|---|---|---|\n| added | no/such/Page.md | a new page | nothing covers it |\n')).problems), []);
});

test('changes to existing specs: the word None is accepted', () => {
  assert.deepEqual(formatProblems(run(withChanges('None\n')).problems), []);
});

test('changes to existing specs: a missing heading is named, and an empty section or free text is rejected', () => {
  assert.match(messages(run(changed('## Changes to existing specs', '## Changes'))), /has no "## Changes to existing specs" heading/);
  assert.match(messages(run(withChanges(''))), /"## Changes to existing specs" is empty/);
  assert.match(messages(run(withChanges('some prose\n'))), /"## Changes to existing specs" holds neither a table nor the word None/);
});

test('changes to existing specs: an unknown change word is rejected and says which words are allowed', () => {
  assert.match(messages(run(withChanges('| Change | Wiki page | What changes | Reason |\n|---|---|---|---|\n| updated | planner/Story-Skills.md | x | y |\n'))), /the change "updated" must be added, modified, removed/);
});

test('changes to existing specs: a page that is not a wiki path is rejected and named', () => {
  const row = (page) => `| Change | Wiki page | What changes | Reason |\n|---|---|---|---|\n| modified | ${page} | x | y |\n`;
  assert.match(messages(run(withChanges(row('planner/Story-Skills')))), /the wiki page "planner\/Story-Skills" must be a path under wiki\//);
  assert.match(messages(run(withChanges(row('wiki/planner/Story-Skills.md')))), /the wiki page "wiki\/planner\/Story-Skills\.md" must be a path under wiki\//);
});

test('changes to existing specs: a fifth cell, such as a status, is rejected', () => {
  assert.match(messages(run(withChanges('| Change | Wiki page | What changes | Reason | Status |\n|---|---|---|---|---|\n| modified | planner/Story-Skills.md | x | y | applied |\n'))), /must have the four columns Change \| Wiki page \| What changes \| Reason/);
});

test('the Steps column is required and each step id must exist in the flow of the row', () => {
  assert.match(messages(run(changed('| 1.1, 1.2, 2.1, 2.4, 2.5, 2.8, 3.1, 3.3, 3.5 |', ''))), /must have the six columns/);
  assert.match(messages(run(changed('| 1.1, 1.2, 2.1, 2.4, 2.5, 2.8, 3.1, 3.3, 3.5 |', '| 1.1, 9.9 |'))), /AC-streaks-current names the step 9\.9, which the "### Sequence: current" diagram does not contain/);
  assert.match(messages(run(changed('| 1.1, 1.2, 2.1, 2.4, 2.5, 2.8, 3.1, 3.3, 3.5 |', '|  |'))), /names no step in Steps/);
});

test('a step id of another flow is not accepted for the row', () => {
  assert.match(messages(run(changed('| 1.1, 1.2, 2.1, 2.4, 2.5, 2.7, 2.10, 2.11 |', '| 1.1, 3.5 |'))), /AC-streaks-best names the step 3\.5/);
});

test('a design decision needs a source of user-confirmed, repo or TBC, and repo only with a repo', () => {
  assert.match(messages(run(changed('| user-confirmed | current 3.1 |', '|  | current 3.1 |'))), /decision "D1" has the source ""/);
  assert.match(messages(run(changed('| user-confirmed | current 3.1 |', '| guessed | current 3.1 |'))), /decision "D1" has the source "guessed"; it must be one of user-confirmed, repo, TBC/);
  assert.match(messages(run(changed('| user-confirmed | current 3.1 |', '| repo | current 3.1 |'))), /source repo, but no repo was read/);
  assert.match(messages(run(changed('| user-confirmed | current 2.9 |', '| TBC | current 2.9 |'))), /^((?!has the source).)*$/s);
});

test('a failure response names an acceptance criterion that is a row of the table', () => {
  assert.match(messages(run(changed('| current unknown habit | no habit has the id | error `habit not found`, the same as for a best streak on purpose (D3) | AC-streaks-current |', '| current unknown habit | no habit has the id | error | AC-streaks-nothing |'))), /failure "current unknown habit" names the acceptance criterion "AC-streaks-nothing"/);
});

test('the aggregate boundary: a root outside a namespace is named', () => {
  const text = changed('  namespace HabitAggregate {', '  namespace Habits {');
  assert.match(messages(run(text)), /the root entity Habit is not inside an aggregate boundary/);
});

test('the aggregate boundary: a namespace without a rule line is named', () => {
  const text = changed('  note for Habit "Rule: a habit holds each day at most once"\n', '');
  assert.match(messages(run(text)), /the aggregate HabitAggregate has no line naming its rule/);
});

test('the aggregate boundary: a class outside the namespace may not link to an inner class', () => {
  const text = changed('  StreakService ..> Habit : checkedDays\n', '  StreakService ..> Habit : checkedDays\n  StreakService ..> DaySet : read\n');
  assert.match(messages(run(text)), /StreakService is outside the aggregate HabitAggregate but is linked to DaySet, which is not its root/);
  assert.match(messages(run(changed('  StreakService ..> Habit : checkedDays\n', '  Day <.. StreakService : read\n  StreakService ..> Habit : checkedDays\n'))), /StreakService is outside the aggregate HabitAggregate but is linked to Day/);
});

test('the aggregate boundary: a stub of a root another slice owns needs no namespace', () => {
  const stub = changed('  class HabitList {', '  class Account {\n    <<root entity>>\n  }\n  note for Account "(see accounts)"\n  class HabitList {');
  assert.doesNotMatch(messages(run(stub)), /Account/);
});

const LAYOUT_ROW = '| D7 | A grace day for one missed day | none | not decided | TBC | current 2.9 |';
const greenfield = ({ code = '`src/streak.ts::currentStreak` planned', layout = true, overview = '- Build the streaks service in `src/streak.ts`.' } = {}) => {
  let text = changed('| **Maturity** | planned |', '| **Maturity** | planned (greenfield) |')
    .replace('## Implementation overview\nTBC', `## Implementation overview\n${overview}`)
    .replace('## Traceability\nTBC', `## Traceability\n| Step | What | Code |\n|---|---|---|\n| 1.2 | sign in | ${code} |`);
  if (layout) text = text.replace(LAYOUT_ROW, `${LAYOUT_ROW}\n| D8 | Project layout and stack: a Node service under src/ | none | the user chose it | user-confirmed | current 3.1 |`);
  return text;
};

test('greenfield: a valid document passes, with a build plan, planned rows and a layout decision', () => {
  assert.deepEqual(formatProblems(run(greenfield()).problems), []);
});

test('greenfield: a planned path with no layout or stack decision is named', () => {
  assert.match(messages(run(greenfield({ layout: false }))), /names a file path \(src\/streak\.ts\) but no user-confirmed row of "## Design decisions" records the project layout or stack/);
});

test('greenfield: a layout decision that is not user-confirmed does not allow a path', () => {
  const text = greenfield({ layout: false }).replace(LAYOUT_ROW, `${LAYOUT_ROW}\n| D8 | Project layout and stack | none | guess | TBC | current 3.1 |`);
  assert.match(messages(run(text)), /no user-confirmed row/);
});

test('greenfield: a traceability row without the planned mark, or without a file::symbol, is named', () => {
  assert.match(messages(run(greenfield({ code: '`src/streak.ts::currentStreak`' }))), /traceability row "1\.2" is not marked planned/);
  assert.match(messages(run(greenfield({ code: 'signs in planned' }))), /traceability row "1\.2" names no `file::symbol`/);
});

test('greenfield: an Implementation overview that reads TBC or is empty is named', () => {
  assert.match(messages(run(greenfield({ overview: 'TBC' }))), /Implementation overview" must hold the build plan in greenfield mode/);
  assert.match(messages(run(greenfield({ overview: '' }))), /Implementation overview" must hold the build plan in greenfield mode/);
});

test('greenfield: a decision with the source repo is refused', () => {
  const text = greenfield().replace('| the user chose it | user-confirmed |', '| the user chose it | repo |');
  assert.match(messages(run(text)), /decision "D8" has the source repo, but no repo was read/);
});

test('greenfield: --repo with a greenfield Maturity reports the contradiction', () => {
  assert.match(messages(run(greenfield(), { repo: {} })), /\(greenfield mode\) but --repo was given/);
});

test('the same greenfield document gives the same result every run, since the mode is read from the document', () => {
  assert.deepEqual(run(greenfield({ layout: false })).problems, run(greenfield({ layout: false })).problems);
});

test('outside greenfield mode, the TBC and file-path errors name greenfield mode and its conventions section', () => {
  const overview = messages(run(changed('## Implementation overview\nTBC', '## Implementation overview\nBuild it.')));
  assert.match(overview, /must read TBC without a repo; a story that builds the code from scratch uses greenfield mode \(conventions, section 5, Modes\)/);
  const path = messages(run(changed('streak shown next to the habit', 'streak shown next to the habit in habit-list.json')));
  assert.match(path, /names a file path \(habit-list\.json\).*greenfield mode \(conventions, section 5, Modes\)/);
});

test('greenfield errors do not carry the greenfield hint', () => {
  assert.doesNotMatch(messages(run(greenfield({ layout: false }))), /builds the code from scratch/);
});

test('without a repo, a path in the text is rejected and the message does not call it a lower level', () => {
  const text = messages(run(changed('streak shown next to the habit', 'streak shown next to the habit in habit-list.json')));
  assert.match(text, /a slice without a repo names no path/);
});
