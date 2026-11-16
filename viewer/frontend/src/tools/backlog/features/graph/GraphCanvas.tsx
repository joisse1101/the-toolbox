import type { KeyboardEvent, PointerEvent, RefObject } from 'react';
import type { Story } from '#shared/types.ts';
import type { GraphEdge, GraphLayout, GraphLevel, GraphNode, GraphView, Point, groupStories } from './graph.ts';
import EmptyState from '#frontend/src/shared/ui/EmptyState.tsx';
import { storyIssues, storyLabel as title } from '#shared/backlog/model.ts';
import { issueClass, rowTooltip } from '#frontend/src/tools/backlog/shared/issues.ts';
import { stateWord } from '#frontend/src/shared/ui/StateMark.tsx';
import { NODE_W, NODE_H, BAND_PAD, MIN_LABEL_ZOOM, slot, edgeKey, clip, edgePath } from './graphGeometry.ts';
import type { bandGeometry } from './graphGeometry.ts';

// The graph surface: cluster bands, arrows, nodes and the rubber band of a link being dragged. Everything it shows
// and every gesture it receives comes from GraphTab through props.
export default function GraphCanvas({
  panelRef, hasNodes, stories, level, coarse, grouping, layout, bands, view, byId, nodeById, epicHue, problems,
  selected, selectedEdge, linkFrom, drag, dragNode, lit, litEdge, groupLabel, activate,
  clickNode, onPickEdge, onOpen, onKeyDown, onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
}: {
  panelRef: RefObject<HTMLDivElement | null>;
  hasNodes: boolean;
  stories: Story[];
  level: GraphLevel;
  coarse: boolean;
  grouping: ReturnType<typeof groupStories> | null;
  layout: GraphLayout;
  bands: ReturnType<typeof bandGeometry>['bands'];
  view: GraphView;
  byId: Map<number, Story>;
  nodeById: Map<number, GraphNode>;
  epicHue: Map<string, number>;
  problems: Map<number, string[]>;
  selected: GraphNode | null;
  selectedEdge: string | null;
  linkFrom: number | null;
  drag: { from: number; point: Point } | null;
  dragNode: GraphNode | null | undefined;
  lit: (id: number) => boolean;
  litEdge: (e: GraphEdge) => boolean;
  groupLabel: (id: number) => string;
  activate: (action: () => void) => (e: KeyboardEvent) => void;
  clickNode: (id: number) => void;
  onPickEdge: (key: string, clearNote: boolean) => void;
  onOpen: (id: number) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerCancel: () => void;
}) {
  const pos = (node: GraphNode) => slot(node.layer, node.row, bands[node.cluster].top);

  if (!hasNodes) {
    return (
    <div id="graphEmpty">
      <EmptyState
        title={coarse ? `No dependencies between ${level} yet` : stories.length ? 'No dependencies yet' : 'No stories yet'}
        help={stories.length ? 'Select a story, choose Link, then pick the story it depends on.' : 'Add a story in the Editor tab first.'}
      />
    </div>
    );
  }
  return (
    <div
      ref={panelRef} className="graph-panel" tabIndex={0} onKeyDown={onKeyDown}
      aria-label="Dependency graph. Plus and minus zoom, arrow keys pan, 0 fits the whole graph."
    >
      <svg
        className={`graph-svg${drag ? ' linking' : ''}${linkFrom !== null ? ' choosing' : ''}`}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
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
            const from = nodeById.get(e.from)!;
            const to = nodeById.get(e.to)!;
            const d = edgePath(from, to, e.via, bands[from.cluster].top, e.back);
            const on = selectedEdge === edgeKey(e);
            const marker = e.back ? 'back' : on ? 'hi' : '';
            const cls = ['graph-edge', e.back ? 'back' : '', on ? 'selected' : '', litEdge(e) ? '' : 'dim'].filter(Boolean).join(' ');
            const weight = coarse ? grouping!.pairs.get(edgeKey(e))!.length : 0;
            const mid = {
              x: (slot(from.layer, 0, 0).x + slot(to.layer, 0, 0).x + NODE_W) / 2,
              y: (slot(0, from.row, bands[from.cluster].top).y + slot(0, to.row, bands[from.cluster].top).y + NODE_H) / 2 - 5,
            };
            return (
              <g
                key={edgeKey(e)} className={cls} data-edge={edgeKey(e)} aria-hidden="true"
                onClick={() => onPickEdge(edgeKey(e), true)}
              >
                <path d={d} className="graph-edge-hit" />
                <path d={d} className="graph-edge-line" markerEnd={`url(#graph-arrow${marker ? `-${marker}` : ''})`} />
                {coarse && view.k >= MIN_LABEL_ZOOM && <text className="graph-edge-weight" x={mid.x} y={mid.y}>{weight}</text>}
              </g>
            );
          })}
          {coarse && layout.nodes.map((n) => {
            const g = grouping!.groups.get(n.id)!;
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
            const s = byId.get(n.id)!;
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
                <text className="graph-node-state" x={NODE_W - 8} y="18" textAnchor="end">{[selected?.id === n.id ? 'Selected' : '', stateWord(issueClass(errors, warnings))].filter(Boolean).join(' · ')}</text>
                <text className="graph-node-title" x="16" y="35">{clip(title(s))}</text>
                <circle className="graph-handle" data-handle={n.id} cx="0" cy={NODE_H / 2} r="7"><title>Drag onto the story this one depends on</title></circle>
              </g>
            );
          })}
          {/* Keyboard stops for the edges come after every node in the DOM, so Tab visits nodes first; the drawn lines above stay under the nodes. */}
          {layout.edges.map((e) => {
            const from = nodeById.get(e.from)!;
            const to = nodeById.get(e.to)!;
            const key = edgeKey(e);
            const on = selectedEdge === key;
            const label = coarse
              ? `${groupLabel(e.from)} depends on ${groupLabel(e.to)}`
              : `${byId.get(e.from)!.code} depends on ${byId.get(e.to)!.code}`;
            return (
              <g
                key={key} className="graph-edge-key" data-edge-key={key} tabIndex={0} role="button" aria-label={label} aria-pressed={on}
                onKeyDown={activate(() => onPickEdge(key, false))}
              >
                <title>{label}</title>
                <path d={edgePath(from, to, e.via, bands[from.cluster].top, e.back)} className="graph-edge-focus-line" />
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
  );
}
