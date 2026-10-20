import { useState } from 'react';
import { groupByEpic, storyIssues, storyLabel } from '../../../../core/model.js';
import { openCount } from '../../../../core/story-text.js';
import { anyOpen, epicKey, featureKey } from '../../../../core/collapse.js';
import { groupLockState } from '../../../../core/ids.js';
import { issueClass, rowTooltip } from './issues.js';

const LOCK_MARK = { all: '🔒', some: '◐', none: '🔓' };

// The head's lock button: its mark is the group's state (derived from its stories) and a click locks the group, or
// unlocks it when every story is locked. It must neither fold the group nor start a drag of it.
function GroupLock({ name, stories, onLockGroup }) {
  const state = groupLockState(stories);
  const lock = state !== 'all';
  const n = stories.length;
  const label = `${lock ? 'Lock' : 'Unlock'} ${n === 1 ? '1 story' : `${n} stories`} in ${name}`;
  const stop = (e) => e.stopPropagation();
  return (
    <button
      type="button" className={`group-lock ${state}`} title={label} aria-label={label} draggable={false}
      onClick={(e) => { e.stopPropagation(); onLockGroup(stories, lock); }} onKeyDown={stop} onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >{LOCK_MARK[state]}</button>
  );
}

// Drag a story to reorder it inside its epic, or onto another epic's group to move it there. Dropping on the
// "(No epic)" group does nothing. `drag` is the story being dragged, `drop` = { epic, beforeId } where it would land
// (beforeId null = at the end of the group).
// With `onMoveGroup`, an epic or feature head drags its whole group (collapsed or not): `groupDrag` = { epic } or
// { epic, feature }, `groupDrop` = { beforeKey } (the epic or feature it lands before, null = last). Only group
// boundaries accept a drop: the upper half of a head, or the lower half of the last visible row of a group, which
// stands for "before the next group". A feature can only land among the features of its own epic.
// With `collapse` ({ closed, toggleKey, toggleLevel }, from useCollapsed) the folded groups live outside the list and the
// panel offers buttons to fold every epic or every feature; without it the list keeps its own folds, forgotten on reload.
export default function StoryList({ stories, problems, suggestionCounts = new Map(), selectedId, onSelect, onAdd, onMove, onMoveGroup, onLockGroup, onRenumber, renumberDisabled, heading = 'Stories', checked, onToggle, collapse }) {
  const [drag, setDrag] = useState(null);
  const [drop, setDrop] = useState(null);
  const [groupDrag, setGroupDrag] = useState(null);
  const [groupDrop, setGroupDrop] = useState(null);
  const [localClosed, setLocalClosed] = useState(() => new Set()); // collapsed accordion keys; everything starts open

  const closed = collapse ? collapse.closed : localClosed;
  const toggle = collapse ? collapse.toggleKey : (key) => setLocalClosed((prev) => {
    const next = new Set(prev);
    if (!next.delete(key)) next.add(key);
    return next;
  });
  const epicGroups = groupByEpic(stories);
  const toggleKey = (e, key) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(key);
    }
  };

  const over = (e, group, beforeId) => {
    if (drag === null || !group.epic) return; // not preventing default = not a drop target
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (drop?.epic !== group.epic || drop?.beforeId !== beforeId) setDrop({ epic: group.epic, beforeId });
  };
  const end = () => {
    setDrag(null);
    setDrop(null);
    setGroupDrag(null);
    setGroupDrop(null);
  };
  // `ctx` describes the row: { epic, head: 'epic' | 'feature' | undefined, feature, epicAfter, featureAfter }; an
  // `...After` field is set on the last visible row of that group and names the group that follows (null = none).
  const groupOver = (e, ctx) => {
    if (!groupDrag) return;
    const r = e.currentTarget.getBoundingClientRect();
    const upper = e.clientY < r.top + r.height / 2;
    let target;
    if (groupDrag.feature === undefined) {
      if (ctx.head === 'epic' && upper) target = ctx.epic;
      else if (ctx.epicAfter !== undefined && !upper) target = ctx.epicAfter;
    } else if (ctx.epic === groupDrag.epic) {
      if (ctx.head === 'feature' && upper) target = ctx.feature;
      else if (ctx.featureAfter !== undefined && !upper) target = ctx.featureAfter;
    }
    if (target === undefined) return setGroupDrop(null);
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (groupDrop?.beforeKey !== target) setGroupDrop({ beforeKey: target });
  };
  const groupMark = (ctx) => {
    if (!groupDrag || !groupDrop) return '';
    const key = groupDrop.beforeKey;
    if (groupDrag.feature === undefined) {
      if (key !== null) return ctx.head === 'epic' && ctx.epic === key ? 'drop-before' : '';
      return ctx.epicAfter === null ? 'drop-after' : '';
    }
    if (ctx.epic !== groupDrag.epic) return '';
    if (key !== null) return ctx.head === 'feature' && ctx.feature === key ? 'drop-before' : '';
    return ctx.epicAfter !== undefined ? 'drop-after' : '';
  };
  const startGroupDrag = (e, group) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', group.feature === undefined ? group.epic : `${group.epic}\n${group.feature}`); // Firefox needs data to start a drag
    setGroupDrag(group);
  };
  const dropHere = (e) => {
    if (groupDrag) {
      if (groupDrop) {
        e.preventDefault();
        onMoveGroup(groupDrag, groupDrop.beforeKey);
      }
      return end();
    }
    if (drag === null || !drop) return end();
    e.preventDefault();
    onMove(drag, drop.epic, drop.beforeId);
    end();
  };

  return (
    <aside className="card story-list-panel">
      {collapse ? (
        <div className="story-list-head">
          <h2>{heading}</h2>
          <div className="group-toggles">
            {['epic', 'feature'].map((level) => (
              <button
                key={level} type="button" id={`${level}TogglesBtn`} disabled={!epicGroups.length}
                onClick={() => collapse.toggleLevel(level)}
              >{`${anyOpen(closed, epicGroups, level) ? 'Collapse' : 'Expand'} ${level}s`}</button>
            ))}
          </div>
        </div>
      ) : <h2>{heading}</h2>}
      <ul id="storyList" className="story-list" onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setDrop(null); setGroupDrop(null); } }}>
        {epicGroups.flatMap((group, gi, groups) => {
          const nextEpic = groups[gi + 1]?.epic ?? null;
          const epicClosed = closed.has(epicKey(group.epic));
          const epicCtx = { epic: group.epic, head: 'epic', epicAfter: epicClosed ? nextEpic : undefined };
          return [
          <li
            key={`epic:${group.epic}`} title={group.label}
            className={['epic-head accordion-head', groupDrag?.feature === undefined && groupDrag?.epic === group.epic ? 'dragging' : '', groupMark(epicCtx)].join(' ').trim()}
            role="button" tabIndex={0} aria-expanded={!epicClosed}
            draggable={Boolean(onMoveGroup && group.epic)}
            onDragStart={(e) => startGroupDrag(e, { epic: group.epic })} onDragEnd={end}
            onClick={() => toggle(epicKey(group.epic))} onKeyDown={(e) => toggleKey(e, epicKey(group.epic))}
            onDragOver={(e) => (groupDrag ? groupOver(e, epicCtx) : over(e, group, group.stories[0]?.id ?? null))} onDrop={dropHere}
          >
            {onLockGroup && <GroupLock name={group.label} stories={group.stories} onLockGroup={onLockGroup} />}
            {`${epicClosed ? '▸' : '▾'} ${group.label} (${group.stories.length})`}
          </li>,
          ...(epicClosed ? [] : group.features.flatMap((fg, fi) => {
            const nextFeature = group.features[fi + 1]?.feature ?? null;
            const lastFeature = fi === group.features.length - 1;
            const featureClosed = closed.has(featureKey(group.epic, fg.feature));
            const headCtx = { epic: group.epic, head: 'feature', feature: fg.feature, featureAfter: featureClosed ? nextFeature : undefined, epicAfter: featureClosed && lastFeature ? nextEpic : undefined };
            return [
            <li
              key={`feature:${group.epic}:${fg.feature}`} title={fg.label}
              className={['feature-head accordion-head', groupDrag?.feature === fg.feature && groupDrag.epic === group.epic ? 'dragging' : '', groupMark(headCtx)].join(' ').trim()}
              role="button" tabIndex={0} aria-expanded={!featureClosed}
              draggable={Boolean(onMoveGroup && group.epic)}
              onDragStart={(e) => startGroupDrag(e, { epic: group.epic, feature: fg.feature })} onDragEnd={end}
              onClick={() => toggle(featureKey(group.epic, fg.feature))} onKeyDown={(e) => toggleKey(e, featureKey(group.epic, fg.feature))}
              onDragOver={(e) => (groupDrag ? groupOver(e, headCtx) : over(e, group, fg.stories[0]?.id ?? null))} onDrop={dropHere}
            >
              {onLockGroup && <GroupLock name={fg.label} stories={fg.stories} onLockGroup={onLockGroup} />}
              {`${featureClosed ? '▸' : '▾'} ${fg.label} (${fg.stories.length})`}
            </li>,
            ...(featureClosed ? [] : fg.stories.map((s, i) => {
            const { errors, warnings } = storyIssues(s, problems.get(s.id));
            const next = fg.stories[i + 1];
            const rowCtx = { epic: group.epic, featureAfter: next ? undefined : nextFeature, epicAfter: next || !lastFeature ? undefined : nextEpic };
            const marker = groupDrag ? groupMark(rowCtx) : drop?.epic === group.epic && drag !== null
              ? (drop.beforeId === s.id ? 'drop-before' : drop.beforeId === null && !next ? 'drop-after' : '')
              : '';
            return (
              <li
                key={s.id}
                className={['in-feature', s.id === selectedId ? 'selected' : '', (s.benched ? '' : issueClass(errors, warnings)), s.id === drag ? 'dragging' : '', marker].join(' ').trim()}
                title={rowTooltip(s, errors, warnings)}
                draggable={!s.locked}
                onClick={() => onSelect(s.id)}
                onDragStart={(e) => {
                  if (s.locked) return e.preventDefault(); // a locked story stays where it is
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(s.id)); // Firefox needs data to start a drag
                  setDrag(s.id);
                }}
                onDragEnd={end}
                onDragOver={(e) => {
                  if (groupDrag) return groupOver(e, rowCtx);
                  const r = e.currentTarget.getBoundingClientRect();
                  over(e, group, e.clientY < r.top + r.height / 2 ? s.id : next?.id ?? null);
                }}
                onDrop={dropHere}
              >
                {onToggle && (
                  <input
                    type="checkbox" className="row-check" checked={checked?.has(s.id) ?? false}
                    aria-label={`Select ${storyLabel(s)}`}
                    onClick={(e) => e.stopPropagation()} onChange={() => onToggle(s.id)}
                  />
                )}
                {s.locked && <span className="lock-mark" title="Locked: reference only" aria-label="Locked">🔒</span>}
                {s.benched && <span className="lock-mark" title="Benched: ignored by the explore and propose skills" aria-label="Benched">🪑</span>}
                {s.code && <span className="code">{s.code}</span>}
                <span className="title">{storyLabel(s)}</span>
                {suggestionCounts.get(s.code) > 0 && (
                  <span className="suggestion-badge" title={`${suggestionCounts.get(s.code)} review suggestion(s)`} aria-label={`${suggestionCounts.get(s.code)} review suggestions`}>{suggestionCounts.get(s.code)}</span>
                )}
                {openCount(s.clarifications) > 0 && (
                  <span className="open-badge" title={`${openCount(s.clarifications)} open question(s) in Clarifications`}>{`${openCount(s.clarifications)} open`}</span>
                )}
                <span className="badge">{s.points || '–'}</span>
              </li>
            );
            })),
            ];
          })),
          ];
        })}
        {!stories.length && <li className="muted" style={{ cursor: 'default' }}>No stories yet.</li>}
      </ul>
      {onAdd && <div className="row">
        <button type="button" id="addStoryBtn" className="primary" onClick={onAdd}>Add story</button>
        {onRenumber && (
          <button
            type="button" id="renumberBtn" onClick={onRenumber} disabled={renumberDisabled}
            title={renumberDisabled ? 'The IDs already follow the order shown' : "Put each feature's stories together, in the order shown, and renumber them. Locked stories keep their IDs."}
          >Renumber</button>
        )}
      </div>}
    </aside>
  );
}
