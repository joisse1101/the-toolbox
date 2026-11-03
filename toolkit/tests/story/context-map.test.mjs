import test from 'node:test';
import assert from 'node:assert/strict';
import { checkContextMap, compareContextMap, composeContextMap, epicNames } from '../../logic/diagrams/context-map.js';
import { parseMermaid } from '../../../.claude/skills/plan-stories/parse-mermaid.mjs';

const EPICS = ['Identity and access', 'Reporting', 'Billing'];
const TYPES = ['customer-supplier', 'anti-corruption-layer', 'shared-kernel', 'conformist', 'published-events'];
const OPTIONS = { epics: EPICS, relationshipTypes: TYPES };

const validMap = () => ({
  contexts: [
    { name: 'Accounts', purpose: 'Who a member is and how they sign in', owner: 'Platform team', epics: ['Identity and access'] },
    { name: 'Insight', purpose: 'Reports and money', owner: 'TBC', epics: ['Reporting', 'Billing'], reason: 'Both use "invoice line" with one meaning' },
  ],
  relationships: [{ from: 'Accounts', to: 'Insight', type: 'customer-supplier', crosses: 'Member id | name' }],
});
const check = (map) => checkContextMap(map, OPTIONS);
const mutate = (change) => {
  const map = validMap();
  change(map);
  return map;
};

test('a sound map has no problem', () => {
  assert.deepEqual(check(validMap()), []);
});

test('an Epic in no context is named', () => {
  const problems = check(mutate((m) => { m.contexts[1].epics = ['Reporting']; m.contexts[1].reason = ''; }));
  assert.deepEqual(problems, ['The Epic "Billing" is in no context.']);
});

test('an Epic in two contexts is named with both contexts', () => {
  const problems = check(mutate((m) => { m.contexts[0].epics.push('billing'); m.contexts[0].reason = 'x'; }));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /"Billing" is in two contexts/);
  assert.match(problems[0], /"Accounts".*"Insight"|"Insight".*"Accounts"/);
});

test('an Epic the backlog does not hold is named', () => {
  const problems = check(mutate((m) => { m.contexts[0].epics.push('Shipping'); m.contexts[0].reason = 'x'; }));
  assert.deepEqual(problems, ['The context "Accounts" lists the Epic "Shipping", which the backlog does not hold.']);
});

test('a merge without a reason names the context', () => {
  const problems = check(mutate((m) => { m.contexts[1].reason = '  '; }));
  assert.match(problems.join('\n'), /"Insight" holds 2 Epics and records no reason/);
});

test('an owner may be TBC but not empty', () => {
  assert.deepEqual(check(mutate((m) => { m.contexts[0].owner = 'TBC'; })), []);
  assert.match(check(mutate((m) => { m.contexts[0].owner = ''; })).join('\n'), /no owner/);
});

test('a relationship to an unknown context names it', () => {
  const problems = check(mutate((m) => { m.relationships[0].to = 'Shipping'; }));
  assert.match(problems.join('\n'), /names the context "Shipping"/);
});

test('a relationship from a context to itself is refused', () => {
  const problems = check(mutate((m) => { m.relationships[0].to = 'accounts'; }));
  assert.match(problems.join('\n'), /joins the context "Accounts" to itself/);
});

test('an unknown type is named and TBC is accepted', () => {
  assert.match(check(mutate((m) => { m.relationships[0].type = 'partnership'; })).join('\n'), /the type "partnership"/);
  assert.deepEqual(check(mutate((m) => { m.relationships[0].type = 'TBC'; m.relationships[0].crosses = 'TBC'; })), []);
});

test('the accepted types are the ones passed in', () => {
  const problems = checkContextMap(validMap(), { epics: EPICS, relationshipTypes: ['conformist'] });
  assert.match(problems.join('\n'), /"customer-supplier"/);
});

test('a duplicate context name is refused', () => {
  const problems = check(mutate((m) => { m.contexts[1].name = 'accounts'; }));
  assert.match(problems.join('\n'), /used twice/);
});

test('a map without a contexts list is refused', () => {
  assert.match(check({}).join('\n'), /no contexts list/);
});

test('epicNames keeps the first spelling of each Epic', () => {
  assert.deepEqual(epicNames([{ epic: 'A ' }, { epic: 'a' }, { epic: 'B' }, { epic: '' }]), ['A', 'B']);
});

test('compare reports an added Epic, a deleted Epic and a rename as one of each', () => {
  const map = validMap();
  assert.deepEqual(compareContextMap(map, [...EPICS, 'Shipping']), { missing: ['Shipping'], unknown: [] });
  assert.deepEqual(compareContextMap(map, ['Identity and access', 'Reporting']), { missing: [], unknown: ['Billing'] });
  assert.deepEqual(compareContextMap(map, ['Identity and access', 'Reporting', 'Invoicing']), { missing: ['Invoicing'], unknown: ['Billing'] });
  assert.deepEqual(compareContextMap(map, EPICS), { missing: [], unknown: [] });
});

test('the document holds every context and relationship in both tables and in the flowchart', () => {
  const map = validMap();
  const doc = composeContextMap(map);
  for (const c of map.contexts) {
    assert.match(doc, new RegExp(`\\| ${c.name} \\| ${c.owner} \\|`));
    assert.ok(doc.includes(`["${c.name}"]`), `flowchart lacks ${c.name}`);
    for (const epic of c.epics) assert.ok(doc.includes(`["${epic}"]`), `flowchart lacks ${epic}`);
  }
  assert.match(doc, /\| Accounts \| Insight \| customer-supplier \| Member id \\\| name \|/);
  assert.match(doc, /ctx1 -->\|"customer-supplier: Member id \| name"\| ctx2/);
});

test('the document is the same bytes for the same source', () => {
  assert.equal(composeContextMap(validMap()), composeContextMap(structuredClone(validMap())));
});

test('the flowchart of the document passes the Mermaid parser, also with quotes in a name', async () => {
  const map = mutate((m) => { m.contexts[0].name = 'Accounts "core"'; m.relationships[0].from = 'Accounts "core"'; });
  const doc = composeContextMap(map);
  const block = /```mermaid\n([\s\S]*?)```/.exec(doc)[1];
  assert.deepEqual(await parseMermaid(block), { ok: true });
});

test('a map without relationships says so and still has a flowchart', async () => {
  const doc = composeContextMap({ contexts: validMap().contexts, relationships: [] });
  assert.match(doc, /No relationships between the contexts are recorded\./);
  assert.deepEqual(await parseMermaid(/```mermaid\n([\s\S]*?)```/.exec(doc)[1]), { ok: true });
});
