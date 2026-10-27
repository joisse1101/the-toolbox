import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLexicon, findTerm, saveTerm } from '../../logic/lexicon.js';
import {
  applySuggestion, composeSuggestions, emptySuggestions, impactOf, openRows, parseSuggestions, staleReason, validateItems,
} from '../../logic/lexicon-suggestions.js';

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

const editItem = (over = {}) => ({ term: 'Role', action: 'edit', reason: 'Agreed', ...over });

test('validateItems builds an edit with the old and new value of each named field', () => {
  const r = validateItems(LEXICON, emptySuggestions(), [editItem({ avoid: ['hat', 'cap'], notes: ' n ' })]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.rows[0].edit, { avoid: { from: ['hat'], to: ['hat', 'cap'] }, notes: { from: '', to: 'n' } });
  assert.equal(r.rows[0].action, 'edit');
});

test('validateItems rejects a bad edit and names the item', () => {
  const bad = (item) => validateItems(LEXICON, emptySuggestions(), [item]).errors?.[0];
  assert.match(bad(editItem()), /^item 1: an edit must name at least one of/);
  assert.match(bad(editItem({ definition: 'A set of privileges.' })), /^item 1: "definition" is already that value/);
  assert.match(bad(editItem({ avoid: ['hat'] })), /"avoid" is already that list/);
  assert.match(bad(editItem({ newName: 'X', notes: 'n' })), /takes no "newName"/);
  assert.match(bad(editItem({ avoidOldName: false, notes: 'n' })), /takes no "newName" or "avoidOldName"/);
  assert.match(bad(editItem({ notes: 1 })), /"notes" must be text/);
  assert.match(bad(rename({ notes: 'n' })), /a rename takes no "definition", "notes" or "partOf"/);
  assert.match(bad(editItem({ avoid: ['dataset'] })), /"Role" avoids "dataset", which is a defined term/);
  assert.match(bad(editItem({ partOf: 'Nope' })), /is part of "Nope", which is not a term/);
  assert.match(bad(editItem({ definition: ' ' })), /has no definition/);
});

test('an edit and a rename of one term may both be open, a second edit may not', () => {
  const file = emptySuggestions();
  const first = validateItems(LEXICON, file, [rename(), editItem({ notes: 'n' })]);
  assert.equal(first.ok, true);
  file.rows = first.rows;
  assert.match(validateItems(LEXICON, file, [editItem({ notes: 'm' })]).errors[0], /an open edit of "Role" already exists/);
});

test('an edit round trips through the file, and a bad Edit cell is skipped but kept', () => {
  const file = emptySuggestions();
  file.rows = validateItems(LEXICON, file, [editItem({ avoid: ['cap'] })]).rows;
  const back = parseSuggestions(composeSuggestions(file));
  assert.deepEqual(back.rows[0].edit, { avoid: { from: ['hat'], to: ['cap'] } });
  assert.equal(openRows(back).length, 1);
  const bad = parseSuggestions('Term,Action,Reason,Status,Edit\r\nRole,edit,r,open,not json\r\n');
  assert.deepEqual([bad.skipped, openRows(bad).length], [1, 0]);
  assert.match(composeSuggestions(bad), /Role,edit,r,open,not json,,/);
});

test('staleReason: an edit is stale once a field it names differs from the old value', () => {
  const file = emptySuggestions();
  file.rows = validateItems(LEXICON, file, [editItem({ avoid: ['hat', 'cap'] })]).rows;
  const row = file.rows[0];
  assert.equal(staleReason(LEXICON, row), null);
  const changed = saveTerm(LEXICON, { ...findTerm(LEXICON, 'Role'), avoid: ['hat', 'bowler'] }, { replaces: 'Role' }).lexicon;
  assert.match(staleReason(changed, row), /^Avoid of "Role" changed after this was suggested/);
  const other = saveTerm(LEXICON, { ...findTerm(LEXICON, 'Role'), notes: 'x' }, { replaces: 'Role' }).lexicon;
  assert.equal(staleReason(other, row), null, 'a field the edit does not name may change');
  assert.equal(staleReason(parseLexicon('Term,Definition\r\nX,y\r\n'), row), 'term no longer exists');
});

test('applySuggestion applies an edit to the named fields only', () => {
  const file = emptySuggestions();
  file.rows = validateItems(LEXICON, file, [editItem({ avoid: ['cap'], partOf: 'Dataset' })]).rows;
  const r = applySuggestion(LEXICON, file.rows[0]);
  assert.equal(r.ok, true);
  const role = findTerm(r.lexicon, 'Role');
  assert.deepEqual([role.avoid, role.partOf, role.definition], [['cap'], 'Dataset', 'A set of privileges.']);
  assert.equal(r.lexicon.terms.indexOf(role), 0);
});

test('applySuggestion refuses an edit a rule broke since it was suggested', () => {
  const file = emptySuggestions();
  file.rows = validateItems(LEXICON, file, [editItem({ avoid: ['hat', 'sheet'] })]).rows;
  const later = saveTerm(LEXICON, { name: 'Sheet', definition: 'x' }).lexicon;
  const r = applySuggestion(later, file.rows[0]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /"Role" avoids "sheet", which is a defined term/);
});

test('impactOf for an edit lists the fields it changes', () => {
  assert.deepEqual(impactOf(LEXICON, 'Role', 'edit', '', { notes: { from: '', to: 'n' } }),
    { found: true, children: [], mentionedBy: [], avoidedBy: [], fields: ['notes'] });
});
