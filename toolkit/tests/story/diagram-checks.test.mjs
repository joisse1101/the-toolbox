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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures', 'sample');
const CONVENTIONS = path.join(HERE, '..', '..', 'skills', 'jois-story-plan', 'references', 'diagram-conventions.md');
const SLICE_DIR = path.join(FIXTURES, 'slices', 'sign-in');
const SPEC = 'UC-sign-in.md';
const limits = parseLimits(fs.readFileSync(CONVENTIONS, 'utf8'));
const stories = scopeStories(loadBacklog(fs.readFileSync(path.join(FIXTURES, 'user-stories.csv'), 'utf8'), { initials: 'B1' }).stories, { type: 'feature', epic: 'Identity and access', feature: 'Sign in' });

// A Windows checkout may hold CRLF; the tests edit the text with "\n" strings.
const mock = fs.readFileSync(path.join(SLICE_DIR, SPEC), 'utf8');
const run = (text, extra = {}) => checkSlice({ slice: 'sign-in', files: { [SPEC]: text }, stories, limits, ...extra });
const messages = (r) => formatProblems(r.problems).join('\n');
const changed = (from, to) => {
  assert.ok(mock.includes(from), `the mock holds "${from}"`);
  return mock.replace(from, to);
};

test('the mock slice passes every check and yields its three diagrams', () => {
  const r = run(mock);
  assert.deepEqual(formatProblems(r.problems), []);
  assert.deepEqual(r.diagrams.map((d) => d.heading), ['## Class diagram', '### Sequence: login', '### Sequence: reset']);
});

