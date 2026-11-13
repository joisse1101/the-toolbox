import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { Story } from '../../../../../../shared/types.ts';
import type { GraphEdge, GraphItem, GraphLayout, GraphLevel, GraphView, Point } from './graph.ts';
import TabHeader from '../../../../shared/ui/TabHeader.tsx';
import GraphToolbar from './GraphToolbar.tsx';
import GraphDetail from './GraphDetail.tsx';
import GraphCanvas from './GraphCanvas.tsx';
import GraphUnlinked from './GraphUnlinked.tsx';
import { storyLabel as title } from '../../../../../../shared/backlog/model.ts';
import { wouldCycle } from '../../../../../../shared/backlog/ids.ts';
import { layoutGraph, groupStories, relatedIds, fitView, zoomAt, panBy, toGraphPoint } from './graph.ts';
import { edgeKey, bandGeometry } from './graphGeometry.ts';

const KEY_PAN = 48;
const ZOOM_STEP = 1.25;
const SMALLEST_NODE_TEXT = 12; // px: the smallest text inside a node (--text-xs), at zoom 1
const MIN_NODE_TEXT = 11; // px: fitting never shrinks node text below this; a larger graph is panned instead
const FIT_MIN_ZOOM = MIN_NODE_TEXT / SMALLEST_NODE_TEXT;

// The pointer gesture in progress: dragging a link from a story's handle, or panning the background.
type Gesture = { type: 'link'; id: number } | { type: 'pan'; last: Point; moved: number };

