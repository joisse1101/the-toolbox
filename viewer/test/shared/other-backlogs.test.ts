import test from 'node:test';
import assert from 'node:assert/strict';
import { newStory, COLUMNS } from '#shared/backlog/model.ts';
import type { Story } from '#shared/types.ts';
import { indexOtherBacklogs } from '#shared/backlog/other-backlogs.ts';

let n = 0;
const st = (code: string, title: string, dependsOn: string[] = []): Story => Object.assign(newStory(COLUMNS), { id: ++n, code, title, dependsOn });

const open = [st('AA-X-0001', 'Open one')];

test('indexOtherBacklogs: finds a dependent in another backlog and labels the codes of that backlog', () => {
  const other = { name: 'beta', stories: [st('BB-Y-0001', 'Beta one', ['AA-X-0001'])] };
  const index = indexOtherBacklogs([other], 'alpha', open);
  assert.deepEqual(index.byCode.get('BB-Y-0001'), { backlog: 'beta', title: 'Beta one' });
  assert.deepEqual(index.dependentsOf.get('AA-X-0001'), [{ backlog: 'beta', code: 'BB-Y-0001', title: 'Beta one' }]);
});

test('indexOtherBacklogs: a story without a code and a dependency on a code no open story holds are left out', () => {
  const other = { name: 'beta', stories: [st('', 'No code', ['AA-X-0001']), st('BB-Y-0002', 'Beta two', ['AA-X-0099'])] };
  const index = indexOtherBacklogs([other], 'alpha', open);
  assert.equal(index.byCode.size, 1);
  assert.equal(index.dependentsOf.size, 0);
});

test('indexOtherBacklogs: the open backlog\'s own stories are ignored', () => {
  const own = { name: 'alpha', stories: [st('AA-X-0002', 'Own', ['AA-X-0001'])] };
  const index = indexOtherBacklogs([own], 'alpha', open);
  assert.equal(index.byCode.size, 0);
  assert.equal(index.dependentsOf.size, 0);
});
