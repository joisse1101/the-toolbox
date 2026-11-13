import { storyLabel as title } from '../../../../logic/backlog/model.js';

// Coarse levels: the story dependencies behind the selected group or arrow, and a button to show them as stories.
export default function GraphDetail({ detailPairs, byId, onOpen, onShowStories }) {
  if (!detailPairs) return null;
  return (
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
      <button type="button" id="graphShowStories" onClick={onShowStories}>Show stories</button>
    </div>
  );
}
