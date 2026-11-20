// Dependency graph layout and view maths for the Graph tab. Pure functions, no DOM.
// A story depends on the stories in `dependsOn` (by ID). In the layout a story sits in a layer to the right of every
// story it depends on, so edges (drawn from the dependent to its dependency) all point left.

import type { Story } from '#shared/types.ts';

// What the layout reads of a story.
export type GraphItem = Pick<Story, 'id' | 'code' | 'dependsOn'>;
export interface GraphNode {
  id: number;
  code: string;
  layer: number;
  row: number;
  cluster: number;
}
export interface GraphEdge {
  from: number;
  to: number;
  back: boolean;
  via: Array<{ layer: number; row: number }>;
}
export interface GraphCluster {
  index: number;
  size: number;
  rows: number;
}
export interface GraphLayout<S extends GraphItem = GraphItem> {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
  unlinked: S[];
  unresolved: Array<{ from: number; code: string }>;
  cyclic: boolean;
}
// A story of another backlog drawn as a dashed node: a negative `id` (story ids are positive), its backlog and its title.
export interface OtherStoryItem extends GraphItem {
  backlog: string;
  title: string;
}
export type GraphLevel = 'stories' | 'features' | 'epics' | 'backlogs';
export interface GraphView {
  x: number;
  y: number;
  k: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}
// A feature or epic group, laid out like a story.
export interface StoryGroup {
  id: number;
  key: string;
  name: string;
  epic: string;
  storyIds: number[];
  internal: number;
  dependsOn: Set<string>;
  other?: boolean; // Features and Epics: the group is another backlog (dashed)
  initials?: string; // Backlogs level: the backlog's initials
  open?: boolean; // Backlogs level: the open backlog
}

