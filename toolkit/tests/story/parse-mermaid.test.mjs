import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { planSkillCopy } from './helpers/plan-skill.mjs';

const plan = planSkillCopy();
const { parseMermaid, mermaidBlocks } = await plan.load('parse-mermaid.mjs');

const CLASS = `classDiagram
  namespace Identity {
    class Member {
      <<root entity>>
      +verifyCredential(raw) bool
    }
    class AuthService {
      <<service>>
    }
  }
  AuthService ..> Member : verifyCredential`;

const SEQUENCE = `sequenceDiagram
  actor U as Member
  participant AUTH as «service»<br/>AuthService
  rect rgb(235, 242, 250)
    Note over U,AUTH: Phase 1 - Authenticate
    U->>AUTH: 1.1 sign in
    alt member found
      AUTH-->>U: Member
    else no such member
      AUTH-->>U: sign-in refused
    end
  end`;

test('a class diagram with a namespace and stereotypes parses', async () => {
  assert.deepEqual(await parseMermaid(CLASS), { ok: true });
});

test('a sequence diagram with rect, Note over and alt parses', async () => {
  assert.deepEqual(await parseMermaid(SEQUENCE), { ok: true });
});

test('a broken diagram is refused with the parser message and its line', async () => {
  const r = await parseMermaid('sequenceDiagram\n  actor U\n  U->>>U: x');
  assert.equal(r.ok, false);
  assert.equal(r.line, 3);
  assert.match(r.message, /Parse error on line 3/);
});

test('a participant named after a Mermaid keyword is refused', async () => {
  const r = await parseMermaid('sequenceDiagram\n  participant end as «value object»<br/>ResetLink\n  participant A\n  A->>end: 1.1 x');
  assert.equal(r.ok, false);
  assert.equal(r.line, 4);
});

// The command line, which /jois-code:archive uses to check a diagram before it shows a diff.
const cli = (args, input) =>
  spawnSync(process.execPath, [path.join(plan.dir, 'parse-mermaid.mjs'), ...args], { input, encoding: 'utf8' });

test('the command line parses every mermaid fence on standard input and exits 0', () => {
  const r = cli(['-'], '# Page\r\n\r\n```mermaid\r\n' + CLASS.replace(/\n/g, '\r\n') + '\r\n```\r\n\r\n```mermaid\r\n' + SEQUENCE + '\r\n```\r\n');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /diagram 1 \(from line 4\): ok/);
  assert.match(r.stdout, /2 diagrams, 0 failed/);
});

test('the command line exits 1 and names the broken diagram and its line', () => {
  const r = cli(['-'], '```mermaid\n' + CLASS + '\n```\n\n```mermaid\nsequenceDiagram\n  actor U\n  U->>>U: x\n```\n');
  assert.equal(r.status, 1);
  const secondDiagramLine = CLASS.split('\n').length + 5; // fence, diagram, fence, blank, fence, then the diagram
  assert.ok(r.stdout.includes(`diagram 2 (from line ${secondDiagramLine}): FAILED on its line 3`), r.stdout);
  assert.match(r.stdout, /2 diagrams, 1 failed/);
});

test('--bare reads the whole input as one diagram, from a file path too', () => {
  const file = path.join(plan.dir, 'bare.mmd');
  fs.writeFileSync(file, CLASS);
  const r = cli(['--bare', file]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /1 diagram, 0 failed/);
});

test('input with no fence is 0 diagrams and not a failure', () => {
  const r = cli(['-'], '# Page\n\nSome text that says git push and gh.\n');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0 diagrams, 0 failed/);
});

test('a fence left open or with text after mermaid is a failure, never 0 diagrams', () => {
  for (const text of ['```mermaid\n' + CLASS + '\n', '```mermaid title\n' + CLASS + '\n```\n']) {
    const r = cli(['-'], text);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /1 mermaid fence not parsed: FAILED/);
  }
});

test('indented, tilde and empty fences are found, and an indent is taken off', () => {
  const text = '- item\n\n  ```mermaid\n  ' + SEQUENCE.split('\n').join('\n  ') + '\n  ```\n\n~~~mermaid\n' + SEQUENCE + '\n~~~\n\n```mermaid\n```\n';
  const blocks = mermaidBlocks(text);
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].text, SEQUENCE);
  assert.equal(blocks[2].text, '');
  const r = cli(['-'], text.replace(/```mermaid\n```\n/, ''));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /2 diagrams, 0 failed/);
});

test('a script path in another case still runs on Windows, never a silent exit 0', { skip: process.platform !== 'win32' }, () => {
  const upper = path.join(plan.dir.toUpperCase(), 'PARSE-MERMAID.mjs');
  const r = spawnSync(process.execPath, [upper, '-'], { input: '```mermaid\n' + CLASS + '\n```\n', encoding: 'utf8' });
  assert.match(r.stdout, /1 diagram, 0 failed/, r.stdout + r.stderr);
});

test('the command line exits 2 with no argument or an unreadable file, and never passes silently', () => {
  const none = cli([]);
  assert.equal(none.status, 2);
  assert.match(none.stderr, /Usage/);
  const missing = cli([path.join(plan.dir, 'nope.md')]);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /Cannot read/);
});

test('without its packages the command line exits 2 and names the folder and the command', () => {
  const bare = planSkillCopy({ withPackages: false });
  const r = spawnSync(process.execPath, [path.join(bare.dir, 'parse-mermaid.mjs'), '-'], { input: CLASS, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /npm ci/);
});
