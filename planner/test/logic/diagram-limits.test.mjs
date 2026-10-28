import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseLimits, colorForStereotype } from '../../logic/diagrams/limits.js';

const CONVENTIONS = new URL('../../guidelines/diagram-conventions.md', import.meta.url);
const withBlock = (json) => `# Conventions\n\n\`\`\`diagram-limits\n${json}\n\`\`\`\n`;

test('the committed conventions file holds a valid block', () => {
  const limits = parseLimits(fs.readFileSync(CONVENTIONS, 'utf8'));
  assert.equal(limits.maxClasses, 12);
  assert.equal(colorForStereotype(limits, 'Boundary'), '#E6F0FB');
  assert.equal(colorForStereotype(limits, 'value object'), '#FBF2D9');
  assert.equal(colorForStereotype(limits, 'unknown'), undefined);
});

test('a value changed in the file changes the result', () => {
  const text = fs.readFileSync(CONVENTIONS, 'utf8');
  const changed = text.replace('"maxClasses": 12', '"maxClasses": 7').replace('#E6F0FB', '#00FF00');
  const limits = parseLimits(changed);
  assert.equal(limits.maxClasses, 7);
  assert.equal(colorForStereotype(limits, 'boundary'), '#00FF00');
});

test('a missing block is refused', () => {
  assert.throws(() => parseLimits('# nothing here'), /no diagram-limits block/);
});

test('bad JSON, a bad limit, a bad color and an unknown role each fail naming the key', () => {
  assert.throws(() => parseLimits(withBlock('{ nope')), /not valid JSON/);
  assert.throws(() => parseLimits(withBlock('{"maxClasses": 0, "palette": {}, "stereotypes": {}}')), /"maxClasses"/);
  assert.throws(() => parseLimits(withBlock('{"maxClasses": 3, "palette": {"a": "blue"}, "stereotypes": {}}')), /"palette\.a"/);
  assert.throws(() => parseLimits(withBlock('{"maxClasses": 3, "palette": {"a": "#AAAAAA"}, "stereotypes": {"x": "b"}}')), /"stereotypes\.x"/);
});