export default function GraphTab({ stories, problems, current, hidden, onOpen, onAddDependency, onRemoveDependency }: {
  stories: Story[];
  problems: Map<number, string[]>;
  current: string | null;
  hidden: boolean;
  onOpen: (id: number) => void;
  onAddDependency: (id: number, code: string) => void;
  onRemoveDependency: (id: number, code: string) => void;
}) {
  const [level, setLevel] = useState<GraphLevel>('stories');
  const coarse = level !== 'stories'; // Features and Epics: groups of stories, read-only
  const grouping = useMemo(() => (level !== 'stories' ? groupStories(stories, level) : null), [stories, level]);
  const layout = useMemo<GraphLayout>(() => layoutGraph<GraphItem>(grouping ? grouping.items : stories), [stories, grouping]);
  const byId = useMemo(() => new Map(stories.map((s) => [s.id, s] as const)), [stories]);
  const nodeById = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n] as const)), [layout]);
  const epicHue = useMemo(() => {
    const hues = new Map<string, number>();
    for (const s of stories) {
      const epic = s.epic.trim();
      if (epic && !hues.has(epic)) hues.set(epic, (hues.size * 137) % 360);
    }
    return hues;
  }, [stories]);

  const [view, setCamera] = useState<GraphView>({ x: 0, y: 0, k: 1 });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<number | null>(null); // story id: Link mode, the next story chosen is its dependency
  const [drag, setDrag] = useState<{ from: number; point: Point } | null>(null); // from: story id, point: graph coordinates, while a link is dragged
  const [focus, setFocus] = useState<Set<number> | null>(null); // story ids kept prominent after "Show stories", else null
  const [note, setNote] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const fittedFor = useRef<string | null>(null);

  const hasNodes = layout.nodes.length > 0;
  const { bands, bounds } = useMemo(() => bandGeometry(layout), [layout]);

  const panelSize = () => {
    const r = panel.current?.getBoundingClientRect();
    return r ? { width: r.width, height: r.height } : { width: 0, height: 0 };
  };
  const fit = () => {
    const size = panelSize();
    if (!size.width) return false;
    setCamera(fitView(bounds, size, undefined, FIT_MIN_ZOOM));
    return true;
  };
  const latestFit = useRef(fit);
  latestFit.current = fit;
  const zoomBy = (factor: number, point?: Point) => {
    const size = panelSize();
    setCamera((v) => zoomAt(v, point ?? { x: size.width / 2, y: size.height / 2 }, factor));
  };

  // A different backlog starts at the Stories level with nothing selected and the whole graph in view; so does each level.
  useEffect(() => {
    setLevel('stories');
    setSelectedId(null);
    setSelectedEdge(null);
    setLinkFrom(null);
    setFocus(null);
    setNote('');
  }, [current]);
  useLayoutEffect(() => {
    const key = `${current}|${level}`;
    if (hidden || !hasNodes || fittedFor.current === key) return;
    if (fit()) fittedFor.current = key;
  }, [hidden, hasNodes, current, level]);

  // The graph is fitted again whenever the canvas changes size. A hidden canvas has no width, so it is skipped.
  useEffect(() => {
    const el = panel.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => latestFit.current());
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNodes]);

  // Ctrl+wheel (and a trackpad pinch) zooms about the pointer, the plain wheel pans. Needs a non-passive listener.
  useEffect(() => {
    const el = panel.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey) setCamera((v) => zoomAt(v, { x: e.clientX - r.left, y: e.clientY - r.top }, Math.exp(-e.deltaY * 0.003)));
      else if (e.shiftKey) setCamera((v) => panBy(v, -(e.deltaY || e.deltaX), 0));
      else setCamera((v) => panBy(v, -e.deltaX, -e.deltaY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [hasNodes]);

  const selected = (selectedId === null ? undefined : nodeById.get(selectedId)) ?? null;
  const edge = layout.edges.find((e) => edgeKey(e) === selectedEdge) ?? null;
  const related = useMemo(() => (selected ? relatedIds(layout.edges, selected.id) : null), [layout, selected]);
  const lit = (id: number) => (focus ? focus.has(id) : !related || id === selected!.id || related.has(id));
  const litEdge = (e: GraphEdge) => (focus || related ? lit(e.from) && lit(e.to) : true);

  const clearSelection = () => {
    setSelectedId(null);
    setSelectedEdge(null);
    setFocus(null);
  };

  // Features and Epics levels: the group names, and the story links behind the selected group or arrow.
  const groupLabel = (id: number) => {
    const g = grouping!.groups.get(id)!;
    return level === 'features' ? `${g.epic} › ${g.name}` : g.name;
  };
  const selectedGroup = coarse && selected ? grouping!.groups.get(selected.id) : null;
  const detailPairs: Array<{ from: number; to: number }> | null | undefined = !coarse
    ? null
    : edge
      ? grouping!.pairs.get(edgeKey(edge))
      : selectedGroup
        ? [...grouping!.pairs].filter(([k]) => k.split('>').includes(String(selectedGroup.id))).flatMap(([, pairs]) => pairs)
        : null;
  const chooseLevel = (next: GraphLevel) => {
    setLevel(next);
    clearSelection();
    setLinkFrom(null);
    setNote('');
  };
  const showStories = () => {
    const ids = edge ? detailPairs!.flatMap((p) => [p.from, p.to]) : selectedGroup!.storyIds;
    chooseLevel('stories');
    setFocus(new Set(ids));
  };
  const cancelLink = () => {
    gesture.current = null;
    setDrag(null);
    setLinkFrom(null);
  };

  // `fromId` comes to depend on `toId`.
  const link = (fromId: number, toId: number) => {
    const from = byId.get(fromId);
    const to = byId.get(toId);
    setLinkFrom(null);
    if (!from || !to) return;
    if (!from.code || !to.code) return setNote('A story needs an epic, and so an ID, before it can be linked.');
    if (from.id === to.id) return setNote('A story cannot depend on itself.');
    if (from.dependsOn.includes(to.code)) return setNote('');
    if (wouldCycle(stories, from.code, to.code)) return setNote(`${from.code} cannot depend on ${to.code}: that would create a dependency cycle.`);
    setNote('');
    onAddDependency(from.id, to.code);
  };

  const removeEdge = (e: GraphEdge) => {
    if (coarse) return;
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (!from || !to) return;
    onRemoveDependency(from.id, to.code);
    setSelectedEdge(null);
    setNote('');
  };

  const clickNode = (id: number) => {
    if (linkFrom !== null) return link(linkFrom, id);
    setSelectedEdge(null);
    setSelectedId((cur) => (cur === id ? null : id));
    setNote('');
  };

  const panelPoint = (e: PointerEvent) => {
    const r = panel.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const handle = (e.target as Element).closest<SVGElement>('[data-handle]');
    const onItem = (e.target as Element).closest('[data-node], [data-edge]');
    if (handle) {
      const id = Number(handle.dataset.handle);
      gesture.current = { type: 'link', id };
      setDrag({ from: id, point: toGraphPoint(view, panelPoint(e)) });
      setLinkFrom(null);
    } else if (!onItem) {
      gesture.current = { type: 'pan', last: { x: e.clientX, y: e.clientY }, moved: 0 };
    } else {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g) return;
    if (g.type === 'pan') {
      const dx = e.clientX - g.last.x;
      const dy = e.clientY - g.last.y;
      g.last = { x: e.clientX, y: e.clientY };
      g.moved += Math.abs(dx) + Math.abs(dy);
      setCamera((v) => panBy(v, dx, dy));
    } else {
      setDrag({ from: g.id, point: toGraphPoint(view, panelPoint(e)) });
    }
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.type === 'pan') {
      if (g.moved < 4) clearSelection();
      return;
    }
    setDrag(null);
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<SVGElement>('[data-node]');
    if (target) link(g.id, Number(target.dataset.node));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const pan = ({ ArrowLeft: [KEY_PAN, 0], ArrowRight: [-KEY_PAN, 0], ArrowUp: [0, KEY_PAN], ArrowDown: [0, -KEY_PAN] } as Record<string, [number, number]>)[e.key];
    if (pan) setCamera((v) => panBy(v, ...pan));
    else if (e.key === '+' || e.key === '=') zoomBy(ZOOM_STEP);
    else if (e.key === '-') zoomBy(1 / ZOOM_STEP);
    else if (e.key === '0') fit();
    else if ((e.key === 'Delete' || e.key === 'Backspace') && edge) removeEdge(edge);
    else if (e.key === 'Escape') {
      cancelLink();
      clearSelection();
    } else return;
    e.preventDefault();
  };

  const activate = (action: () => void) => (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  const linkSource = linkFrom !== null ? byId.get(linkFrom) : null;
  const openStory = selected && !coarse ? byId.get(selected.id) : null;
  const dragNode = drag ? nodeById.get(drag.from) : null;

  const hint = coarse
    ? edge
      ? `${groupLabel(edge.from)} depends on ${groupLabel(edge.to)}: ${detailPairs!.length} story ${detailPairs!.length === 1 ? 'link' : 'links'}.`
      : selectedGroup
        ? `${groupLabel(selectedGroup.id)}: the ${level} it depends on and that depend on it are highlighted.`
        : hasNodes
          ? `Read-only overview. Select a node or an arrow to see the story links behind it; dependencies are edited at the Stories level.`
          : ''
    : linkSource
      ? `${linkSource.code || title(linkSource)} depends on… choose a story (Escape cancels).`
      : edge
        ? `${byId.get(edge.from)?.code} depends on ${byId.get(edge.to)?.code}.`
        : selected
          ? `${openStory?.code}: its dependencies and dependents are highlighted.`
          : focus
            ? 'The stories of the chosen group or link are highlighted. Select the background to clear.'
            : hasNodes
              ? 'Drag from a story’s dot onto the story it depends on to link them. Ctrl+wheel zooms, drag the background to pan.'
              : '';

  // Handlers the parts call: selecting an arrow, starting or cancelling a link, ending a gesture.
  const pickEdge = (key: string, clearNote: boolean) => {
    setSelectedId(null);
    setSelectedEdge(selectedEdge === key ? null : key);
    if (clearNote) setNote('');
  };
  const toggleLinkFromSelected = () => setLinkFrom(linkFrom === null ? selected!.id : null);
  const toggleLinkFrom = (id: number) => {
    clearSelection();
    setLinkFrom(linkFrom === id ? null : id);
  };
  const cancelGesture = () => {
    gesture.current = null;
    setDrag(null);
  };

  return (
    <section id="graphView" className="card graph-view" role="tabpanel" aria-labelledby="tabGraph" hidden={hidden}>
      <TabHeader title="Dependency graph" />
      <GraphToolbar
        level={level} onChooseLevel={chooseLevel} hasNodes={hasNodes} coarse={coarse} zoomPercent={Math.round(view.k * 100)}
        onZoomOut={() => zoomBy(1 / ZOOM_STEP)} onZoomIn={() => zoomBy(ZOOM_STEP)} onFit={fit}
        linking={linkFrom !== null} canLink={Boolean(selected && openStory?.code)} onToggleLink={toggleLinkFromSelected}
        canRemove={Boolean(edge) && !coarse} onRemove={() => edge && removeEdge(edge)}
        canOpen={Boolean(selected)} onOpenInEditor={() => openStory && onOpen(openStory.id)} hint={hint}
      />
      <GraphDetail detailPairs={detailPairs ?? null} byId={byId} onOpen={onOpen} onShowStories={showStories} />
      {note && <p className="warning graph-note" role="alert">{note}</p>}

      <GraphCanvas
        panelRef={panel} hasNodes={hasNodes} stories={stories} level={level} coarse={coarse} grouping={grouping} layout={layout}
        bands={bands} view={view} byId={byId} nodeById={nodeById} epicHue={epicHue} problems={problems}
        selected={selected} selectedEdge={selectedEdge} linkFrom={linkFrom} drag={drag} dragNode={dragNode}
        lit={lit} litEdge={litEdge} groupLabel={groupLabel} activate={activate}
        clickNode={clickNode} onPickEdge={pickEdge} onOpen={onOpen} onKeyDown={onKeyDown}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={cancelGesture}
      />

      {coarse && layout.cyclic && (
        <ul className="muted graph-notes">
          {grouping!.mutual.map(([a, b]) => <li key={`${a}>${b}`}>{groupLabel(a)} and {groupLabel(b)} depend on each other.</li>)}
          {grouping!.mutual.length === 0 && <li>Some {level} depend on each other in a circle.</li>}
        </ul>
      )}
      {!coarse && (layout.cyclic || layout.unresolved.length > 0) && (
        <ul className="warning graph-notes">
          {layout.cyclic && <li>This backlog has a dependency cycle. The stories in it are marked.</li>}
          {layout.unresolved.map((u) => <li key={`${u.from}-${u.code}`}>{byId.get(u.from)?.code} lists {u.code}, which no story has.</li>)}
        </ul>
      )}
      <GraphUnlinked
        coarse={coarse} layout={layout} grouping={grouping} groupLabel={groupLabel} problems={problems}
        linkFrom={linkFrom} link={link} onToggleLink={toggleLinkFrom} onOpen={onOpen}
      />
    </section>
  );
}
