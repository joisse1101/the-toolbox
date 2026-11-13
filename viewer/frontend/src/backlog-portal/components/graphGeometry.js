// Sizes and path geometry of the dependency graph, shared by the canvas and the tab that lays it out.
export const NODE_W = 192;
export const NODE_H = 46;
export const GAP_X = 96;
export const GAP_Y = 22;
export const BAND_PAD = 14;
export const LABEL_H = 26;
export const BAND_GAP = 28;
export const MAX_TITLE = 20;
export const MIN_LABEL_ZOOM = 0.5; // below this the weight labels on arrows are left out

export const slot = (layer, row, top) => ({ x: BAND_PAD + layer * (NODE_W + GAP_X), y: top + LABEL_H + BAND_PAD + row * (NODE_H + GAP_Y) });
export const edgeKey = (e) => `${e.from}>${e.to}`;
export const clip = (text) => (text.length > MAX_TITLE ? `${text.slice(0, MAX_TITLE - 1)}…` : text);

// Each cluster is a band: a label strip, then its rows. Returns the band tops, widths and heights, and the bounds of all.
export function bandGeometry(layout) {
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
export function edgePath(from, to, via, top, back) {
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
