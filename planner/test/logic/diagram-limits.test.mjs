import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseLimits, layerForStereotype } from '../../logic/diagrams/limits.js';

const CONVENTIONS = new URL('../../guidelines/diagram-conventions.md', import.meta.url);
const withBlock = (json) => `# Conventions\n\n\`\`\`diagram-limits\n${json}\n\`\`\`\n`;

test('the committed conventions file holds a valid block without a palette', () => {
  const limits = parseLimits(fs.readFileSync(CONVENTIONS, 'utf8'));
  assert.equal(limits.maxClasses, 12);
  assert.equal(layerForStereotype(limits, 'Boundary'), 'boundary');
  assert.equal(layerForStereotype(limits, 'value object'), 'domain');
  assert.equal(layerForStereotype(limits, 'unknown'), undefined);
  assert.equal('palette' in limits, false);
});

test('a value changed in the file changes the result', () => {
  const changed = fs.readFileSync(CONVENTIONS, 'utf8').replace('"maxClasses": 12', '"maxClasses": 7');
  assert.equal(parseLimits(changed).maxClasses, 7);
});

test('the relationship types come from the block and a change in the file changes them', () => {
  const text = fs.readFileSync(CONVENTIONS, 'utf8');
  assert.deepEqual(parseLimits(text).relationshipTypes, ['customer-supplier', 'anti-corruption-layer', 'shared-kernel', 'conformist', 'published-events']);
  assert.equal(parseLimits(text.replace('"conformist",', '')).relationshipTypes.includes('conformist'), false);
});

test('a palette key is ignored', () => {
  const limits = parseLimits(withBlock('{"maxClasses": 3, "palette": {"a": "blue"}, "stereotypes": {"x": "a"}, "relationshipTypes": ["t"]}'));
  assert.deepEqual(limits, { maxClasses: 3, stereotypes: { x: 'a' }, relationshipTypes: ['t'] });
});

test('a missing block is refused', () => {
  assert.throws(() => parseLimits('# nothing here'), /no diagram-limits block/);
});

test('bad JSON, a bad limit and a bad stereotype each fail naming the key', () => {
  assert.throws(() => parseLimits(withBlock('{ nope')), /not valid JSON/);
  assert.throws(() => parseLimits(withBlock('{"maxClasses": 0, "stereotypes": {}}')), /"maxClasses"/);
  assert.throws(() => parseLimits(withBlock('{"maxClasses": 3}')), /"stereotypes"/);
  assert.throws(() => parseLimits(withBlock('{"maxClasses": 3, "stereotypes": {}}')), /"relationshipTypes"/);
  assert.throws(() => parseLimits(withBlock('{"maxClasses": 3, "stereotypes": {}, "relationshipTypes": [""]}')), /"relationshipTypes\[0\]"/);
  assert.throws(() => parseLimits(withBlock('{"maxClasses": 3, "stereotypes": {"x": ""}}')), /"stereotypes\.x"/);
});
