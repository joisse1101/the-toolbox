import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBacklog } from '../../logic/backlog/model.js';
import { parseLimits } from '../../logic/diagrams/limits.js';
import { scopeStories } from '../../logic/diagrams/source.js';
import { checkSlice, diagramNames, formatProblems } from '../../logic/diagrams/checks.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE = path.join(HERE, '..', 'sample-data');
const SLICE_DIR = path.join(SAMPLE, 'diagrams', 'sample', 'sign-in');
const limits = parseLimits(fs.readFileSync(path.join(HERE, '..', '..', 'guidelines', 'diagram-conventions.md'), 'utf8'));
const stories = scopeStories(loadBacklog(fs.readFileSync(path.join(SAMPLE, 'backlogs', 'sample.csv'), 'utf8')).stories, { type: 'feature', epic: 'Identity and access', feature: 'Sign in' });

const readSlice = () => Object.fromEntries(fs.readdirSync(SLICE_DIR).filter((f) => f !== 'source.json').map((f) => [f, fs.readFileSync(path.join(SLICE_DIR, f), 'utf8')]));
const run = (files, extra = {}) => checkSlice({ backlog: 'sample', slice: 'sign-in', files, stories, limits, ...extra });
const messages = (r) => formatProblems(r.problems).join('\n');

// A copy of the mock with one change: edit(text) on one file.
const changed = (file, edit) => {
  const files = readSlice();
  files[file] = edit(files[file]);
  return files;
};
const LOGIN = 'UC-sign-in-login-sequence.puml';
const CLASS = 'UC-sign-in-class.puml';
const SPEC = 'UC-sign-in.md';

test('the mock slice passes every check', () => {
  const r = run(readSlice());
  assert.deepEqual(formatProblems(r.problems), []);
  assert.equal(r.ok, true);
});

test('a missing file, an extra file and no sequence diagram are reported', () => {
  const files = readSlice();
  delete files[CLASS];
  delete files[LOGIN];
  delete files['UC-sign-in-reset-sequence.puml'];
  files['notes.txt'] = 'x';
  const text = messages(run(files));
  assert.match(text, /UC-sign-in-class\.puml: is missing/);
  assert.match(text, /at least one sequence diagram/);
  assert.match(text, /notes\.txt: is not a file of a slice/);
});

test('!include is rejected with its line', () => {
  const r = run(changed(LOGIN, (t) => t.replace("' palette", '!include palette.puml\n\' palette')));
  assert.match(messages(r), /UC-sign-in-login-sequence\.puml:3: must not use !include/);
});

test('a duplicate @startuml name names the other file, and a wrong name is rejected', () => {
  const taken = diagramNames({ 'UC-other-class.puml': '@startuml sample_sign_in_class\n@enduml' });
  assert.match(messages(run(readSlice(), { otherNames: taken })), /already used by UC-other-class\.puml/);
  assert.match(messages(run(changed(CLASS, (t) => t.replace('sample_sign_in_class', 'other')))), /name must be sample_sign_in_class/);
});

test('an undeclared participant is named', () => {
  const r = run(changed(LOGIN, (t) => t.replace('FORM -> AUTH', 'FORM -> GHOST')));
  assert.match(messages(r), /participant GHOST, which is not declared/);
});

test('text shaped like a story ID is rejected in a puml file', () => {
  assert.match(messages(run(changed(LOGIN, (t) => t.replace('title UC-sign-in', 'title IAM-0001 UC-sign-in')))), /story ID \(IAM-0001\)/);
});

test('step ids: a duplicate, a step out of order and a wrong phase number are rejected', () => {
  assert.match(messages(run(changed(LOGIN, (t) => t.replace('1.3 getByEmail', '1.2 getByEmail')))), /step 1\.2 is used twice/);
  assert.match(messages(run(changed(LOGIN, (t) => t.replace('1.4 verifyCredential', '1.0 verifyCredential')))), /step 1\.0 does not come after/);
  assert.match(messages(run(changed(LOGIN, (t) => t.replace('2.1 show dashboard', '3.1 show dashboard')))), /step 3\.1 is in Phase 2/);
});

test('a primed step may follow its step', () => {
  const r = run(changed(LOGIN, (t) => t.replace('AUTH --> FORM : sign-in refused\nend\nelse no such member', "AUTH -> MEMBER : 1.4' dummyVerify(password)\nAUTH --> FORM : sign-in refused\nend\nelse no such member")));
  assert.deepEqual(formatProblems(r.problems), []);
});

