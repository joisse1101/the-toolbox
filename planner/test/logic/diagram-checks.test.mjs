import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBacklog } from '../../logic/backlog/model.js';
import { parseLimits } from '../../logic/diagrams/limits.js';
import { scopeStories } from '../../logic/diagrams/source.js';
import { readDocument } from '../../logic/diagrams/document.js';
import { checkSlice, formatProblems } from '../../logic/diagrams/checks.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE = path.join(HERE, '..', 'sample-data');
const SLICE_DIR = path.join(SAMPLE, 'diagrams', 'sample', 'sign-in');
const SPEC = 'UC-sign-in.md';
const limits = parseLimits(fs.readFileSync(path.join(HERE, '..', '..', 'guidelines', 'diagram-conventions.md'), 'utf8'));
const stories = scopeStories(loadBacklog(fs.readFileSync(path.join(SAMPLE, 'backlogs', 'sample.csv'), 'utf8')).stories, { type: 'feature', epic: 'Identity and access', feature: 'Sign in' });

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

test('an undeclared participant is named with its diagram', () => {
  assert.match(messages(run(changed('FORM->>AUTH: 1.2', 'FORM->>GHOST: 1.2'))), /### Sequence: login: names the participant GHOST, which is not declared/);
});

test('a class or participant with no stereotype, or an unknown one, is named', () => {
  assert.match(messages(run(changed('<<service>>\n      +authenticate', '+authenticate'))), /## Class diagram: AuthService has no stereotype/);
  assert.match(messages(run(changed('<<service>>\n      +authenticate', '<<magic>>\n      +authenticate'))), /AuthService has the stereotype magic, which is not in the conventions/);
  assert.match(messages(run(changed('participant AUTH as «service»<br/>AuthService', 'participant AUTH as AuthService'))), /AUTH has no stereotype/);
  assert.match(messages(run(changed('«service»<br/>AuthService', '«magic»<br/>AuthService'))), /AUTH has the stereotype magic/);
});

test('an actor needs no stereotype and a stereotype line before the name is accepted', () => {
  assert.deepEqual(formatProblems(run(mock).problems), []);
  const standalone = changed('    class Email {\n      <<value object>>\n    }', '    class Email\n    <<value object>> Email');
  assert.deepEqual(formatProblems(run(standalone).problems), []);
});

test('text shaped like a story ID is rejected inside a diagram', () => {
  assert.match(messages(run(changed('Member ..> Email', 'Member ..> Email : IAM-0001'))), /story ID \(IAM-0001\)/);
});

test('step ids: a duplicate, a step out of order and a step in the wrong phase are rejected', () => {
  assert.match(messages(run(changed('1.3 getByEmail(email)\n    alt member found\n      REPO-->>AUTH: Member\n      AUTH->>MEMBER', '1.2 getByEmail(email)\n    alt member found\n      REPO-->>AUTH: Member\n      AUTH->>MEMBER'))), /step 1\.2 is used twice/);
  assert.match(messages(run(changed('1.4 verifyCredential', '1.0 verifyCredential'))), /step 1\.0 does not come after/);
  assert.match(messages(run(changed('2.1 show dashboard', '3.1 show dashboard'))), /step 3\.1 is in Phase 2; its first number must be 2/);
});

test('a primed step may follow its step', () => {
  const r = run(changed('      AUTH-->>FORM: sign-in refused\n    end\n  end', "      AUTH->>MEMBER: 1.4' dummyVerify(password)\n      AUTH-->>FORM: sign-in refused\n    end\n  end"));
  assert.deepEqual(formatProblems(r.problems), []);
});

test('a rect block must open with a phase note, and a phase note must open a rect', () => {
  assert.match(messages(run(changed('    Note over U,DASH: Phase 1 - Authenticate\n', ''))), /a rect block must open with "Note over/);
  assert.match(messages(run(changed('    Note over U,DASH: Phase 1 - Authenticate\n', '    Note over U,DASH: Phase 1 - Authenticate\n    Note over U,DASH: Phase 9 - Again\n'))), /a phase note must be the first line of a rect block/);
});

test('thirteen classes break the limit and name it', () => {
  const extra = Array.from({ length: 4 }, (_, i) => `    class Extra${i} {\n      <<value object>>\n    }`).join('\n');
  assert.match(messages(run(changed('    class Mailer {', `${extra}\n    class Mailer {`))), /## Class diagram: declares 14 classes; the limit is 12/);
});

test('a story criterion with no row names the story by Title and the criterion', () => {
  const r = run(mock.split('\n').filter((l) => !l.includes('AC-sign-in-reset-link')).join('\n'));
  assert.match(messages(r), /the story "Reset a password" has AC1 \(Given a registered member, when they ask for a reset, then they are sent a reset link\.\) with no row/);
});

test('a criterion changed in the row is not verbatim, so the story criterion has no row', () => {
  assert.match(messages(run(changed('they see their dashboard', 'they land on a page'))), /"Sign in with email" has AC1/);
});

test('a failure row needs an alt branch in its flow, and a flow with no diagram is named', () => {
  const noAlt = changed('| main | reset |', '| failure | reset |').replace('    alt member found\n      REPO-->>RESET: Member\n      RESET->>RLINK: 1.4 issue()\n      RLINK-->>RESET: ResetLink\n    else no such member\n      REPO-->>RESET: none\n    end\n', '    REPO-->>RESET: Member\n');
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

test('repo level: a traceability path the session never read is rejected', () => {
  const traced = (code) => changed('| **Maturity** | planned |', '| **Maturity** | built |').replace('## Traceability\nTBC', `## Traceability\n| Step | What | Code |\n|---|---|---|\n| 1.2 | sign in | ${code} |`).replace('## Implementation overview\nTBC', '## Implementation overview\n| Layer | File |\n|---|---|\n| API | `src/auth/login.js` |');
  const repo = { readPaths: new Set(['src/auth/login.js']) };
  assert.deepEqual(formatProblems(run(traced('`src/auth/login.js::signIn`'), { repo }).problems), []);
  assert.match(messages(run(traced('`src/auth/invented.js::x`'), { repo })), /invented\.js, which repo_read did not return/);
});

test('every problem of a failing slice is reported together', () => {
  const r = run(changed('FORM->>AUTH: 1.2', 'FORM->>GHOST: 1.2').replace('<<service>>\n      +authenticate', '+authenticate'));
  assert.equal(r.ok, false);
  assert.equal(r.problems.length >= 2, true);
});
