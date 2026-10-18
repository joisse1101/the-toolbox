import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { storyIssues, storyLabel } from '../../../../core/model.js';
import { wouldCycle } from '../../../../core/ids.js';
import { layoutGraph, groupStories, relatedIds, fitView, zoomAt, panBy, toGraphPoint } from '../graph.js';
import { issueClass, rowTooltip } from './issues.js';

const NODE_W = 176;
const NODE_H = 46;
const GAP_X = 96;
const GAP_Y = 22;
const BAND_PAD = 14;
const LABEL_H = 26;
const BAND_GAP = 28;
const MAX_TITLE = 22;
const KEY_PAN = 48;
const ZOOM_STEP = 1.25;
const MIN_LABEL_ZOOM = 0.5; // below this the weight labels on arrows are left out
const LEVELS = [['stories', 'Stories'], ['features', 'Features'], ['epics', 'Epics']];

const slot = (layer, row, top) => ({ x: BAND_PAD + layer * (NODE_W + GAP_X), y: top + LABEL_H + BAND_PAD + row * (NODE_H + GAP_Y) });
const edgeKey = (e) => `${e.from}>${e.to}`;
const title = storyLabel;
const clip = (text) => (text.length > MAX_TITLE ? `${text.slice(0, MAX_TITLE - 1)}…` : text);

// Each cluster is a band: a label strip, then its rows. Returns the band tops, widths and heights, and the bounds of all.
function bandGeometry(layout) {
  const bands = [];
  let top = 0;
  for (const cluster of layout.clusters) {
    const maxLayer = Math.max(0, ...layout.nodes.filter((n) => n.cluster === cluster.index).map((n) => n.layer));
    const width = 2 * BAND_PAD + maxLayer * (NODE_W + GAP_X) + NODE_W;
    const height = LABEL_H + 2 * BAND_PAD + cluster.rows * (NODE_H + GAP_Y) - GAP_Y;
    bands.push({ top, width, height });
    top += height + BAND_GAP;
  }
  return { bands, bounds: { width: Math.max(0, ...bands.map((b) => b.width)), height: Math.max(0, top - BAND_GAP) } };
}

// From the dependent's left edge to the dependency's right edge, so arrows run right to left. A long arrow runs
// straight through its lane in each column it skips and curves only in the gaps between columns, so it never meets a node.
function edgePath(from, to, via, top, back) {
  const sx = slot(from.layer, 0, top).x;
  const sy = slot(0, from.row, top).y + NODE_H / 2;
  const ex = slot(to.layer, 0, top).x + NODE_W;
  const ey = slot(0, to.row, top).y + NODE_H / 2;
  if (back || !via.length) {
    const c = Math.max(40, Math.abs(sx - ex) / 2);
    return `M ${sx} ${sy} C ${sx - c} ${sy}, ${ex + c} ${ey}, ${ex} ${ey}`;
  }
  const curve = (x1, y1, x2, y2) => `C ${x1 - GAP_X / 2} ${y1}, ${x2 + GAP_X / 2} ${y2}, ${x2} ${y2}`;
  let d = `M ${sx} ${sy}`;
  let x = sx;
  let y = sy;
  for (const lane of via) {
    const left = slot(lane.layer, 0, top).x;
    const ly = slot(0, lane.row, top).y + NODE_H / 2;
    d += ` ${curve(x, y, left + NODE_W, ly)} L ${left} ${ly}`;
    x = left;
    y = ly;
  }
  return `${d} ${curve(x, y, ex, ey)}`;
}

