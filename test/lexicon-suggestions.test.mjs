import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLexicon, findTerm, saveTerm } from '../core/lexicon.js';
import {
  applySuggestion, composeSuggestions, emptySuggestions, impactOf, openRows, parseSuggestions, staleReason, validateItems,
} from '../core/lexicon-suggestions.js';

const LEXICON = parseLexicon(
  'Term,Part of,Definition,Avoid,Notes\r\n' +
  'Role,,A set of privileges.,hat,\r\n' +
  'Data owner,,The person with the role of owning a dataset.,,\r\n' +
  'Data manager,,Manages data; see Role.,,\r\n' +
  'Dataset,,A table.,,\r\n' +
  'Dataset attribute,Dataset,A column.,,\r\n' +
  'Enrolled user,,Someone who enrolled.,,\r\n',
);
const rename = (over = {}) => ({ term: 'Role', action: 'rename', newName: 'Privilege', reason: 'Clearer', ...over });

test('parse and compose round trip, keeping unknown columns', () => {
  const text = 'Term,Action,New name,Add to Avoid,Reason,Status,Extra\r\nRole,rename,Privilege,role;job,Clearer,applied,x\r\n';
  const file = parseSuggestions(text);
  assert.deepEqual(file.rows[0].avoid, ['role', 'job']);
  assert.equal(file.rows[0].status, 'applied');
  file.rows[0].status = 'dismissed';
  const back = parseSuggestions(composeSuggestions(file));
  assert.equal(back.rows[0].status, 'dismissed');
  assert.equal(back.rows[0].cells[back.headers.indexOf('Extra')], 'x');
});

test('empty text, a bad Status and a bad Action', () => {
  assert.deepEqual(parseSuggestions('').rows, []);
  const file = parseSuggestions('Term,Action,Status\r\nRole,rename,maybe\r\nRole,merge,open\r\n');
  assert.equal(file.rows[0].status, 'open');
  assert.equal(file.skipped, 1);
  assert.equal(openRows(file).length, 1);
});

test('validateItems adds the old name to Avoid by default, and not with avoidOldName false', () => {
  const file = emptySuggestions();
  const r = validateItems(LEXICON, file, [rename({ avoid: ['function'] }), rename({ term: 'Dataset', newName: 'Table', avoidOldName: false })]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.rows.map((x) => x.avoid), [['Role', 'function'], []]);
  assert.ok(r.rows.every((x) => x.status === 'open'));
});

test('validateItems rejects each bad item and names it', () => {
  const file = parseSuggestions('Term,Action,New name,Add to Avoid,Reason,Status\r\nDataset,delete,,,Unused,open\r\n');
  const bad = (item, pattern) => {
    const r = validateItems(LEXICON, file, [rename(), item]);
    assert.equal(r.ok, false);
    assert.match(r.errors.join('\n'), new RegExp(`^item 2: .*${pattern}`));
    assert.equal(r.errors.length, 1, 'only the bad item is reported');
  };
  bad(rename({ term: 'Nope' }), 'not a term');
  bad(rename({ action: 'merge' }), 'action');
  bad(rename({ newName: '' }), 'needs a "newName"');
  bad(rename({ newName: 'Role' }), 'own name');
  bad(rename({ newName: 'data owner' }), 'already a term');
  bad(rename({ reason: ' ' }), 'reason');
  bad(rename({ extra: 1 }), 'unknown key');
  bad(rename({ avoid: ['Dataset'] }), 'it is a term');
  bad(rename({ newName: 'Dataset', term: 'Data owner' }), 'already a term');
  bad({ term: 'Role', action: 'delete', newName: 'x', reason: 'r' }, 'no "newName"');
  bad({ term: 'Role', action: 'delete', avoid: ['x'], reason: 'r' }, 'no Avoid');
  bad({ term: 'dataset', action: 'delete', reason: 'r' }, 'open delete of "Dataset" already exists');
  assert.equal(validateItems(LEXICON, file, 'x').ok, false);
});

test('validateItems rejects a second open suggestion for the same term and action, also inside one batch', () => {
  const r = validateItems(LEXICON, emptySuggestions(), [rename(), rename({ newName: 'Other' })]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /^item 2: an open rename of "Role" already exists/);
  const dismissed = parseSuggestions('Term,Action,New name,Add to Avoid,Reason,Status\r\nRole,rename,X,,r,dismissed\r\n');
  assert.equal(validateItems(LEXICON, dismissed, [rename()]).ok, true);
});