type Key = number | string;

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
export function layoutGraph<S extends GraphItem>(stories: S[]): GraphLayout<S> {
  const byCode = new Map<string, S>();
  for (const s of stories) if (s.code && !byCode.has(s.code)) byCode.set(s.code, s);
  const order = new Map<number, number>(stories.map((s, i) => [s.id, i]));

  const deps = new Map<number, number[]>(); // story id -> ids it depends on
  const unresolved: Array<{ from: number; code: string }> = [];
  let cyclic = false;
  for (const s of stories) {
    if (!s.code) continue;
    for (const code of s.dependsOn) {
      const target = byCode.get(code);
      if (!target) unresolved.push({ from: s.id, code });
      else if (target.id === s.id) cyclic = true;
      else {
        if (!deps.has(s.id)) deps.set(s.id, []);
        if (!deps.get(s.id)!.includes(target.id)) deps.get(s.id)!.push(target.id);
      }
    }
  }

  const linked = new Set<number>();
  for (const [from, tos] of deps) {
    linked.add(from);
    for (const to of tos) linked.add(to);
  }

  // Layer = 1 + the deepest dependency. An edge into a story still being visited closes a cycle and is ignored here.
  const layer = new Map<number, number>();
  const visiting = new Set<number>();
  const place = (id: number): number => {
    if (layer.has(id)) return layer.get(id)!;
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
  const parent = new Map<number, number>(members.map((s) => [s.id, s.id]));
  const find = (id: number): number => {
    while (parent.get(id) !== id) id = parent.get(id)!;
    return id;
  };
  for (const [from, tos] of deps) for (const to of tos) parent.set(find(from), find(to));
  const groups = new Map<number, S[]>();
  for (const s of members) {
    const root = find(s.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(s);
  }
  const clusterList = [...groups.values()].sort((a, b) => b.length - a.length || order.get(a[0]!.id)! - order.get(b[0]!.id)!);

  const edges: GraphEdge[] = [];
  for (const [from, tos] of deps) {
    for (const to of tos) edges.push({ from, to, back: layer.get(to)! >= layer.get(from)!, via: [] });
  }

  const nodes: GraphNode[] = [];
  const clusters: GraphCluster[] = [];
  clusterList.forEach((group, index) => {
    const { row, height, chains } = arrangeCluster(group, edges, layer);
    clusters.push({ index, size: group.length, rows: height });
    for (const s of group) nodes.push({ id: s.id, code: s.code, layer: layer.get(s.id)!, row: row.get(s.id)!, cluster: index });
    for (const [edge, chain] of chains) edge.via = chain.map((w) => ({ layer: w.layer, row: row.get(w.key)! }));
  });
  return { nodes, edges, clusters, unlinked: stories.filter((s) => !linked.has(s.id)), unresolved, cyclic };
}

// The open backlog's stories plus one item per story of another backlog that is linked with them (design decision 1):
// a story an open story depends on (no arrow of its own), or one that depends on an open story (only those entries kept,
// so the other backlog's own links stay out). A story that is both is one item. The items are laid out like any story, so
// they resolve open stories' entries and a cycle through them is found by `layoutGraph`.
export function withOtherStories(
  stories: readonly Story[],
  others: ReadonlyArray<{ name: string; stories: readonly Story[] }>,
): Array<Story | OtherStoryItem> {
  const openCodes = new Set(stories.map((s) => s.code).filter(Boolean));
  const otherByCode = new Map<string, { backlog: string; story: Story }>();
  for (const { name, stories: list } of others) {
    for (const s of list) if (s.code && !openCodes.has(s.code) && !otherByCode.has(s.code)) otherByCode.set(s.code, { backlog: name, story: s });
  }

  const items = new Map<string, OtherStoryItem>(); // code -> item
  const itemFor = (code: string) => {
    const found = items.get(code);
    if (found) return found;
    const { backlog, story } = otherByCode.get(code)!;
    const item: OtherStoryItem = { id: -(items.size + 1), code, dependsOn: [], backlog, title: story.title };
    items.set(code, item);
    return item;
  };
  for (const s of stories) {
    for (const code of s.dependsOn) if (otherByCode.has(code)) itemFor(code);
  }
  for (const [code, { story }] of otherByCode) {
    const toOpen = [...new Set(story.dependsOn.filter((e) => openCodes.has(e)))];
    if (toOpen.length) itemFor(code).dependsOn = toOpen;
  }
  return [...stories, ...items.values()];
}

// While a backlog cannot be read, its initials are unknown, so an unresolved code may belong to it. Keep only the codes of
// the open backlog (those starting with its initials) then; with every backlog read, keep them all.
export function visibleUnresolved<U extends { code: string }>(unresolved: readonly U[], openInitials: string, unreadableCount: number): U[] {
  if (unreadableCount === 0) return [...unresolved];
  return unresolved.filter((u) => u.code.startsWith(`${openInitials}-`));
}

const SWEEPS = 4;

// Rows for one cluster. An edge that skips layers gets a waypoint in each layer it crosses, which takes a row like a
// node does, so the edge has a free lane. Layers are then ordered by the mean row of their neighbours, sweeping left to
// right and back; an item with no neighbour on the swept side keeps its slot. Returns:
//   row     item key (story id or waypoint key) -> row
//   height  number of rows
//   chains  edge -> its waypoints [{ key, layer }], from the dependent towards the dependency
function arrangeCluster(group: GraphItem[], edges: GraphEdge[], layer: Map<number, number>) {
  const inCluster = new Set(group.map((s) => s.id));
  const layers: Key[][] = [];
  const addTo = (l: number, key: Key) => (layers[l] ??= []).push(key);
  for (const s of group) addTo(layer.get(s.id)!, s.id);

  const left = new Map<Key, Key[]>(); // item -> items it depends on, one layer to the left
  const right = new Map<Key, Key[]>();
  const connect = (dependent: Key, dependency: Key) => {
    if (!left.has(dependent)) left.set(dependent, []);
    if (!right.has(dependency)) right.set(dependency, []);
    left.get(dependent)!.push(dependency);
    right.get(dependency)!.push(dependent);
  };
  const chains = new Map<GraphEdge, Array<{ key: string; layer: number }>>();
  for (const edge of edges) {
    if (!inCluster.has(edge.from) || edge.back) continue;
    const chain: Array<{ key: string; layer: number }> = [];
    let previous: Key = edge.from;
    for (let l = layer.get(edge.from)! - 1; l > layer.get(edge.to)!; l--) {
      const key = `${edge.from}>${edge.to}@${l}`;
      addTo(l, key);
      chain.push({ key, layer: l });
      connect(previous, key);
      previous = key;
    }
    connect(previous, edge.to);
    chains.set(edge, chain);
  }

  const row = new Map<Key, number>();
  const setRows = (l: number) => layers[l].forEach((key, i) => row.set(key, i));
  layers.forEach((_, l) => setRows(l));
  const sweep = (l: number, neighbours: Map<Key, Key[]>) => {
    const means = layers[l].map((key) => {
      const ns = neighbours.get(key);
      return ns ? ns.reduce<number>((sum, n) => sum + row.get(n)!, 0) / ns.length : null;
    });
    const sorted = layers[l]
      .map((key, i) => ({ key, i, mean: means[i] }))
      .filter((x) => x.mean !== null)
      .sort((a, b) => a.mean! - b.mean! || a.i - b.i);
    let next = 0;
    layers[l] = layers[l].map((key, i) => (means[i] === null ? key : sorted[next++]!.key));
    setRows(l);
  };
  for (let round = 0; round < SWEEPS; round++) {
    for (let l = 1; l < layers.length; l++) sweep(l, left);
    for (let l = layers.length - 2; l >= 0; l--) sweep(l, right);
  }
  return { row, height: Math.max(...layers.map((items) => items.length)), chains };
}

const KEY_SEP = '\u0001';
const OTHER_KEY = '\u0002'; // starts the group key of another backlog (design decision 2); no epic name holds it

// What grouping reads of a story, and what it fills in for the group.
interface Member {
  id: number;
  code: string;
  dependsOn: readonly string[];
}
type GroupFacts = Pick<StoryGroup, 'name' | 'epic' | 'other' | 'initials' | 'open'>;

// Shared by every coarse level: put each member in the group `keyOf` names (null leaves it out), count the links inside a
// group, and turn the links between groups into pairs. See `groupStories` for what comes back.
function connectGroups(members: readonly Member[], keyOf: (m: Member) => string | null, factsOf: (m: Member) => GroupFacts) {
  const groups = new Map<string, StoryGroup>(); // key -> group
  const groupOf = new Map<number, StoryGroup>(); // member id -> group
  for (const m of members) {
    const key = keyOf(m);
    if (key === null) continue;
    if (!groups.has(key)) groups.set(key, { id: groups.size + 1, key, ...factsOf(m), storyIds: [], internal: 0, dependsOn: new Set() });
    groups.get(key)!.storyIds.push(m.id);
    groupOf.set(m.id, groups.get(key)!);
  }

  const byCode = new Map<string, Member>();
  for (const m of members) if (m.code && !byCode.has(m.code)) byCode.set(m.code, m);
  const pairs = new Map<string, Array<{ from: number; to: number }>>();
  for (const m of members) {
    const from = groupOf.get(m.id);
    if (!from) continue;
    for (const code of new Set(m.dependsOn)) {
      const target = byCode.get(code);
      const to = target && groupOf.get(target.id);
      if (!to || target.id === m.id) continue;
      if (to === from) {
        from.internal++;
        continue;
      }
      from.dependsOn.add(to.key);
      const edge = `${from.id}>${to.id}`;
      if (!pairs.has(edge)) pairs.set(edge, []);
      pairs.get(edge)!.push({ from: m.id, to: target.id });
    }
  }

  const mutual: Array<[number, number]> = [];
  for (const edge of pairs.keys()) {
    const [a, b] = edge.split('>').map(Number) as [number, number];
    if (a < b && pairs.has(`${b}>${a}`)) mutual.push([a, b]);
  }
  const list = [...groups.values()];
  return {
    items: list.map((g) => ({ id: g.id, code: g.key, dependsOn: [...g.dependsOn] })),
    groups: new Map(list.map((g) => [g.id, g])),
    pairs,
    mutual,
  };
}

// Coarser view of the same stories, for the Features and Epics levels: one item per feature (epic + feature) or epic,
// shaped like a story so `layoutGraph` can lay it out. A story with no ID, no Epic or (features) no Feature is left out.
// The extra items of `withOtherStories` (negative id) are grouped by backlog, one group per backlog named after it.
// Links between stories of one group are counted in the group, not made into edges. Returns:
//   items   { id, code, dependsOn } for layoutGraph; `code` is the group key, `id` a small number
//   groups  id -> { id, key, name, epic, storyIds, internal (links inside the group) }
//   pairs   `${from}>${to}` group ids -> the story links { from, to } (story ids) behind that group edge
//   mutual  [a, b] group ids that depend on each other
export function groupStories(stories: ReadonlyArray<Story | OtherStoryItem>, level: 'features' | 'epics') {
  const trim = (v: unknown) => String(v ?? '').trim();
  const bySource = new Map<number, Story | OtherStoryItem>(stories.map((s) => [s.id, s]));
  const otherOf = (m: Member) => {
    const s = bySource.get(m.id)!;
    return 'backlog' in s ? s : null;
  };
  const keyOf = (m: Member) => {
    const other = otherOf(m);
    if (other) return `${OTHER_KEY}${other.backlog}`;
    const s = bySource.get(m.id) as Story;
    const epic = trim(s.epic);
    if (!m.code || !epic) return null;
    if (level === 'epics') return epic;
    return trim(s.feature) ? `${epic}${KEY_SEP}${trim(s.feature)}` : null;
  };
  const factsOf = (m: Member): GroupFacts => {
    const other = otherOf(m);
    if (other) return { name: other.backlog, epic: '', other: true };
    const s = bySource.get(m.id) as Story;
    return { name: trim(level === 'epics' ? s.epic : s.feature), epic: trim(s.epic) };
  };
  return connectGroups(stories, keyOf, factsOf);
}

// Backlogs level: one group per backlog, named after it. Each `Depends On` entry resolves against the codes of every
// backlog, so a link between two other backlogs counts too. A story with no ID is counted in its backlog but links nothing.
// Backlogs of different files reuse story ids, so the stories get ids of their own: the open backlog keeps its own
// (positive), the others get negative ones. `members` maps each of those ids to its backlog and story. Returns what
// `groupStories` returns, plus `members`.
export function groupBacklogs(backlogs: ReadonlyArray<{ name: string; initials: string; stories: readonly Story[]; open?: boolean }>) {
  const members = new Map<number, { backlog: string; story: Story }>();
  const owner = new Map<number, (typeof backlogs)[number]>();
  const list: Member[] = [];
  let next = 0;
  for (const b of backlogs) {
    for (const story of b.stories) {
      const id = b.open ? story.id : --next;
      members.set(id, { backlog: b.name, story });
      owner.set(id, b);
      list.push({ id, code: story.code, dependsOn: story.code ? story.dependsOn : [] });
    }
  }
  const grouped = connectGroups(
    list,
    (m) => owner.get(m.id)!.name,
    (m) => {
      const b = owner.get(m.id)!;
      return { name: b.name, epic: '', initials: b.initials, open: Boolean(b.open) };
    },
  );
  return { ...grouped, members };
}

// Ids of everything `id` depends on and everything that depends on it, directly or indirectly (not `id` itself).
export function relatedIds(edges: readonly GraphEdge[], id: number) {
  const walk = (next: (x: number) => number[]) => {
    const seen = new Set<number>();
    const stack = [id];
    while (stack.length) {
      for (const n of next(stack.pop()!)) if (n !== id && !seen.has(n)) { seen.add(n); stack.push(n); }
    }
    return seen;
  };
  const dependencies = walk((x) => edges.filter((e) => e.from === x).map((e) => e.to));
  const dependents = walk((x) => edges.filter((e) => e.to === x).map((e) => e.from));
  return new Set([...dependencies, ...dependents]);
}

// View = { x, y, k }: a graph point (gx, gy) is shown at (x + gx * k, y + gy * k) in the panel.
export const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

// Scale and centre `bounds` ({ width, height }) in `size`. Never magnifies beyond 1:1, and never goes below `minZoom`
// (the zoom that keeps the smallest node text readable): a graph too large for that is shown from its top left corner,
// with the rest reachable by panning.
export function fitView(bounds: Size, size: Size, padding = 24, minZoom = MIN_ZOOM): GraphView {
  if (!bounds.width || !bounds.height || !size.width || !size.height) return { x: 0, y: 0, k: 1 };
  const wanted = Math.min(1, (size.width - 2 * padding) / bounds.width, (size.height - 2 * padding) / bounds.height);
  const k = Math.min(MAX_ZOOM, Math.max(minZoom, wanted));
  const place = (room: number, extent: number) => (extent * k > room - 2 * padding ? padding : (room - extent * k) / 2);
  return { k, x: place(size.width, bounds.width), y: place(size.height, bounds.height) };
}

// Multiply the zoom by `factor`, keeping the graph point under `point` (panel coordinates) where it is.
export function zoomAt(view: GraphView, point: Point, factor: number): GraphView {
  const k = clampZoom(view.k * factor);
  const r = k / view.k;
  return { k, x: point.x - (point.x - view.x) * r, y: point.y - (point.y - view.y) * r };
}

export const panBy = (view: GraphView, dx: number, dy: number): GraphView => ({ ...view, x: view.x + dx, y: view.y + dy });

// Panel coordinates -> graph coordinates.
export const toGraphPoint = (view: GraphView, point: Point): Point => ({ x: (point.x - view.x) / view.k, y: (point.y - view.y) / view.k });
