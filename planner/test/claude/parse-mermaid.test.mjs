import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMermaid } from '../../../.claude/skills/plan-stories/parse-mermaid.mjs';

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
  rect rgba(128, 128, 128, 0.15)
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
  const r = await parseMermaid('sequenceDiagram\n  participant LINK as «value object»<br/>ResetLink\n  participant A\n  A->>LINK: 1.1 x');
  assert.equal(r.ok, false);
});
