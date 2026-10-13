import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutGraph, relatedIds, fitView, zoomAt, panBy, toGraphPoint, MIN_ZOOM, MAX_ZOOM } from '../src/user-story-generator/graph.js';

let n = 0;
const story = (code, dependsOn = []) => ({ id: ++n, code, dependsOn });
const layerOf = (g, s) => g.nodes.find((x) => x.id === s.id).layer;
const rowOf = (g, s) => g.nodes.find((x) => x.id === s.id).row;
const ids = (list) => list.map((s) => s.id);

test('layout: a chain puts each story right of its dependency', () => {
  const a = story('A-1'), b = story('A-2', ['A-1']), c = story('A-3', ['A-2']);
  const g = layoutGraph([c, b, a]);
  assert.deepEqual([a, b, c].map((s) => layerOf(g, s)), [0, 1, 2]);
  assert.deepEqual(g.edges.map((e) => [e.from, e.to]).sort(), [[b.id, a.id], [c.id, b.id]].sort());
  assert.equal(g.cyclic, false);
  assert.ok(g.edges.every((e) => !e.back));
});

test('layout: a diamond uses the longest path', () => {
  const a = story('A-1'), b = story('A-2', ['A-1']), c = story('A-3', ['A-1']), d = story('A-4', ['A-2', 'A-3', 'A-1']);
  const g = layoutGraph([a, b, c, d]);
  assert.deepEqual([a, b, c, d].map((s) => layerOf(g, s)), [0, 1, 1, 2]);
  assert.notEqual(rowOf(g, b), rowOf(g, c));
});

test('layout: several roots share layer 0 in file order', () => {
  const a = story('A-1'), b = story('B-1'), c = story('C-1', ['B-1', 'A-1']);
  const g = layoutGraph([a, b, c]);
  assert.deepEqual([layerOf(g, a), layerOf(g, b), layerOf(g, c)], [0, 0, 1]);
  assert.deepEqual([rowOf(g, a), rowOf(g, b)], [0, 1]);
});

test('layout: rows follow the dependencies to reduce crossings', () => {
  const a = story('A-1'), b = story('A-2'), c = story('A-3', ['A-2']), d = story('A-4', ['A-1']);
  const g = layoutGraph([a, b, c, d]);
  assert.ok(rowOf(g, d) < rowOf(g, c)); // d hangs off a (row 0), c off b (row 1)
});

test('layout: unlinked and ID-less stories are listed apart', () => {
  const a = story('A-1'), b = story('A-2', ['A-1']), lone = story('B-1'), none = story('', ['A-1']);
  const g = layoutGraph([lone, a, none, b]);
  assert.deepEqual(ids(g.unlinked), [lone.id, none.id]);
  assert.deepEqual(g.nodes.map((x) => x.id).sort(), [a.id, b.id].sort());
});

test('layout: a dangling reference is reported; resolvable links still draw', () => {
  const a = story('A-1', ['Z-9']), b = story('A-2', ['A-1', 'Z-8']);
  const g = layoutGraph([a, b]);
  assert.deepEqual(g.unresolved, [{ from: a.id, code: 'Z-9' }, { from: b.id, code: 'Z-8' }]);
  assert.equal(g.nodes.length, 2);
  assert.equal(g.edges.length, 1);
});

test('layout: a self-reference is ignored but counts as a cycle', () => {
  const a = story('A-1', ['A-1']);
  const g = layoutGraph([a]);
  assert.equal(g.cyclic, true);
  assert.deepEqual(g.edges, []);
  assert.deepEqual(ids(g.unlinked), [a.id]);
});

test('layout: a cycle still gives a finite layout and a back edge', () => {
  const a = story('A-1', ['A-3']), b = story('A-2', ['A-1']), c = story('A-3', ['A-2']);
  const g = layoutGraph([a, b, c]);
  assert.equal(g.cyclic, true);
  assert.equal(g.nodes.length, 3);
  assert.equal(g.edges.length, 3);
  assert.equal(g.edges.filter((e) => e.back).length, 1);
  assert.ok(g.nodes.every((x) => Number.isInteger(x.layer) && Number.isInteger(x.row)));
});

test('layout: duplicate codes resolve to the first story', () => {
  const a = story('A-1'), a2 = story('A-1'), b = story('A-2', ['A-1']);
  const g = layoutGraph([a, a2, b]);
  assert.deepEqual(g.edges.map((e) => [e.from, e.to]), [[b.id, a.id]]);
  assert.deepEqual(ids(g.unlinked), [a2.id]);
});

test('relatedIds: transitive dependencies and dependents, not the story or siblings', () => {
  const a = story('A-1'), b = story('A-2', ['A-1']), c = story('A-3', ['A-2']), d = story('A-4', ['A-1']), e = story('B-1');
  const g = layoutGraph([a, b, c, d, e]);
  assert.deepEqual([...relatedIds(g.edges, b.id)].sort(), [a.id, c.id].sort());
  assert.deepEqual([...relatedIds(g.edges, a.id)].sort(), [b.id, c.id, d.id].sort());
  assert.equal(relatedIds(g.edges, e.id).size, 0);
});

test('relatedIds: terminates on a cycle', () => {
  const a = story('A-1', ['A-2']), b = story('A-2', ['A-1']);
  const g = layoutGraph([a, b]);
  assert.deepEqual([...relatedIds(g.edges, a.id)], [b.id]);
});

test('fitView: shrinks a large graph to fit, centres a small one at 1:1', () => {
  const big = fitView({ width: 2000, height: 500 }, { width: 1000, height: 600 }, 0);
  assert.equal(big.k, 0.5);
  assert.deepEqual([big.x, big.y], [0, 175]);
  const small = fitView({ width: 100, height: 100 }, { width: 500, height: 300 }, 0);
  assert.deepEqual(small, { k: 1, x: 200, y: 100 });
  assert.deepEqual(fitView({ width: 0, height: 0 }, { width: 500, height: 300 }), { x: 0, y: 0, k: 1 });
});

test('zoomAt: keeps the point under the pointer fixed and clamps the zoom', () => {
  const view = { x: 10, y: 20, k: 1 };
  const point = { x: 200, y: 100 };
  const before = toGraphPoint(view, point);
  const zoomed = zoomAt(view, point, 2);
  assert.equal(zoomed.k, 2);
  assert.deepEqual(toGraphPoint(zoomed, point), before);
  assert.equal(zoomAt(view, point, 1000).k, MAX_ZOOM);
  assert.equal(zoomAt(view, point, 0.0001).k, MIN_ZOOM);
});

test('panBy: moves the view without changing the zoom', () => {
  assert.deepEqual(panBy({ x: 1, y: 2, k: 1.5 }, 10, -5), { x: 11, y: -3, k: 1.5 });
});