test('a second document and a missing document are reported', () => {
  const text = messages(checkSlice({ slice: 'sign-in', files: { [SPEC]: mock, 'UC-sign-in-extra.md': 'x' }, stories, limits }));
  assert.match(text, /UC-sign-in-extra\.md: is not part of a slice: a slice is one document \(UC-sign-in\.md\) plus source\.json/);
  assert.match(messages(checkSlice({ slice: 'sign-in', files: {}, stories, limits })), /UC-sign-in\.md: is missing/);
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
  assert.match(messages(r), /UC-sign-in\.md:\d+: ## Class diagram: the block opens with "pie" but must be a classDiagram/);
});

test('a document with no class diagram or no sequence diagram is reported', () => {
  const noClass = mock.replace('## Class diagram', '## Other');
  assert.match(messages(run(noClass)), /has no "## Class diagram" heading/);
  const noSequence = mock.slice(0, mock.indexOf('### Sequence: login'));
  assert.match(messages(run(noSequence)), /at least one "### Sequence: <flow>"/);
});

test('a sequence diagram without the init line, or with another one, is rejected and shows the line', () => {
  const missing = changed(`${SEQUENCE_INIT}\nsequenceDiagram\n  actor U as Member\n  participant FORM`, 'sequenceDiagram\n  actor U as Member\n  participant FORM');
  assert.match(messages(run(missing)), /### Sequence: login: a sequence diagram must open with the init line .*%%\{init:/);
  const other = changed(SEQUENCE_INIT, "%%{init: {'theme': 'dark'}}%%");
  assert.match(messages(run(other)), /must open with the init line/);
});

test('the conventions show the same init line the check requires', () => {
  const conventions = fs.readFileSync(CONVENTIONS, 'utf8');
  assert.ok(conventions.includes(SEQUENCE_INIT));
});

test('an undeclared participant is named with its diagram', () => {
  assert.match(messages(run(changed('FORM->>AUTH: 1.2', 'FORM->>GHOST: 1.2'))), /### Sequence: login: names the participant GHOST, which is not declared/);
});

test('a class or participant with no stereotype, or an unknown one, is named', () => {
  assert.match(messages(run(changed('<<service>>\n    +authenticate', '+authenticate'))), /## Class diagram: AuthService has no stereotype/);
  assert.match(messages(run(changed('<<service>>\n    +authenticate', '<<magic>>\n    +authenticate'))), /AuthService has the stereotype magic, which is not in the conventions/);
  assert.match(messages(run(changed('participant AUTH as «service»<br/>AuthService', 'participant AUTH as AuthService'))), /AUTH has no stereotype/);
  assert.match(messages(run(changed('«service»<br/>AuthService', '«magic»<br/>AuthService'))), /AUTH has the stereotype magic/);
});

test('an actor needs no stereotype and a stereotype line before the name is accepted', () => {
  assert.deepEqual(formatProblems(run(mock).problems), []);
  const standalone = changed('    class Email {\n      <<value object>>\n    }', '    class Email\n    <<value object>> Email');
  assert.deepEqual(formatProblems(run(standalone).problems), []);
});

test('text shaped like a story ID is rejected inside a diagram', () => {
  assert.match(messages(run(changed('Member ..> Email', 'Member ..> Email : B1-IAM-0001'))), /story ID \(B1-IAM-0001\)/);
});

test('step ids: a duplicate, a step out of order and a step in the wrong phase are rejected', () => {
  assert.match(messages(run(changed('REPO-->>AUTH: 2.2 none', 'REPO-->>AUTH: 2.1 none'))), /step 2\.1 is used twice/);
  assert.match(messages(run(changed('2.5 verifyCredential', '2.0 verifyCredential'))), /step 2\.0 does not come after/);
  assert.match(messages(run(changed('SESS: 3.1 create(', 'SESS: 4.1 create('))), /step 4\.1 is in Phase 3; its first number must be 3/);
});

test('a primed step may follow its step', () => {
  const r = run(changed('      AUTH-->>FORM: 2.7 401 {message: invalid email or password}', "      AUTH-->>FORM: 2.7 401 {message: invalid email or password}\n      AUTH->>MEMBER: 2.7' dummyVerify(password)"));
  assert.deepEqual(formatProblems(r.problems), []);
});

test('a rect block must open with a phase note, and a phase note must open a rect', () => {
  const note = '    Note over U,AUTH: Phase 1 - Validate the input\n';
  assert.match(messages(run(changed(note, ''))), /a rect block must open with "Note over/);
  assert.match(messages(run(changed(note, `${note}    Note over U,AUTH: Phase 9 - Again\n`))), /a phase note must be the first line of a rect block/);
});

test('thirteen classes break the limit and name it, and the namespace is not counted', () => {
  assert.doesNotMatch(messages(run(mock)), /declares/);
  const extra = '  class Extra {\n    <<value object>>\n  }';
  assert.match(messages(run(changed('  class Mailer {', `${extra}\n  class Mailer {`))), /## Class diagram: declares 13 classes; the limit is 12/);
});

test('a story criterion with no row names the story by Title and the criterion', () => {
  const r = run(mock.split('\n').filter((l) => !l.includes('AC-sign-in-reset-link')).join('\n'));
  assert.match(messages(r), /the story "Reset a password" has AC1 \(Given a registered member, when they ask for a reset, then they are sent a reset link\.\) with no row/);
});

test('a criterion changed in the row is not verbatim, so the story criterion has no row', () => {
  assert.match(messages(run(changed('they see their dashboard', 'they land on a page'))), /"Sign in with email" has AC1/);
});

test('a failure row needs an alt branch in its flow, and a flow with no diagram is named', () => {
  const failureRow = changed('| main | reset |', '| failure | reset |');
  const flat = `### Sequence: reset\n\n\`\`\`mermaid\n${SEQUENCE_INIT}\nsequenceDiagram\n  actor U as Member\n  U->>U: 1.1 ask\n\`\`\`\n\n`;
  const noAlt = failureRow.slice(0, failureRow.indexOf('### Sequence: reset')) + flat + failureRow.slice(failureRow.indexOf('## Design decisions'));
  assert.match(messages(run(noAlt)), /failure path but the "### Sequence: reset" diagram has no alt branch/);
  assert.doesNotMatch(messages(run(changed('| main | login |', '| failure | login |'))), /no alt branch/);
  assert.match(messages(run(changed('| main | login |', '| main | nowhere |'))), /flow "nowhere", which has no "### Sequence: nowhere" heading/);
});

test('a criterion that describes a failure but is marked main is reported', () => {
  assert.match(messages(run(changed('they are sent a reset link', 'the request is rejected'))), /describes a failure/);
});

test('a bad AC id and an unknown story are reported', () => {
  assert.match(messages(run(changed('AC-sign-in-dashboard', 'AC-A1-dashboard'))), /must be AC-sign-in-<name>/);
  assert.match(messages(run(changed('| Reset a password | main |', '| Not a story | main |'))), /story "Not a story"/);
});

test('analysis level: maturity, TBC sections and file paths, inside a diagram too', () => {
  assert.match(messages(run(changed('| **Maturity** | planned |', '| **Maturity** | done |'))), /Maturity is "done"/);
  assert.match(messages(run(changed('## Traceability\nTBC', '## Traceability\n| Step | What | Code |\n|---|---|---|\n| 1.2 | x | `a.js::f` |'))), /Traceability" must read TBC/);
  assert.match(messages(run(changed('participant FORM as «boundary»<br/>SignInForm', 'participant FORM as «boundary»<br/>SignInForm auth/login/page.tsx'))), /names a file path \(auth\/login\/page\.tsx\)/);
});

test('repo level: Maturity may be built, and a traceability row has to name a file::symbol (which files were read is the skill\'s rule)', () => {
  const traced = (code) => changed('| **Maturity** | planned |', '| **Maturity** | built |').replace('## Traceability\nTBC', `## Traceability\n| Step | What | Code |\n|---|---|---|\n| 1.2 | sign in | ${code} |`).replace('## Implementation overview\nTBC', '## Implementation overview\n| Layer | File |\n|---|---|\n| API | `src/auth/login.js` |');
  const repo = {};
  assert.deepEqual(formatProblems(run(traced('`src/auth/login.js::signIn`'), { repo }).problems), []);
  assert.match(messages(run(traced('signs in'), { repo })), /traceability row "1\.2" names no `file::symbol`/);
  assert.match(messages(run(traced('`src/auth/login.js::signIn`'))), /Maturity is "built"; without a repo it is "planned"/);
});

test('every problem of a failing slice is reported together', () => {
  const r = run(changed('FORM->>AUTH: 1.2', 'FORM->>GHOST: 1.2').replace('<<service>>\n    +authenticate', '+authenticate'));
  assert.equal(r.ok, false);
  assert.equal(r.problems.length >= 2, true);
});

test('a missing design section is named by its heading, and an empty one is reported', () => {
  assert.match(messages(run(changed('## Design decisions', '## Decisions'))), /has no "## Design decisions" heading/);
  assert.match(messages(run(changed('## Open questions', '## Open questions\n\n## Notes'))), /"## Open questions" is empty/);
});

test('the Steps column is required and each step id must exist in the flow of the row', () => {
  assert.match(messages(run(changed('| 1.1, 1.2, 2.1, 2.4, 2.5, 2.8, 3.1, 3.3, 3.5 |', ''))), /must have the six columns/);
  assert.match(messages(run(changed('| 1.1, 1.2, 2.1, 2.4, 2.5, 2.8, 3.1, 3.3, 3.5 |', '| 1.1, 9.9 |'))), /AC-sign-in-dashboard names the step 9\.9, which the "### Sequence: login" diagram does not contain/);
  assert.match(messages(run(changed('| 1.1, 1.2, 2.1, 2.4, 2.5, 2.8, 3.1, 3.3, 3.5 |', '|  |'))), /names no step in Steps/);
});

test('a step id of another flow is not accepted for the row', () => {
  assert.match(messages(run(changed('| 1.1, 1.2, 2.1, 2.4, 2.5, 2.7, 2.10, 2.11 |', '| 1.1, 3.5 |'))), /AC-sign-in-reset-link names the step 3\.5/);
});

test('a design decision needs a source of user-confirmed, repo or TBC, and repo only with a repo', () => {
  assert.match(messages(run(changed('| user-confirmed | login 3.1, 3.3 |', '|  | login 3.1, 3.3 |'))), /decision "D1" has the source ""/);
  assert.match(messages(run(changed('| user-confirmed | login 3.1, 3.3 |', '| guessed | login 3.1, 3.3 |'))), /decision "D1" has the source "guessed"; it must be one of user-confirmed, repo, TBC/);
  assert.match(messages(run(changed('| user-confirmed | login 3.1, 3.3 |', '| repo | login 3.1, 3.3 |'))), /source repo, but no repo was read/);
  assert.match(messages(run(changed('| user-confirmed | login 3.1 |', '| TBC | login 3.1 |'))), /^((?!has the source).)*$/s);
});

test('a failure response names an acceptance criterion that is a row of the table', () => {
  assert.match(messages(run(changed('| login unknown email | no member has the email | 401 `invalid email or password`, the same as a wrong password on purpose (D3) | AC-sign-in-dashboard |', '| login unknown email | no member has the email | 401 | AC-sign-in-nothing |'))), /failure "login unknown email" names the acceptance criterion "AC-sign-in-nothing"/);
});

test('the aggregate boundary: a root outside a namespace is named', () => {
  const text = changed('  namespace MemberAggregate {', '  namespace Members {');
  assert.match(messages(run(text)), /the root entity Member is not inside an aggregate boundary/);
});

test('the aggregate boundary: a namespace without a rule line is named', () => {
  const text = changed('  note for Member "Rule: a member has exactly one credential"\n', '');
  assert.match(messages(run(text)), /the aggregate MemberAggregate has no line naming its rule/);
});

test('the aggregate boundary: a class outside the namespace may not link to an inner class', () => {
  const text = changed('  AuthService ..> Member : verifyCredential\n', '  AuthService ..> Member : verifyCredential\n  AuthService ..> Credential : read\n');
  assert.match(messages(run(text)), /AuthService is outside the aggregate MemberAggregate but is linked to Credential, which is not its root/);
  assert.match(messages(run(changed('  AuthService ..> Member : verifyCredential\n', '  Email <.. AuthService : read\n  AuthService ..> Member : verifyCredential\n'))), /AuthService is outside the aggregate MemberAggregate but is linked to Email/);
});

test('the aggregate boundary: a stub of a root another slice owns needs no namespace', () => {
  const stub = changed('  class SignInForm {', '  class Account {\n    <<root entity>>\n  }\n  note for Account "(see accounts)"\n  class SignInForm {');
  assert.doesNotMatch(messages(run(stub)), /Account/);
});

const LAYOUT_ROW = '| D7 | Lockout after repeated wrong passwords | none, a delay | not decided | TBC | login 2.5 |';
const greenfield = ({ code = '`src/auth/login.js::signIn` planned', layout = true, overview = '- Build the sign-in service in `src/auth/login.js`.' } = {}) => {
  let text = changed('| **Maturity** | planned |', '| **Maturity** | planned (greenfield) |')
    .replace('## Implementation overview\nTBC', `## Implementation overview\n${overview}`)
    .replace('## Traceability\nTBC', `## Traceability\n| Step | What | Code |\n|---|---|---|\n| 1.2 | sign in | ${code} |`);
  if (layout) text = text.replace(LAYOUT_ROW, `${LAYOUT_ROW}\n| D8 | Project layout and stack: a Node service under src/ | none | the user chose it | user-confirmed | login 3.1 |`);
  return text;
};

test('greenfield: a valid document passes, with a build plan, planned rows and a layout decision', () => {
  assert.deepEqual(formatProblems(run(greenfield()).problems), []);
});

test('greenfield: a planned path with no layout or stack decision is named', () => {
  assert.match(messages(run(greenfield({ layout: false }))), /names a file path \(src\/auth\/login\.js\) but no user-confirmed row of "## Design decisions" records the project layout or stack/);
});

test('greenfield: a layout decision that is not user-confirmed does not allow a path', () => {
  const text = greenfield({ layout: false }).replace(LAYOUT_ROW, `${LAYOUT_ROW}\n| D8 | Project layout and stack | none | guess | TBC | login 3.1 |`);
  assert.match(messages(run(text)), /no user-confirmed row/);
});

test('greenfield: a traceability row without the planned mark, or without a file::symbol, is named', () => {
  assert.match(messages(run(greenfield({ code: '`src/auth/login.js::signIn`' }))), /traceability row "1\.2" is not marked planned/);
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
  const path = messages(run(changed('Set-Cookie sid', 'Set-Cookie sid in session.json')));
  assert.match(path, /names a file path \(session\.json\).*greenfield mode \(conventions, section 5, Modes\)/);
});

test('greenfield errors do not carry the greenfield hint', () => {
  assert.doesNotMatch(messages(run(greenfield({ layout: false }))), /builds the code from scratch/);
});

test('without a repo, a path in the text is rejected and the message does not call it a lower level', () => {
  const text = messages(run(changed('Set-Cookie sid', 'Set-Cookie sid in session.json')));
  assert.match(text, /a slice without a repo names no path/);
});
