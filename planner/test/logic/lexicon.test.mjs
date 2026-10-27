import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLexicon, composeLexicon, lexiconProblems, saveTerm, renameTerm, deleteTerm, applyTermItems, emptyLexicon,
} from '../../logic/lexicon/lexicon.js';

const CANONICAL = [
  'Term,Part of,Definition,Avoid,Notes',
  'Dataset,,"A named, uploaded table of rows the user can query.",file;sheet;table,',
  'Dataset attribute,Dataset,"A named, typed column of a dataset.",field;column,',
  'User,,A person with a login.,customer;member,Admins are a separate term.',
  '',
].join('\r\n');
const BOM = '﻿';

const names = (lex) => lex.terms.map((t) => t.name);
const sample = () => parseLexicon(CANONICAL);

test('parse reads the columns of each row', () => {
  const lex = sample();
  assert.deepEqual(names(lex), ['Dataset', 'Dataset attribute', 'User']);
  const attr = lex.terms[1];
  assert.equal(attr.partOf, 'Dataset');
  assert.equal(attr.definition, 'A named, typed column of a dataset.');
  assert.deepEqual(attr.avoid, ['field', 'column']);
  assert.equal(lex.terms[2].notes, 'Admins are a separate term.');
});

test('a canonical file round-trips byte for byte, with or without a BOM', () => {
  assert.equal(composeLexicon(parseLexicon(CANONICAL)), CANONICAL);
  assert.equal(composeLexicon(parseLexicon(BOM + CANONICAL)), BOM + CANONICAL);
});

test('a missing or empty file is an empty lexicon with the default columns', () => {
  assert.deepEqual(parseLexicon(''), emptyLexicon());
  assert.deepEqual(parseLexicon(undefined), emptyLexicon());
  assert.equal(composeLexicon(emptyLexicon()), `${BOM}Term,Part of,Definition,Avoid,Notes\r\n`);
  assert.deepEqual(parseLexicon('Term,Part of,Definition,Avoid,Notes\r\n').terms, []);
});

test('headers are matched ignoring case, in any order', () => {
  const lex = parseLexicon('definition,TERM,avoid,part of,notes\r\nA person.,User,customer;member,,\r\n');
  assert.deepEqual(lex.terms[0].avoid, ['customer', 'member']);
  assert.equal(lex.terms[0].name, 'User');
  assert.equal(lex.terms[0].definition, 'A person.');
});

test('an unknown column and its cells survive an edit; missing known columns are added', () => {
  const lex = parseLexicon('Term,Owner,Definition\r\nUser,Ana,A person.\r\nRole,Bo,A set of permissions.\r\n');
  assert.deepEqual(lex.headers, ['Term', 'Owner', 'Definition', 'Part of', 'Avoid', 'Notes']);
  const r = saveTerm(lex, { ...lex.terms[0], definition: 'A person with a login.' }, { replaces: 'User' });
  assert.equal(
    composeLexicon(r.lexicon),
    'Term,Owner,Definition,Part of,Avoid,Notes\r\nUser,Ana,A person with a login.,,,\r\nRole,Bo,A set of permissions.,,,\r\n',
  );
});

test('a definition and notes may span lines', () => {
  const text = `${BOM}Term,Definition,Notes\r\nDataset,"First line.\nSecond line.\n\nThird after a blank.","One\nTwo"\r\n`;
  const lex = parseLexicon(text);
  assert.equal(lex.hasBom, true);
  assert.equal(lex.terms[0].definition, 'First line.\nSecond line.\n\nThird after a blank.');
  assert.equal(lex.terms[0].notes, 'One\nTwo');
  assert.ok(composeLexicon(lex).includes('"First line.\nSecond line.\n\nThird after a blank."'));
});

test('blank rows are skipped and short rows are padded', () => {
  const lex = parseLexicon('Term,Definition,Notes\r\n\r\nUser,A person.\r\n,,\r\n');
  assert.deepEqual(names(lex), ['User']);
  assert.equal(lex.terms[0].notes, '');
});

// ---- rules

test('duplicate name, ignoring case, is refused', () => {
  const r = saveTerm(sample(), { name: 'user', definition: 'x' });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /already exists/);
});

test('a term needs a definition', () => {
  const r = saveTerm(sample(), { name: 'Role', definition: '  ' });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /no definition/);
});

test('Part of must name an existing term, not itself, no cycle', () => {
  const missing = saveTerm(emptyLexicon(), { name: 'Dataset attribute', definition: 'd', partOf: 'Dataset' });
  assert.equal(missing.ok, false);
  assert.match(missing.errors[0], /"Dataset", which is not a term/);

  const self = saveTerm(sample(), { name: 'Role', definition: 'd', partOf: 'role' });
  assert.match(self.errors[0], /part of itself/);

  const cycle = saveTerm(sample(), { ...sample().terms[0], partOf: 'Dataset attribute' }, { replaces: 'Dataset' });
  assert.equal(cycle.ok, false);
  assert.match(cycle.errors[0], /cycle/);
});

test('an Avoid word may not be the name of a term', () => {
  const adding = saveTerm(sample(), { name: 'Customer', definition: 'A buyer.' });
  assert.equal(adding.ok, false, 'User already avoids "customer"');
  assert.match(adding.errors[0], /"User" avoids "customer", which is a defined term/);
  const editing = saveTerm(sample(), { ...sample().terms[2], avoid: ['customer', 'dataset'] }, { replaces: 'User' });
  assert.equal(editing.ok, false);
  assert.match(editing.errors[0], /"dataset", which is a defined term/);
  const fine = saveTerm(sample(), { ...sample().terms[2], avoid: ['customer', 'client'] }, { replaces: 'User' });
  assert.equal(fine.ok, true);
});