test('impactOf lists children, wording that uses the name, and Avoid holders', () => {
  const role = impactOf(LEXICON, 'Role', 'rename', 'Privilege');
  assert.deepEqual(role.mentionedBy, ['Data owner', 'Data manager']);
  assert.deepEqual(role.children, []);
  assert.equal(role.newNameTaken, false);
  const dataset = impactOf(LEXICON, 'Dataset', 'delete');
  assert.deepEqual(dataset.blockedBy, ['Dataset attribute']);
  assert.deepEqual(impactOf(LEXICON, 'Role', 'rename', 'Data owner').newNameTaken, true);
  assert.equal(impactOf(LEXICON, 'Nope', 'delete').found, false);
  const avoided = parseLexicon('Term,Definition,Avoid\r\nUser,A person.,member\r\nMember,A seat.,\r\n');
  assert.deepEqual(impactOf(avoided, 'Member', 'rename', 'Seat').avoidedBy, ['User']);
});

test('impactOf matches whole words only', () => {
  assert.ok(!impactOf(LEXICON, 'Role', 'delete').mentionedBy.includes('Enrolled user'));
});

test('staleReason: term gone, name taken, fine', () => {
  const row = { term: 'Role', action: 'rename', newName: 'Privilege', avoid: [], status: 'open' };
  assert.equal(staleReason(LEXICON, row), null);
  assert.equal(staleReason(LEXICON, { ...row, term: 'Gone' }), 'term no longer exists');
  const taken = saveTerm(LEXICON, { name: 'privilege', definition: 'x', avoid: [], notes: '', partOf: '' }).lexicon;
  assert.match(staleReason(taken, row), /another term/);
  assert.equal(staleReason(taken, { ...row, action: 'delete' }), null);
});

test('applySuggestion: a rename accepts the Avoid word that names the term before it, and children follow', () => {
  const withChild = parseLexicon('Term,Part of,Definition,Avoid\r\nRole,,A set.,\r\nAdmin role,Role,Can do all.,\r\n');
  // the same word is refused when patched while the term still exists
  assert.equal(saveTerm(withChild, { ...findTerm(withChild, 'Role'), avoid: ['Role'] }).ok, false);
  const row = { term: 'Role', action: 'rename', newName: 'Privilege', avoid: ['Role'], status: 'open' };
  const r = applySuggestion(withChild, row);
  assert.equal(r.ok, true, r.errors?.join());
  assert.deepEqual(r.lexicon.terms.map((t) => [t.name, t.partOf]), [['Privilege', ''], ['Admin role', 'Privilege']]);
  assert.deepEqual(findTerm(r.lexicon, 'Privilege').avoid, ['Role']);
  assert.equal(findTerm(withChild, 'Role').name, 'Role', 'the input is unchanged');
});

test('applySuggestion with some Avoid words unchecked', () => {
  const row = { term: 'Role', action: 'rename', newName: 'Privilege', avoid: ['Role', 'job'], status: 'open' };
  const r = applySuggestion(LEXICON, row, { avoid: ['job'] });
  assert.deepEqual(findTerm(r.lexicon, 'Privilege').avoid, ['hat', 'job']);
});

test('applySuggestion: a delete is refused while the term has children, and works without', () => {
  const refused = applySuggestion(LEXICON, { term: 'Dataset', action: 'delete', newName: '', avoid: [], status: 'open' });
  assert.equal(refused.ok, false);
  assert.match(refused.errors[0], /"Dataset attribute" is part of it/);
  const done = applySuggestion(LEXICON, { term: 'Enrolled user', action: 'delete', newName: '', avoid: [], status: 'open' });
  assert.equal(done.ok, true);
  assert.equal(findTerm(done.lexicon, 'Enrolled user'), null);
  assert.equal(applySuggestion(LEXICON, { term: 'Gone', action: 'delete', avoid: [], status: 'open' }).ok, false);
});

test('an old problem in the lexicon does not block applying an unrelated suggestion', () => {
  const broken = parseLexicon('Term,Part of,Definition,Avoid\r\nRole,,A set.,\r\nOrphan,Nowhere,Lost.,\r\nTemp,,Gone soon.,\r\n');
  const r = applySuggestion(broken, { term: 'Temp', action: 'delete', avoid: [], status: 'open' });
  assert.equal(r.ok, true);
  const renamed = applySuggestion(broken, { term: 'Role', action: 'rename', newName: 'Privilege', avoid: ['Role'], status: 'open' });
  assert.equal(renamed.ok, true);
});