test('colors follow the stereotype', () => {
  assert.match(messages(run(changed(CLASS, (t) => t.replace('as AUTH #E7F4EA', 'as AUTH #E6F0FB')))), /AUTH is #E6F0FB but «service» is #E7F4EA/);
  assert.match(messages(run(changed(CLASS, (t) => t.replace('as AUTH #E7F4EA', 'as AUTH')))), /AUTH has no color/);
  assert.match(messages(run(changed(CLASS, (t) => t.replace('«service»\\nAuthService', '«magic»\\nAuthService')))), /«magic», which is not in the conventions/);
  assert.match(messages(run(changed(CLASS, (t) => t.replace('class "«service»\\nAuthService" as AUTH #E7F4EA', 'class AuthService')))), /declare it as/);
});

test('thirteen classes break the limit and name it', () => {
  const extra = Array.from({ length: 4 }, (_, i) => `  class "«value object»\\nExtra${i}" as X${i} #FBF2D9`).join('\n');
  const r = run(changed(CLASS, (t) => t.replace('  class "«port»\\nMailer"', `${extra}\n  class "«port»\\nMailer"`)));
  assert.match(messages(r), /declares 14 classes; the limit is 12/);
});

test('a story criterion with no row names the story by Title and the criterion', () => {
  const r = run(changed(SPEC, (t) => t.split('\n').filter((l) => !l.includes('AC-sign-in-reset-link')).join('\n')));
  assert.match(messages(r), /the story "Reset a password" has AC1 \(Given a registered member, when they ask for a reset, then they are sent a reset link\.\) with no row/);
});

test('a criterion changed in the row is not verbatim, so the story criterion has no row', () => {
  const r = run(changed(SPEC, (t) => t.replace('they see their dashboard', 'they land on a page')));
  assert.match(messages(r), /"Sign in with email" has AC1/);
});

test('a failure row needs an alt branch in its flow', () => {
  const noAlt = changed(SPEC, (t) => t.replace('| main | reset |', '| failure | reset |'));
  noAlt['UC-sign-in-reset-sequence.puml'] = noAlt['UC-sign-in-reset-sequence.puml'].replace('alt member found', 'group member found');
  assert.match(messages(run(noAlt)), /failure path but the reset sequence has no alt branch/);
  const withAlt = changed(SPEC, (t) => t.replace('| main | login |', '| failure | login |'));
  assert.doesNotMatch(messages(run(withAlt)), /no alt branch/);
});

test('a criterion that describes a failure but is marked main is reported', () => {
  const r = run(changed(SPEC, (t) => t.replace('they are sent a reset link', 'the request is rejected').replace('| AC-sign-in-reset-link |', '| AC-sign-in-reset-link |')));
  assert.match(messages(r), /describes a failure/);
});

test('a bad AC id, an unknown flow and an unknown story are reported', () => {
  assert.match(messages(run(changed(SPEC, (t) => t.replace('AC-sign-in-dashboard', 'AC-A1-dashboard')))), /must be AC-sign-in-<name>/);
  assert.match(messages(run(changed(SPEC, (t) => t.replace('| main | login |', '| main | nowhere |')))), /flow "nowhere"/);
  assert.match(messages(run(changed(SPEC, (t) => t.replace('| Reset a password | main |', '| Not a story | main |')))), /story "Not a story"/);
});

test('analysis level: maturity, TBC sections and file paths', () => {
  assert.match(messages(run(changed(SPEC, (t) => t.replace('| **Maturity** | planned |', '| **Maturity** | done |')))), /Maturity is "done"/);
  assert.match(messages(run(changed(SPEC, (t) => t.replace('## Traceability\nTBC', '## Traceability\n| Step | What | Code |\n|---|---|---|\n| 1.2 | x | `a.js::f` |')))), /Traceability" must read TBC/);
  assert.match(messages(run(changed(CLASS, (t) => t.replace('"«boundary»\\nSignInForm"', '"«boundary»\\nSignInForm\\n(auth/login/page.tsx)"')))), /names a file path \(auth\/login\/page\.tsx\)/);
});

test('repo level: a traceability path the session never read is rejected', () => {
  const traced = (code) => changed(SPEC, (t) => t.replace('| **Maturity** | planned |', '| **Maturity** | built |').replace('## Traceability\nTBC', `## Traceability\n| Step | What | Code |\n|---|---|---|\n| 1.2 | sign in | ${code} |`).replace('## Implementation overview\nTBC', '## Implementation overview\n| Layer | File |\n|---|---|\n| API | `src/auth/login.js` |'));
  const repo = { readPaths: new Set(['src/auth/login.js']) };
  assert.deepEqual(formatProblems(run(traced('`src/auth/login.js::signIn`'), { repo }).problems), []);
  assert.match(messages(run(traced('`src/auth/invented.js::x`'), { repo })), /invented\.js, which repo_read did not return/);
});

test('every problem of a failing slice is reported together', () => {
  const files = changed(LOGIN, (t) => t.replace('FORM -> AUTH', 'FORM -> GHOST'));
  files[CLASS] = files[CLASS].replace('as AUTH #E7F4EA', 'as AUTH #FFFFFF');
  const r = run(files);
  assert.equal(r.ok, false);
  assert.equal(r.problems.length >= 2, true);
});