// The dependencies as a layered graph that can be zoomed, panned and edited: drag from a node's handle onto the
// story it depends on, or use Link; select an arrow to remove it.
export default function GraphTab({ stories, problems, current, hidden, onOpen, onAddDependency, onRemoveDependency }) {
  const [level, setLevel] = useState('stories');
  const coarse = level !== 'stories'; // Features and Epics: groups of stories, read-only
  const grouping = useMemo(() => (coarse ? groupStories(stories, level) : null), [stories, level, coarse]);
  const layout = useMemo(() => layoutGraph(grouping ? grouping.items : stories), [stories, grouping]);
  const byId = useMemo(() => new Map(stories.map((s) => [s.id, s])), [stories]);
  const nodeById = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);
  const epicHue = useMemo(() => {
    const hues = new Map();
    for (const s of stories) {
      const epic = s.epic.trim();
      if (epic && !hues.has(epic)) hues.set(epic, (hues.size * 137) % 360);
    }
    return hues;
  }, [stories]);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [linkFrom, setLinkFrom] = useState(null); // story id: Link mode, the next story chosen is its dependency
  const [drag, setDrag] = useState(null); // { from: story id, point: graph coordinates } while a link is dragged
  const [focus, setFocus] = useState(null); // Set of story ids kept prominent after "Show stories", else null
  const [note, setNote] = useState('');
  const panel = useRef(null);
  const gesture = useRef(null);
  const fittedFor = useRef(null);

  const hasNodes = layout.nodes.length > 0;
  const { bands, bounds } = useMemo(() => bandGeometry(layout), [layout]);
  const pos = (node) => slot(node.layer, node.row, bands[node.cluster].top);

  const panelSize = () => {
    const r = panel.current?.getBoundingClientRect();
    return r ? { width: r.width, height: r.height } : { width: 0, height: 0 };
  };
  const fit = () => {
    const size = panelSize();
    if (!size.width) return false;
    setView(fitView(bounds, size));
    return true;
  };
  const zoomBy = (factor, point) => {
    const size = panelSize();
    setView((v) => zoomAt(v, point ?? { x: size.width / 2, y: size.height / 2 }, factor));
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

  // Ctrl+wheel (and a trackpad pinch) zooms about the pointer, the plain wheel pans. Needs a non-passive listener.
  useEffect(() => {
    const el = panel.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey) setView((v) => zoomAt(v, { x: e.clientX - r.left, y: e.clientY - r.top }, Math.exp(-e.deltaY * 0.003)));
      else if (e.shiftKey) setView((v) => panBy(v, -(e.deltaY || e.deltaX), 0));
      else setView((v) => panBy(v, -e.deltaX, -e.deltaY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [hasNodes]);

  const selected = nodeById.get(selectedId) ?? null;
  const edge = layout.edges.find((e) => edgeKey(e) === selectedEdge) ?? null;
  const related = useMemo(() => (selected ? relatedIds(layout.edges, selected.id) : null), [layout, selected]);
  const lit = (id) => (focus ? focus.has(id) : !related || id === selected.id || related.has(id));
  const litEdge = (e) => (focus || related ? lit(e.from) && lit(e.to) : true);

  const clearSelection = () => {
    setSelectedId(null);
    setSelectedEdge(null);
    setFocus(null);
  };

  // Features and Epics levels: the group names, and the story links behind the selected group or arrow.
  const groupLabel = (id) => {
    const g = grouping.groups.get(id);
    return level === 'features' ? `${g.epic} › ${g.name}` : g.name;
  };
  const selectedGroup = coarse && selected ? grouping.groups.get(selected.id) : null;
  const detailPairs = !coarse
    ? null
    : edge
      ? grouping.pairs.get(edgeKey(edge))
      : selectedGroup
        ? [...grouping.pairs].filter(([k]) => k.split('>').includes(String(selectedGroup.id))).flatMap(([, pairs]) => pairs)
        : null;
  const chooseLevel = (next) => {
    setLevel(next);
    clearSelection();
    setLinkFrom(null);
    setNote('');
  };
  const showStories = () => {
    const ids = edge ? detailPairs.flatMap((p) => [p.from, p.to]) : selectedGroup.storyIds;
    chooseLevel('stories');
    setFocus(new Set(ids));
  };
  const cancelLink = () => {
    gesture.current = null;
    setDrag(null);
    setLinkFrom(null);
  };

  // `fromId` comes to depend on `toId`.
  const link = (fromId, toId) => {
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

  const removeEdge = (e) => {
    if (coarse) return;
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (!from || !to) return;
    onRemoveDependency(from.id, to.code);
    setSelectedEdge(null);
    setNote('');
  };

  const clickNode = (id) => {
    if (linkFrom !== null) return link(linkFrom, id);
    setSelectedEdge(null);
    setSelectedId((cur) => (cur === id ? null : id));
    setNote('');
  };

  const panelPoint = (e) => {
    const r = panel.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const handle = e.target.closest('[data-handle]');
    const onItem = e.target.closest('[data-node], [data-edge]');
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

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g) return;
    if (g.type === 'pan') {
      const dx = e.clientX - g.last.x;
      const dy = e.clientY - g.last.y;
      g.last = { x: e.clientX, y: e.clientY };
      g.moved += Math.abs(dx) + Math.abs(dy);
      setView((v) => panBy(v, dx, dy));
    } else {
      setDrag({ from: g.id, point: toGraphPoint(view, panelPoint(e)) });
    }
  };

  const onPointerUp = (e) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.type === 'pan') {
      if (g.moved < 4) clearSelection();
      return;
    }
    setDrag(null);
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-node]');
    if (target) link(g.id, Number(target.dataset.node));
  };

  const onKeyDown = (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const pan = { ArrowLeft: [KEY_PAN, 0], ArrowRight: [-KEY_PAN, 0], ArrowUp: [0, KEY_PAN], ArrowDown: [0, -KEY_PAN] }[e.key];
    if (pan) setView((v) => panBy(v, ...pan));
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

  const activate = (action) => (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  const linkSource = linkFrom !== null ? byId.get(linkFrom) : null;
  const openStory = selected && !coarse ? byId.get(selected.id) : null;
  const dragNode = drag ? nodeById.get(drag.from) : null;

  return (
    <section id="graphView" className="card graph-view" role="tabpanel" aria-labelledby="tabGraph" hidden={hidden}>
      <div className="graph-bar">
        <div className="graph-levels" role="group" aria-label="Detail level">
          {LEVELS.map(([key, label]) => (
            <button
              key={key} type="button" id={`graphLevel-${key}`} aria-pressed={level === key}
              title={key === 'stories' ? 'Every story and dependency' : `Dependencies between ${key}`} onClick={() => chooseLevel(key)}
            >{label}</button>
          ))}
        </div>
        <button type="button" id="graphZoomOut" aria-label="Zoom out" title="Zoom out (-)" disabled={!hasNodes} onClick={() => zoomBy(1 / ZOOM_STEP)}>−</button>
        <span className="graph-zoom" aria-live="polite">{Math.round(view.k * 100)}%</span>
        <button type="button" id="graphZoomIn" aria-label="Zoom in" title="Zoom in (+)" disabled={!hasNodes} onClick={() => zoomBy(ZOOM_STEP)}>+</button>
        <button type="button" id="graphFit" title="Fit the whole graph (0)" disabled={!hasNodes} onClick={fit}>Fit</button>
        <span className="graph-sep" />
        <button
          type="button" id="graphLink" aria-pressed={linkFrom !== null} disabled={!selected || !openStory?.code}
          title="Choose the story the selected one depends on" onClick={() => setLinkFrom(linkFrom === null ? selected.id : null)}
        >Link</button>
        <button type="button" id="graphRemove" disabled={!edge || coarse} title="Remove the selected dependency (Delete)" onClick={() => edge && removeEdge(edge)}>Remove dependency</button>
        <button type="button" id="graphOpen" disabled={!selected} onClick={() => openStory && onOpen(openStory.id)}>Open in Editor</button>
      </div>
      <p className="graph-hint muted" role="status" aria-live="polite">
        {coarse
          ? edge
            ? `${groupLabel(edge.from)} depends on ${groupLabel(edge.to)}: ${detailPairs.length} story ${detailPairs.length === 1 ? 'link' : 'links'}.`
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
                    : ''}
      </p>
      {detailPairs && (
        <div className="graph-detail">
          <ul>
            {detailPairs.map((p) => (
              <li key={`${p.from}>${p.to}`}>
                <button type="button" className="link-btn" onClick={() => onOpen(p.from)}>{byId.get(p.from).code} {title(byId.get(p.from))}</button>
                {' depends on '}
                <button type="button" className="link-btn" onClick={() => onOpen(p.to)}>{byId.get(p.to).code} {title(byId.get(p.to))}</button>
              </li>
            ))}
          </ul>
          <button type="button" id="graphShowStories" onClick={showStories}>Show stories</button>
        </div>
      )}
      {note && <p className="warning graph-note" role="alert">{note}</p>}

      {hasNodes ? (
        <div
          ref={panel} className="graph-panel" tabIndex={0} onKeyDown={onKeyDown}
          aria-label="Dependency graph. Plus and minus zoom, arrow keys pan, 0 fits the whole graph."
        >
          <svg
            className={`graph-svg${drag ? ' linking' : ''}${linkFrom !== null ? ' choosing' : ''}`}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { gesture.current = null; setDrag(null); }}
          >
            <defs>
              {[['arrow', 'graph-arrow'], ['arrow-hi', 'graph-arrow hi'], ['arrow-back', 'graph-arrow back']].map(([id, cls]) => (
                <marker key={id} id={`graph-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" className={cls} />
                </marker>
              ))}
            </defs>
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {layout.clusters.map((c) => (
                <g key={c.index} className="graph-band" data-cluster={c.index}>
                  <rect className="graph-band-box" x="0" y={bands[c.index].top} width={bands[c.index].width} height={bands[c.index].height} rx="10" />
                  <text className="graph-band-label" x={BAND_PAD} y={bands[c.index].top + 18}>{`Cluster ${c.index + 1} · ${c.size} ${coarse ? level : 'stories'}`}</text>
                </g>
              ))}
              {layout.edges.map((e) => {
                const from = nodeById.get(e.from);
                const to = nodeById.get(e.to);
                const d = edgePath(from, to, e.via, bands[from.cluster].top, e.back);
                const on = selectedEdge === edgeKey(e);
                const marker = e.back ? 'back' : on ? 'hi' : '';
                const cls = ['graph-edge', e.back ? 'back' : '', on ? 'selected' : '', litEdge(e) ? '' : 'dim'].filter(Boolean).join(' ');
                const label = coarse
                  ? `${groupLabel(e.from)} depends on ${groupLabel(e.to)}`
                  : `${byId.get(e.from).code} depends on ${byId.get(e.to).code}`;
                const weight = coarse ? grouping.pairs.get(edgeKey(e)).length : 0;
                const mid = {
                  x: (slot(from.layer, 0, 0).x + slot(to.layer, 0, 0).x + NODE_W) / 2,
                  y: (slot(0, from.row, bands[from.cluster].top).y + slot(0, to.row, bands[from.cluster].top).y + NODE_H) / 2 - 5,
                };
                return (
                  <g
                    key={edgeKey(e)} className={cls} data-edge={edgeKey(e)} tabIndex={0} role="button" aria-label={label} aria-pressed={on}
                    onClick={() => { setSelectedId(null); setSelectedEdge(on ? null : edgeKey(e)); setNote(''); }}
                    onKeyDown={activate(() => { setSelectedId(null); setSelectedEdge(on ? null : edgeKey(e)); })}
                  >
                    <title>{label}</title>
                    <path d={d} className="graph-edge-hit" />
                    <path d={d} className="graph-edge-line" markerEnd={`url(#graph-arrow${marker ? `-${marker}` : ''})`} />
                    {coarse && view.k >= MIN_LABEL_ZOOM && <text className="graph-edge-weight" x={mid.x} y={mid.y}>{weight}</text>}
                  </g>
                );
              })}
              {coarse && layout.nodes.map((n) => {
                const g = grouping.groups.get(n.id);
                const { x, y } = pos(n);
                const hue = epicHue.get(g.epic);
                const counts = `${g.storyIds.length} ${g.storyIds.length === 1 ? 'story' : 'stories'}${g.internal ? ` · ${g.internal} internal` : ''}`;
                const cls = ['graph-node', 'group', selected?.id === n.id ? 'selected' : '', lit(n.id) ? '' : 'dim'].filter(Boolean).join(' ');
                return (
                  <g
                    key={n.id} className={cls} data-node={n.id} transform={`translate(${x} ${y})`} tabIndex={0} role="button"
                    aria-label={`${groupLabel(n.id)}, ${counts}`} aria-pressed={selected?.id === n.id}
                    onClick={() => clickNode(n.id)} onKeyDown={activate(() => clickNode(n.id))}
                  >
                    <title>{`${groupLabel(n.id)}\n${counts}`}</title>
                    {level === 'features' && <text className="graph-node-epiclabel" x="0" y="-5">{clip(g.epic)}</text>}
                    <rect className="graph-node-box" width={NODE_W} height={NODE_H} rx="6" />
                    <rect className="graph-node-epic" width="6" height={NODE_H} rx="3" style={hue === undefined ? undefined : { fill: `hsl(${hue} 62% 52%)` }} />
                    <text className="graph-node-code" x="16" y="18">{counts}</text>
                    <text className="graph-node-title" x="16" y="35">{clip(g.name)}</text>
                  </g>
                );
              })}
              {!coarse && layout.nodes.map((n) => {
                const s = byId.get(n.id);
                const { x, y } = pos(n);
                const { errors, warnings } = storyIssues(s, problems.get(s.id));
                const hue = epicHue.get(s.epic.trim());
                const cls = [
                  'graph-node', issueClass(errors, warnings), selected?.id === n.id ? 'selected' : '', linkFrom === n.id ? 'source' : '', lit(n.id) ? '' : 'dim',
                ].filter(Boolean).join(' ');
                return (
                  <g
                    key={n.id} className={cls} data-node={n.id} transform={`translate(${x} ${y})`} tabIndex={0} role="button"
                    aria-label={`${s.code} ${title(s)}`} aria-pressed={selected?.id === n.id}
                    onClick={() => clickNode(n.id)} onDoubleClick={() => onOpen(n.id)} onKeyDown={activate(() => clickNode(n.id))}
                  >
                    <title>{`${rowTooltip(s, errors, warnings)}${s.epic.trim() ? `\n\nEpic: ${s.epic.trim()}` : ''}`}</title>
                    <rect className="graph-node-box" width={NODE_W} height={NODE_H} rx="6" />
                    <rect className="graph-node-epic" width="6" height={NODE_H} rx="3" style={hue === undefined ? undefined : { fill: `hsl(${hue} 62% 52%)` }} />
                    <text className="graph-node-code" x="16" y="18">{s.code}</text>
                    <text className="graph-node-title" x="16" y="35">{clip(title(s))}</text>
                    <circle className="graph-handle" data-handle={n.id} cx="0" cy={NODE_H / 2} r="7"><title>Drag onto the story this one depends on</title></circle>
                  </g>
                );
              })}
              {drag && dragNode && (
                <path
                  className="graph-rubber" d={`M ${pos(dragNode).x} ${pos(dragNode).y + NODE_H / 2} L ${drag.point.x} ${drag.point.y}`}
                />
              )}
            </g>
          </svg>
        </div>
      ) : (
        <p className="muted graph-empty" id="graphEmpty">
          {coarse ? `No dependencies between ${level} yet.` : stories.length ? 'No dependencies yet.' : 'No stories yet.'}
        </p>
      )}

      {coarse && layout.cyclic && (
        <ul className="muted graph-notes">
          {grouping.mutual.map(([a, b]) => <li key={`${a}>${b}`}>{groupLabel(a)} and {groupLabel(b)} depend on each other.</li>)}
          {grouping.mutual.length === 0 && <li>Some {level} depend on each other in a circle.</li>}
        </ul>
      )}
      {!coarse && (layout.cyclic || layout.unresolved.length > 0) && (
        <ul className="warning graph-notes">
          {layout.cyclic && <li>This backlog has a dependency cycle. The stories in it are marked.</li>}
          {layout.unresolved.map((u) => <li key={`${u.from}-${u.code}`}>{byId.get(u.from)?.code} lists {u.code}, which no story has.</li>)}
        </ul>
      )}

      {coarse && layout.unlinked.length > 0 && (
        <div className="graph-unlinked">
          <h3 className="dep-heading">No dependencies</h3>
          <ul>
            {layout.unlinked.map((item) => {
              const g = grouping.groups.get(item.id);
              return <li key={item.id}>{groupLabel(item.id)} <span className="code">{g.storyIds.length} {g.storyIds.length === 1 ? 'story' : 'stories'}</span></li>;
            })}
          </ul>
        </div>
      )}

      {!coarse && layout.unlinked.length > 0 && (
        <div className="graph-unlinked">
          <h3 className="dep-heading">No dependencies</h3>
          <ul>
            {layout.unlinked.map((s) => {
              const { errors, warnings } = storyIssues(s, problems.get(s.id));
              return (
                <li key={s.id} className={issueClass(errors, warnings)}>
                  <button
                    type="button" className="link-btn" title={linkFrom !== null ? 'Make this the story it depends on' : rowTooltip(s, errors, warnings)}
                    onClick={() => (linkFrom !== null ? link(linkFrom, s.id) : onOpen(s.id))}
                  >
                    {s.code ? <span className="code">{s.code}</span> : null} {title(s)}
                  </button>
                  <button
                    type="button" className="graph-link-btn" disabled={!s.code} aria-label={`Link ${s.code || title(s)}`}
                    title={s.code ? 'Choose the story this one depends on' : 'A story needs an epic, and so an ID, before it can be linked.'}
                    onClick={() => { clearSelection(); setLinkFrom(linkFrom === s.id ? null : s.id); }}
                  >Link</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
