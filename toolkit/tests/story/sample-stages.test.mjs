// The staleness check of the story-to-code sample (toolkit/sample/story-to-code/). It calls no model: it runs every saved stage
// through the toolkit's own checkers, so a format change that breaks a saved stage fails here and names the stage and the file.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadBacklog } from '../../skills/jois-story-plan/lib/backlog/model.js';
import { parseLimits } from '../../skills/jois-story-plan/diagrams/limits.js';
import { compareSource, scopeStories } from '../../skills/jois-story-plan/diagrams/source.js';
import { checkSlice, formatProblems } from '../../skills/jois-story-plan/diagrams/checks.js';
import { checkTasks } from '../../skills/jois-story-plan/diagrams/tasks.js';
import { compareContextMap, composeContextMap, epicNames } from '../../skills/jois-story-plan/diagrams/context-map.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = path.resolve(HERE, '..', '..', 'sample', 'story-to-code');
const STAGES = ['proposed', 'accepted', 'planned', 'built', 'validated', 'archived'];
const BACKLOG = 'habits';
const SLICE = 'streaks';
const limits = parseLimits(fs.readFileSync(path.join(HERE, '..', '..', 'skills', 'jois-story-plan', 'references', 'diagram-conventions.md'), 'utf8'));

const lf = (text) => text.replace(/\r\n/g, '\n');

// Every file the stages up to and including `stage` write, as relative path -> text (a later stage overwrites an earlier one).
function filesAt(stage) {
  const files = new Map();
  for (const name of STAGES.slice(0, STAGES.indexOf(stage) + 1)) {
    const root = path.join(SAMPLE_DIR, 'stages', name);
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name !== 'built.patch') files.set(path.relative(root, full).replace(/\\/g, '/'), lf(fs.readFileSync(full, 'utf8')));
      }
    };
    walk(root);
  }
  return files;
}

const INITIALS = JSON.parse(filesAt('proposed').get('.plans/habits/backlog.json')).initials;
const plans = (file) => `.plans/${BACKLOG}/${file}`;
const sliceFile = (name) => plans(`slices/${SLICE}/${name}`);

test('every stage folder holds the files the spec lists', () => {
  const expected = {
    proposed: [plans('backlog.json'), plans('user-stories/proposals.csv')],
    accepted: [plans('user-stories.csv')],
    planned: [sliceFile(`UC-${SLICE}.md`), sliceFile('tasks.md'), sliceFile('source.json')],
    built: [sliceFile('tasks.md'), sliceFile('review.md'), 'built.patch'],
    validated: [sliceFile('validation.md')],
    archived: [sliceFile('ARCHIVED.md')],
  };
  for (const [stage, names] of Object.entries(expected)) {
    for (const name of names) assert.ok(fs.existsSync(path.join(SAMPLE_DIR, 'stages', stage, name)), `stage ${stage}: ${name} is missing`);
  }
  const archivedWiki = path.join(SAMPLE_DIR, 'stages', 'archived', 'wiki');
  assert.ok(fs.readdirSync(archivedWiki).length > 0, 'stage archived: no wiki pages');
});

test('the proposals and the accepted backlog load with their initials', () => {
  const proposals = loadBacklog(filesAt('proposed').get(plans('user-stories/proposals.csv')), { placeholderIds: true, initials: INITIALS });
  assert.ok(proposals.stories.length > 0, 'stage proposed: no proposed story');
  const backlog = loadBacklog(filesAt('accepted').get(plans('user-stories.csv')), { initials: INITIALS });
  assert.equal(backlog.stories.length, proposals.stories.length, 'stage accepted: every proposal moved into the backlog');
  for (const story of backlog.stories) assert.match(story.code, new RegExp(`^${INITIALS}-[A-Z0-9]+-\\d{4}$`), `stage accepted: the ID of "${story.title}"`);
});

