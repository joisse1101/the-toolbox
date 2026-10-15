// Dependency graph layout and view maths for the Graph tab. Pure functions, no DOM.
// A story depends on the stories in `dependsOn` (by ID). In the layout a story sits in a layer to the right of every
// story it depends on, so edges (drawn from the dependent to its dependency) all point left.

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;

// Layered layout. Returns:
//   nodes      linked stories: { id, code, layer, row, cluster }; `row` counts within the cluster
//   edges      { from, to, back, via } story ids, `from` depends on `to`; `back` marks an edge that does not point left
//              (cycle); `via` lists { layer, row } lanes the edge passes through in the layers it skips
//   clusters   groups of stories joined by links, largest first: { index, size, rows }
//   unlinked   stories with no resolvable link, or no ID, in file order
//   unresolved { from, code } for Depends On entries no story has
//   cyclic     true when the links contain a cycle (a self-reference counts)
export function layoutGraph(stories) {
  const byCode = new Map();
  for (const s of stories) if (s.code && !byCode.has(s.code)) byCode.set(s.code, s);
  const order = new Map(stories.map((s, i) => [s.id, i]));

  const deps = new Map(); // story id -> ids it depends on
  const unresolved = [];
  let cyclic = false;
  for (const s of stories) {
    if (!s.code) continue;
    for (const code of s.dependsOn) {
      const target = byCode.get(code);
      if (!target) unresolved.push({ from: s.id, code });
      else if (target.id === s.id) cyclic = true;
      else {
        if (!deps.has(s.id)) deps.set(s.id, []);
        if (!deps.get(s.id).includes(target.id)) deps.get(s.id).push(target.id);
      }
    }
  }

  const linked = new Set();
  for (const [from, tos] of deps) {
    linked.add(from);
    for (const to of tos) linked.add(to);
  }

  // Layer = 1 + the deepest dependency. An edge into a story still being visited closes a cycle and is ignored here.
  const layer = new Map();
  const visiting = new Set();
  const place = (id) => {
    if (layer.has(id)) return layer.get(id);
    visiting.add(id);
    let l = 0;
    for (const to of deps.get(id) ?? []) {
      if (visiting.has(to)) cyclic = true;
      else l = Math.max(l, place(to) + 1);
    }
    visiting.delete(id);
    layer.set(id, l);
    return l;
  };
  const members = stories.filter((s) => linked.has(s.id));
  for (const s of members) place(s.id);

  // Clusters: stories joined by any link (a cycle's back edge included), largest first, ties by file order.
  const parent = new Map(members.map((s) => [s.id, s.id]));
  const find = (id) => {
    while (parent.get(id) !== id) id = parent.get(id);
    return id;
  };
  for (const [from, tos] of deps) for (const to of tos) parent.set(find(from), find(to));
  const groups = new Map();
  for (const s of members) {
    const root = find(s.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(s);
  }
  const clusterList = [...groups.values()].sort((a, b) => b.length - a.length || order.get(a[0].id) - order.get(b[0].id));

  const edges = [];
  for (const [from, tos] of deps) {
    for (const to of tos) edges.push({ from, to, back: layer.get(to) >= layer.get(from), via: [] });
  }

  const nodes = [];
  const clusters = [];
  clusterList.forEach((group, index) => {
    const { row, height, chains } = arrangeCluster(group, edges, layer);
    clusters.push({ index, size: group.length, rows: height });
    for (const s of group) nodes.push({ id: s.id, code: s.code, layer: layer.get(s.id), row: row.get(s.id), cluster: index });
    for (const [edge, chain] of chains) edge.via = chain.map((w) => ({ layer: w.layer, row: row.get(w.key) }));
  });
  return { nodes, edges, clusters, unlinked: stories.filter((s) => !linked.has(s.id)), unresolved, cyclic };
}

const SWEEPS = 4;

// Rows for one cluster. An edge that skips layers gets a waypoint in each layer it crosses, which takes a row like a
// node does, so the edge has a free lane. Layers are then ordered by the mean row of their neighbours, sweeping left to
// right and back; an item with no neighbour on the swept side keeps its slot. Returns:
//   row     item key (story id or waypoint key) -> row
//   height  number of rows
//   chains  edge -> its waypoints [{ key, layer }], from the dependent towards the dependency
function arrangeCluster(group, edges, layer) {
  const inCluster = new Set(group.map((s) => s.id));
  const layers = [];
  const addTo = (l, key) => (layers[l] ??= []).push(key);
  for (const s of group) addTo(layer.get(s.id), s.id);

  const left = new Map(); // item -> items it depends on, one layer to the left
  const right = new Map();
  const connect = (dependent, dependency) => {
    if (!left.has(dependent)) left.set(dependent, []);
    if (!right.has(dependency)) right.set(dependency, []);
    left.get(dependent).push(dependency);
    right.get(dependency).push(dependent);
  };
  const chains = new Map();
  for (const edge of edges) {
    if (!inCluster.has(edge.from) || edge.back) continue;
    const chain = [];
    let previous = edge.from;
    for (let l = layer.get(edge.from) - 1; l > layer.get(edge.to); l--) {
      const key = `${edge.from}>${edge.to}@${l}`;
      addTo(l, key);
      chain.push({ key, layer: l });
      connect(previous, key);
      previous = key;
    }
    connect(previous, edge.to);
    chains.set(edge, chain);
  }

  const row = new Map();
  const setRows = (l) => layers[l].forEach((key, i) => row.set(key, i));
  layers.forEach((_, l) => setRows(l));
  const sweep = (l, neighbours) => {
    const means = layers[l].map((key) => {
      const ns = neighbours.get(key);
      return ns ? ns.reduce((sum, n) => sum + row.get(n), 0) / ns.length : null;
    });
    const sorted = layers[l]
      .map((key, i) => ({ key, i, mean: means[i] }))
      .filter((x) => x.mean !== null)
      .sort((a, b) => a.mean - b.mean || a.i - b.i);
    let next = 0;
    layers[l] = layers[l].map((key, i) => (means[i] === null ? key : sorted[next++].key));
    setRows(l);
  };
  for (let round = 0; round < SWEEPS; round++) {
    for (let l = 1; l < layers.length; l++) sweep(l, left);
    for (let l = layers.length - 2; l >= 0; l--) sweep(l, right);
  }
  return { row, height: Math.max(...layers.map((items) => items.length)), chains };
}

// Ids of everything `id` depends on and everything that depends on it, directly or indirectly (not `id` itself).
export function relatedIds(edges, id) {
  const walk = (next) => {
    const seen = new Set();
    const stack = [id];
    while (stack.length) {
      for (const n of next(stack.pop())) if (n !== id && !seen.has(n)) { seen.add(n); stack.push(n); }
    }
    return seen;
  };
  const dependencies = walk((x) => edges.filter((e) => e.from === x).map((e) => e.to));
  const dependents = walk((x) => edges.filter((e) => e.to === x).map((e) => e.from));
  return new Set([...dependencies, ...dependents]);
}

// View = { x, y, k }: a graph point (gx, gy) is shown at (x + gx * k, y + gy * k) in the panel.
export const clampZoom = (k) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

// Scale and centre `bounds` ({ width, height }) in `size`. Never magnifies beyond 1:1.
export function fitView(bounds, size, padding = 24) {
  if (!bounds.width || !bounds.height || !size.width || !size.height) return { x: 0, y: 0, k: 1 };
  const k = clampZoom(Math.min(1, (size.width - 2 * padding) / bounds.width, (size.height - 2 * padding) / bounds.height));
  return { k, x: (size.width - bounds.width * k) / 2, y: (size.height - bounds.height * k) / 2 };
}

// Multiply the zoom by `factor`, keeping the graph point under `point` (panel coordinates) where it is.
export function zoomAt(view, point, factor) {
  const k = clampZoom(view.k * factor);
  const r = k / view.k;
  return { k, x: point.x - (point.x - view.x) * r, y: point.y - (point.y - view.y) * r };
}

export const panBy = (view, dx, dy) => ({ ...view, x: view.x + dx, y: view.y + dy });

// Panel coordinates -> graph coordinates.
export const toGraphPoint = (view, point) => ({ x: (point.x - view.x) / view.k, y: (point.y - view.y) / view.k });
