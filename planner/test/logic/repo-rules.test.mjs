import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { BASELINE, isExcluded, relativeInside, decide, validateRepoConfig } from '../../logic/diagrams/repo-rules.js';

const root = path.resolve('/work/repo');
const inside = (rel) => path.join(root, rel);

test('the baseline excludes secrets and tooling folders at any depth', () => {
  for (const rel of ['.env', '.env.production', 'app/.env.local', 'keys/server.pem', 'a/b/id_rsa', 'a/id_rsa.pub', 'credentials.json', 'cfg/secrets.yml', 'node_modules/x/index.js', '.git/config', 'pkg/node_modules/y.js']) {
    assert.equal(isExcluded(rel), true, rel);
  }
  for (const rel of ['src/auth/login.js', 'README.md', 'config/prod.yml', 'envelope.txt']) assert.equal(isExcluded(rel), false, rel);
});

test('a user glob adds to the baseline; an anchored glob matches from the root only', () => {
  assert.equal(isExcluded('config/prod.yml', ['config/prod.*']), true);
  assert.equal(isExcluded('other/config/prod.yml', ['config/prod.*']), false);
  assert.equal(isExcluded('deploy/secret/a.txt', ['secret/']), true);
  assert.equal(isExcluded('a/b/c/private.txt', ['**/private.*']), true);
  assert.equal(isExcluded('src/a.js', ['config/prod.*']), false);
});

test('a folder glob excludes what is below it but not a file of that name', () => {
  assert.equal(isExcluded('build/out/a.js', ['build/']), true);
  assert.equal(isExcluded('docs/build', ['build/']), false);
});

test('the baseline floor cannot be lowered: an empty exclude list still blocks .env', () => {
  assert.equal(isExcluded('.env', []), true);
  assert.deepEqual(BASELINE.includes('.env*'), true);
  assert.throws(() => validateRepoConfig({ path: 'x', exclude: ['!.env'] }), /negation/);
});

test('case: compared as the file system does', () => {
  assert.equal(isExcluded('A/.ENV', [], { caseSensitive: false }), true);
  assert.equal(isExcluded('A/.ENV', [], { caseSensitive: true }), false);
  assert.equal(isExcluded('Config/PROD.yml', ['config/prod.*'], { caseSensitive: false }), true);
});

test('a path inside the repo is allowed; a parent, a sibling and an absolute elsewhere are outside', () => {
  assert.deepEqual(decide({ rootReal: root, real: inside('src/a.js') }), { allowed: true, rel: 'src/a.js' });
  assert.deepEqual(decide({ rootReal: root, real: root }), { allowed: true, rel: '' });
  for (const real of [path.resolve(root, '..'), path.resolve(root, '..', 'other'), path.resolve(root, '..', 'repo-two', 'a.js'), path.resolve('/elsewhere/a.js')]) {
    assert.deepEqual(decide({ rootReal: root, real }), { allowed: false, reason: 'outside' }, real);
  }
});

test('a link that resolves outside the repo is outside, and a link that resolves to .env is excluded', () => {
  assert.equal(decide({ rootReal: root, real: path.resolve('/secrets-elsewhere/x.txt') }).reason, 'outside');
  assert.equal(decide({ rootReal: root, real: inside('.env') }).reason, 'excluded');
});

test('the decision follows the user glob and the case rule', () => {
  assert.equal(decide({ rootReal: root, real: inside('config/prod.yml'), exclude: ['config/prod.*'] }).reason, 'excluded');
  assert.equal(decide({ rootReal: root, real: inside('config/dev.yml'), exclude: ['config/prod.*'] }).allowed, true);
  assert.equal(relativeInside(root, root.toUpperCase() + path.sep + 'a.js', { caseSensitive: false }) !== null, true);
});

test('repo.json is validated and names the bad key', () => {
  assert.deepEqual(validateRepoConfig({ path: '/r' }), { path: '/r', exclude: [] });
  assert.deepEqual(validateRepoConfig({ path: '/r', exclude: [' a/* '] }), { path: '/r', exclude: ['a/*'] });
  assert.deepEqual(validateRepoConfig({}), { path: '', exclude: [] });
  assert.throws(() => validateRepoConfig({ path: '/r', exclude: 'x' }), /"exclude" must be a list/);
  assert.throws(() => validateRepoConfig({ path: 3 }), /"path" must be a string/);
  assert.throws(() => validateRepoConfig({ path: '/r', exlude: [] }), /unknown key "exlude"/);
  assert.throws(() => validateRepoConfig([]), /must be an object/);
});
