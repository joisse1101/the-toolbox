import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLexicon, composeLexicon, lexiconFileName, lexiconProblems, saveTerm, renameTerm, deleteTerm, applyTermItems, emptyLexicon,
} from '../core/lexicon.js';

const CANONICAL = `## Dataset
Definition: A named, uploaded table of rows the user can query.
Avoid: file, sheet, table

## Dataset attribute
Part of: Dataset
Definition: A named, typed column of a dataset.
Avoid: field, column

## User
Definition: A person with a login.
Avoid: customer, member
Notes: Admins are a separate term.
`;

const names = (lex) => lex.terms.map((t) => t.name);
const sample = () => parseLexicon(CANONICAL);

test('file name: backlog name without .csv plus .md', () => {
  assert.equal(lexiconFileName('IAM.csv'), 'IAM.md');
  assert.equal(lexiconFileName('Data Portal.CSV'), 'Data Portal.md');
});

test('parse reads the fields of each entry', () => {
  const lex = sample();
  assert.deepEqual(names(lex), ['Dataset', 'Dataset attribute', 'User']);
  const attr = lex.terms[1];
  assert.equal(attr.partOf, 'Dataset');
  assert.equal(attr.definition, 'A named, typed column of a dataset.');
  assert.deepEqual(attr.avoid, ['field', 'column']);
  assert.equal(lex.terms[2].notes, 'Admins are a separate term.');
});

test('a canonical file round-trips byte for byte', () => {
  assert.equal(composeLexicon(parseLexicon(CANONICAL)), CANONICAL);
});

test('a missing or empty file is an empty lexicon', () => {
  assert.deepEqual(parseLexicon(''), emptyLexicon());
  assert.deepEqual(parseLexicon(undefined), emptyLexicon());
  assert.equal(composeLexicon(emptyLexicon()), '');
});

test('preamble and unknown label lines are kept', () => {
  const text = '# My lexicon\n\nSee the guideline.\n\n## User\nDefinition: A person.\nExample: Ana\nsome stray line\n';
  const lex = parseLexicon(text);
  assert.equal(lex.preamble, '# My lexicon\n\nSee the guideline.');
  assert.deepEqual(lex.terms[0].extra, ['Example: Ana', 'some stray line']);
  assert.equal(composeLexicon(lex), text);
});

test('a definition and notes may span lines, with CRLF and a BOM', () => {
  const text = '﻿## Dataset\r\nDefinition: First line.\r\nSecond line.\r\n\r\nThird after a blank.\r\nNotes: One\r\nTwo\r\n';
  const lex = parseLexicon(text);
  assert.equal(lex.terms[0].definition, 'First line.\nSecond line.\n\nThird after a blank.');
  assert.equal(lex.terms[0].notes, 'One\nTwo');
  assert.equal(composeLexicon(lex), '## Dataset\nDefinition: First line.\nSecond line.\n\nThird after a blank.\nNotes: One\nTwo\n');
});

test('a field given twice keeps the second as raw text; labels are case-insensitive', () => {
  const lex = parseLexicon('## A\ndefinition: one\nDEFINITION: two\n');
  assert.equal(lex.terms[0].definition, 'one');
  assert.deepEqual(lex.terms[0].extra, ['DEFINITION: two']);
});

test('compose normalises field order', () => {
  const lex = parseLexicon('## A\nAvoid: x\nDefinition: d\nPart of: B\n\n## B\nDefinition: b\n');
  assert.equal(composeLexicon(lex), '## A\nPart of: B\nDefinition: d\nAvoid: x\n\n## B\nDefinition: b\n');
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
  assert.equal(composeLexicon(r.lexicon), CANONICAL.replace('## Dataset\n', '## Data set\n').replace('Part of: Dataset', 'Part of: Data set'));
  assert.equal(before.terms[0].name, 'Dataset', 'the input is not changed');
});

test('editing a term keeps its position and unknown lines', () => {
  const lex = parseLexicon('## A\nDefinition: a\nExample: kept\n\n## B\nDefinition: b\n');
  const r = saveTerm(lex, { ...lex.terms[0], definition: 'changed' }, { replaces: 'A' });
  assert.equal(composeLexicon(r.lexicon), '## A\nDefinition: changed\nExample: kept\n\n## B\nDefinition: b\n');
});

test('an old problem in a hand-written file does not block an unrelated save', () => {
  const lex = parseLexicon('## A\nPart of: Missing\nDefinition: a\n');
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

test('applyTermItems patches only the keys given', () => {
  const r = applyTermItems(sample(), [{ term: 'user', avoid: ['customer', 'account holder'] }]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.patched, ['User']);
  const user = r.lexicon.terms[2];
  assert.deepEqual(user.avoid, ['customer', 'account holder']);
  assert.equal(user.definition, 'A person with a login.');
  assert.equal(user.notes, 'Admins are a separate term.');
});

test('applyTermItems clears with empty values', () => {
  const r = applyTermItems(sample(), [{ term: 'Dataset attribute', partOf: '', avoid: [] }]);
  assert.equal(r.ok, true);
  assert.equal(r.lexicon.terms[1].partOf, '');
  assert.deepEqual(r.lexicon.terms[1].avoid, []);
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
  assert.equal(composeLexicon(lex), before);
  const second = applyTermItems(lex, [{ term: 'Permission', definition: 'd', partOf: 'Nope' }]);
  assert.match(second.errors[0], /^item 1: "Permission" is part of "Nope"/);
});

test('applyTermItems applies the term rules to the whole result', () => {
  const r = applyTermItems(sample(), [{ term: 'Customer', definition: 'A buyer.' }, { term: 'User', avoid: ['customer'] }]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /^item 2: "User" avoids "customer"/);
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
