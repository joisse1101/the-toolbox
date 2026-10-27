import test from 'node:test';
import assert from 'node:assert/strict';
import { groupByEpic } from '../../logic/backlog/model.js';
import { allKeys, anyOpen, epicKey, featureKey, levelKeys, parseClosed, pruneClosed, reveal, serializeClosed, toggleLevel } from '../../portal/web/lib/collapse.js';

const story = (epic, feature) => ({ epic, feature });
const groups = groupByEpic([
  story('Billing', 'Pay'), story('Billing', 'Refund'), story('Onboarding', 'Signup'), story('', ''),
]);
const set = (...keys) => new Set(keys);

test('keys name groups by epic and feature, blank included', () => {
  assert.deepEqual(levelKeys(groups, 'epic'), ['e:Billing', 'e:Onboarding', 'e:']);
  assert.deepEqual(levelKeys(groups, 'feature'), ['f:Billing\nPay', 'f:Billing\nRefund', 'f:Onboarding\nSignup', 'f:\n']);
  assert.equal(allKeys(groups).size, 7);
});

test('a group the set has never seen is open', () => {
  assert.equal(anyOpen(set(), groups, 'epic'), true);
});

test('toggleLevel on epics closes all of them and leaves the features alone', () => {
  const closed = toggleLevel(set(featureKey('Billing', 'Pay')), groups, 'epic');
  assert.deepEqual(levelKeys(groups, 'epic').every((key) => closed.has(key)), true);
  assert.equal(closed.has(featureKey('Billing', 'Pay')), true);
  assert.equal(closed.has(featureKey('Billing', 'Refund')), false);
});

test('toggleLevel on features closes all of them and leaves the epics open', () => {
  const closed = toggleLevel(set(), groups, 'feature');
  assert.deepEqual(levelKeys(groups, 'feature').every((key) => closed.has(key)), true);
  assert.equal(levelKeys(groups, 'epic').some((key) => closed.has(key)), false);
});

test('toggleLevel opens every group of the level once all are closed', () => {
  const allClosed = toggleLevel(set(), groups, 'epic');
  assert.equal(anyOpen(allClosed, groups, 'epic'), false);
  assert.equal(toggleLevel(allClosed, groups, 'epic').size, 0);
});

test('the label rule counts an open feature inside a collapsed epic', () => {
  const closed = set(epicKey('Billing'), featureKey('Billing', 'Refund'), featureKey('Onboarding', 'Signup'), featureKey('', ''));
  assert.equal(anyOpen(closed, groups, 'feature'), true); // Billing > Pay is open though hidden
  assert.equal(toggleLevel(closed, groups, 'feature').has(featureKey('Billing', 'Pay')), true);
});

test('the levels are independent: expanding one epic shows its features as they were', () => {
  const featuresShut = toggleLevel(set(), groups, 'feature');
  const epicsShut = toggleLevel(featuresShut, groups, 'epic');
  const billingOpen = reveal(epicsShut, 'Billing', 'Zzz'); // epic key only: no such feature key
  assert.equal(billingOpen.has(epicKey('Billing')), false);
  assert.equal(billingOpen.has(featureKey('Billing', 'Pay')), true);
  assert.equal(billingOpen.has(epicKey('Onboarding')), true);
});

test('reveal opens one feature and its epic and leaves every other group alone', () => {
  const closed = set(epicKey('Billing'), featureKey('Billing', 'Pay'), featureKey('Billing', 'Refund'), epicKey('Onboarding'));
  const next = reveal(closed, 'Billing', 'Pay');
  assert.deepEqual([...next].sort(), [epicKey('Onboarding'), featureKey('Billing', 'Refund')].sort());
  assert.deepEqual([...closed].length, 4); // the argument is not changed
});

test('reveal trims names the way groupByEpic does', () => {
  assert.equal(reveal(set(featureKey('Billing', 'Pay')), '  Billing ', ' Pay ').size, 0);
});

test('reveal of the blank epic and feature', () => {
  assert.equal(reveal(set(epicKey(''), featureKey('', '')), undefined, null).size, 0);
});

test('reveal returns the same set when both are open already', () => {
  const closed = set(epicKey('Onboarding'));
  assert.equal(reveal(closed, 'Billing', 'Pay'), closed);
});

test('pruneClosed forgets a deleted feature', () => {
  const closed = set(featureKey('Billing', 'Pay'), featureKey('Billing', 'Gone'));
  assert.deepEqual([...pruneClosed(closed, groups)], [featureKey('Billing', 'Pay')]);
});

test('pruneClosed forgets a deleted epic with its features', () => {
  const closed = set(epicKey('Gone'), featureKey('Gone', 'Pay'), epicKey('Billing'));
  assert.deepEqual([...pruneClosed(closed, groups)], [epicKey('Billing')]);
});

test('pruneClosed returns the same set when nothing is stale', () => {
  const closed = set(epicKey('Billing'), featureKey('Billing', 'Pay'));
  assert.equal(pruneClosed(closed, groups), closed);
});

test('pruneClosed on an empty backlog drops every key', () => {
  assert.equal(pruneClosed(set(epicKey('Billing'), featureKey('Billing', 'Pay')), []).size, 0);
});

test('parseClosed reads what serializeClosed wrote', () => {
  const closed = set(epicKey('Billing'), featureKey('Billing', 'Pay'));
  assert.deepEqual(parseClosed(serializeClosed(closed)), closed);
});

test('parseClosed gives an empty set for missing or corrupt text', () => {
  assert.equal(parseClosed(null).size, 0);
  assert.equal(parseClosed('').size, 0);
  assert.equal(parseClosed('{not json').size, 0);
  assert.equal(parseClosed('{"a":1}').size, 0);
});

test('parseClosed keeps only the strings of a stored list', () => {
  assert.deepEqual([...parseClosed('["e:Billing", 3, null]')], ['e:Billing']);
});