for (const stage of STAGES.slice(STAGES.indexOf('planned'))) {
  test(`stage ${stage}: the slice passes the checkers and its stories are in the backlog`, () => {
    const files = filesAt(stage);
    const backlogText = files.get(plans('user-stories.csv'));
    const backlog = loadBacklog(backlogText, { initials: INITIALS }).stories;
    const document = files.get(sliceFile(`UC-${SLICE}.md`));
    const source = JSON.parse(files.get(sliceFile('source.json')));

    // The recorded slice was planned with the code base read (the writer's --repo), so its repo-level rules apply.
    const checked = checkSlice({ slice: SLICE, files: { [`UC-${SLICE}.md`]: document }, stories: scopeStories(backlog, source.scope), limits, repo: {} });
    assert.deepEqual(formatProblems(checked.problems), [], `stage ${stage}: UC-${SLICE}.md`);

    const tasks = checkTasks({ tasksText: files.get(sliceFile('tasks.md')), document, slice: SLICE });
    assert.deepEqual(tasks.map((p) => p.message), [], `stage ${stage}: tasks.md`);

    const compared = compareSource(source, backlog);
    assert.deepEqual(compared.stories.map((s) => [s.title, s.status]), source.stories.map((s) => [s.title, 'ok']), `stage ${stage}: source.json hashes match the backlog`);
    assert.equal(compared.stale, false, `stage ${stage}: source.json is up to date`);
  });
}

test('stage planned: the context map covers the backlog Epics and its text is the generated one', () => {
  const files = filesAt('planned');
  const map = JSON.parse(files.get(plans('context-map.json')));
  const epics = epicNames(loadBacklog(files.get(plans('user-stories.csv')), { initials: INITIALS }).stories);
  assert.deepEqual(compareContextMap(map, epics), { missing: [], unknown: [] }, 'stage planned: context-map.json');
  assert.equal(files.get(plans('context-map.md')), composeContextMap(map), 'stage planned: context-map.md');
});

test('stage built: tasks.md is ticked, and stage archived marks the slice', () => {
  assert.doesNotMatch(filesAt('built').get(sliceFile('tasks.md')), /- \[ \]/, 'stage built: tasks.md has an unticked task');
  assert.match(filesAt('archived').get(sliceFile('ARCHIVED.md')), /streaks/, 'stage archived: ARCHIVED.md names the slice');
});

// A temp folder under the repo's .scratch/ (git ignores it), as the rule for the files tests create asks; the system temp folder otherwise.
function scratchDir() {
  let dir = HERE;
  while (!fs.existsSync(path.join(dir, '.git')) && path.dirname(dir) !== dir) dir = path.dirname(dir);
  const base = fs.existsSync(path.join(dir, '.git')) ? path.join(dir, '.scratch') : path.join(path.resolve(dir), '.scratch');
  fs.mkdirSync(base, { recursive: true });
  return fs.mkdtempSync(path.join(base, 'sample-stages-'));
}

test('stage built: built.patch applies to the baseline app with git am', () => {
  const dir = scratchDir();
  try {
    for (const name of ['app', 'wiki', 'CLAUDE.md']) {
      fs.cpSync(path.join(SAMPLE_DIR, name), path.join(dir, name), { recursive: true, filter: (src) => !/node_modules|[\\/]dist([\\/]|$)/.test(src) });
    }
    const git = (...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    for (const args of [['init', '-q', '-b', 'sample'], ['config', 'user.name', 'Test'], ['config', 'user.email', 'test@example.invalid'], ['config', 'core.autocrlf', 'false'], ['add', '-A'], ['commit', '-q', '-m', 'baseline']]) {
      const r = git(...args);
      assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
    }
    const am = git('am', '--quiet', path.join(SAMPLE_DIR, 'stages', 'built', 'built.patch'));
    assert.equal(am.status, 0, `stage built: built.patch does not apply to the baseline app: ${am.stderr}`);
    assert.ok(fs.existsSync(path.join(dir, 'app', 'src', 'streak.ts')), 'stage built: the patch adds app/src/streak.ts');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
