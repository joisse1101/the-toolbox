const LEVELS = [['stories', 'Stories'], ['features', 'Features'], ['epics', 'Epics']];

// The strip above the graph: detail level, zoom, the Link / Remove / Open actions, the hint line and the legend.
export default function GraphToolbar({
  level, onChooseLevel, hasNodes, coarse, zoomPercent, onZoomOut, onZoomIn, onFit,
  linking, canLink, onToggleLink, canRemove, onRemove, canOpen, onOpenInEditor, hint,
}) {
  return (
    <>
      <div className="graph-bar">
        <div className="graph-levels" role="group" aria-label="Detail level">
          {LEVELS.map(([key, label]) => (
            <button
              key={key} type="button" id={`graphLevel-${key}`} aria-pressed={level === key}
              title={key === 'stories' ? 'Every story and dependency' : `Dependencies between ${key}`} onClick={() => onChooseLevel(key)}
            >{label}</button>
          ))}
        </div>
        <button type="button" id="graphZoomOut" aria-label="Zoom out" title="Zoom out (-)" disabled={!hasNodes} onClick={onZoomOut}>−</button>
        <span className="graph-zoom" aria-live="polite">{zoomPercent}%</span>
        <button type="button" id="graphZoomIn" aria-label="Zoom in" title="Zoom in (+)" disabled={!hasNodes} onClick={onZoomIn}>+</button>
        <button type="button" id="graphFit" title="Fit the whole graph (0)" disabled={!hasNodes} onClick={onFit}>Fit</button>
        <span className="graph-sep" />
        <button
          type="button" id="graphLink" aria-pressed={linking} disabled={!canLink}
          title="Choose the story the selected one depends on" onClick={onToggleLink}
        >Link</button>
        <button type="button" id="graphRemove" disabled={!canRemove} title="Remove the selected dependency (Delete)" onClick={onRemove}>Remove dependency</button>
        <button type="button" id="graphOpen" disabled={!canOpen} onClick={onOpenInEditor}>Open in Editor</button>
      </div>
      <p className="graph-hint muted" role="status" aria-live="polite">
        {hint}
      </p>
      {hasNodes && (
        <ul className="graph-legend muted" aria-label="Legend">
          {!coarse && <li><span className="legend-swatch node" />Complete story</li>}
          {!coarse && <li><span className="legend-swatch node incomplete" />Incomplete: a required field is missing</li>}
          {!coarse && <li><span className="legend-swatch node warn" />Warning: see the tooltip</li>}
          <li><span className="legend-swatch stripe" />Stripe colour: the epic</li>
          <li><span className="legend-swatch node selected" />Selected: thick accent border; its dependencies and dependents stay bright and the rest fade</li>
          <li><span className="legend-swatch line" />Arrow: points at what the story depends on</li>
          <li><span className="legend-swatch line back" />Dashed red arrow: a dependency cycle</li>
        </ul>
      )}
    </>
  );
}