test('delete is refused while a term is part of it, and names the children', () => {
  const r = deleteTerm(sample(), 'Dataset');
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /"Dataset attribute" is part of it/);
  const ok = deleteTerm(sample(), 'Dataset attribute');
  assert.equal(ok.ok, true);
  assert.deepEqual(names(ok.lexicon), ['Dataset', 'User']);
});

test('rename updates the Part of of children and nothing else', () => {
  const before = sample();
  const r = renameTerm(before, 'Dataset', 'Data set');
  assert.equal(r.ok, true);
  assert.equal(r.lexicon.terms[1].partOf, 'Data set');
  assert.equal(
    composeLexicon(r.lexicon),
    CANONICAL.replace('\r\nDataset,', '\r\nData set,').replace('\r\nDataset attribute,Dataset,', '\r\nDataset attribute,Data set,'),
  );
  assert.equal(before.terms[0].name, 'Dataset', 'the input is not changed');
});

test('editing a term keeps its position and its other cells', () => {
  const lex = parseLexicon('Term,Owner,Definition\r\nA,x,a\r\nB,y,b\r\n');
  const r = saveTerm(lex, { ...lex.terms[0], definition: 'changed' }, { replaces: 'A' });
  assert.deepEqual(r.lexicon.terms.map((t) => [t.name, t.cells[1], t.definition]), [['A', 'x', 'changed'], ['B', 'y', 'b']]);
});

test('an old problem in a hand-written file does not block an unrelated save', () => {
  const lex = parseLexicon('Term,Part of,Definition\r\nA,Missing,a\r\n');
  assert.equal(lexiconProblems(lex).length, 1);
  const r = saveTerm(lex, { name: 'B', definition: 'b' });
  assert.equal(r.ok, true);
});

// ---- the writer's input

test('applyTermItems adds a parent and a child defined in the same input', () => {
  const r = applyTermItems(emptyLexicon(), [
    { term: 'Dataset', definition: 'A table.' },
    { term: 'Dataset attribute', definition: 'A column.', partOf: 'Dataset', avoid: ['field'] },
  ]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.added, ['Dataset', 'Dataset attribute']);
  assert.deepEqual(names(r.lexicon), ['Dataset', 'Dataset attribute']);
});

test('applyTermItems refuses a term that exists and points to the suggestion tool', () => {
  const before = composeLexicon(sample());
  const lex = sample();
  const r = applyTermItems(lex, [{ term: 'user', definition: 'x', avoid: ['customer', 'account holder'] }]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /^item 1: "user" is already a term: suggest a change to it with suggest_lexicon_change/);
  assert.equal(composeLexicon(lex), before);
});

test('applyTermItems refuses a name an earlier item of the same list added', () => {
  const r = applyTermItems(sample(), [{ term: 'Role', definition: 'a' }, { term: 'ROLE', definition: 'b' }]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /^item 2: "ROLE" is already a term/);
});

test('applyTermItems adds a child under a parent that is already a term', () => {
  const r = applyTermItems(sample(), [{ term: 'Dataset owner', definition: 'Who owns it.', partOf: 'Dataset' }]);
  assert.equal(r.ok, true);
  assert.deepEqual(names(r.lexicon), ['Dataset', 'Dataset attribute', 'User', 'Dataset owner']);
  assert.equal(composeLexicon(r.lexicon).startsWith(CANONICAL.trimEnd()), true, 'existing rows unchanged');
});

test('applyTermItems keeps unknown columns', () => {
  const lex = parseLexicon('Term,Owner,Definition\r\nUser,Ana,A person.\r\n');
  const r = applyTermItems(lex, [{ term: 'Role', definition: 'Permissions.' }]);
  assert.equal(r.ok, true);
  assert.equal(r.lexicon.terms[0].cells[1], 'Ana');
  assert.equal(composeLexicon(r.lexicon).split('\r\n')[1], 'User,Ana,A person.,,,');
});

test('applyTermItems reports every problem, each naming its item, and changes nothing', () => {
  const before = composeLexicon(sample());
  const lex = sample();
  const r = applyTermItems(lex, [
    { term: 'Role' },
    { term: 'Permission', definition: 'd', partOf: 'Nope' },
    { term: 'User', synonym: 'x' },
  ]);
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 3);
  assert.match(r.errors[0], /^item 1: new term "Role" needs a definition/);
  assert.match(r.errors[1], /^item 3: unknown key "synonym"/);
  assert.match(r.errors[2], /^item 2: "Permission" is part of "Nope"/);
  assert.equal(composeLexicon(lex), before);
});

test('applyTermItems applies the term rules to the whole result', () => {
  const r = applyTermItems(sample(), [{ term: 'Client', definition: 'x', avoid: ['user'] }]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /^item 1: "Client" avoids "user"/);
  const sibling = applyTermItems(sample(), [{ term: 'Member', definition: 'x' }]);
  assert.match(sibling.errors[0], /^"User" avoids "member"/, 'a problem in an untouched term has no item number');
});

test('applyTermItems rejects bad shapes', () => {
  assert.equal(applyTermItems(sample(), {}).ok, false);
  assert.match(applyTermItems(sample(), [null]).errors[0], /item 1: must be an object/);
  assert.match(applyTermItems(sample(), [{ definition: 'x' }]).errors[0], /needs a "term"/);
  assert.match(applyTermItems(sample(), [{ term: 'A', definition: 1 }]).errors[0], /"definition" must be text/);
  assert.match(applyTermItems(sample(), [{ term: 'A', definition: 'x', avoid: 'a' }]).errors[0], /"avoid" must be a list/);
});
