// Dependency graph layout and view maths for the Graph tab. Pure functions, no DOM.
// A story depends on the stories in `dependsOn` (by ID). In the layout a story sits in a layer to the right of every
// story it depends on, so edges (drawn from the dependent to its dependency) all point left.

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;

// Layered layout. Returns:
//   nodes      linked stories: { id, code, layer, row }
//   edges      { from, to } story ids, `from` depends on `to`; `back` marks an edge that does not point left (cycle)
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

  const layers = [];
  for (const s of members) (layers[layer.get(s.id)] ??= []).push(s);
  const row = new Map();
  layers.forEach((group, l) => {
    const mean = (s) => {
      const rows = (deps.get(s.id) ?? []).filter((to) => layer.get(to) < l).map((to) => row.get(to));
      return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : Infinity;
    };
    group.sort((a, b) => mean(a) - mean(b) || order.get(a.id) - order.get(b.id));
    group.forEach((s, i) => row.set(s.id, i));
  });

  const edges = [];
  for (const [from, tos] of deps) {
    for (const to of tos) edges.push({ from, to, back: layer.get(to) >= layer.get(from) });
  }
  return {
    nodes: members.map((s) => ({ id: s.id, code: s.code, layer: layer.get(s.id), row: row.get(s.id) })),
    edges,
    unlinked: stories.filter((s) => !linked.has(s.id)),
    unresolved,
    cyclic,
  };
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
