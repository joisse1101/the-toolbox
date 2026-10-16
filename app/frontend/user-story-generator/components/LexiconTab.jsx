import { useEffect, useMemo, useState } from 'react';
import { childrenOf } from '../../../../core/lexicon.js';

const blankDraft = { name: '', partOf: '', definition: '', avoid: '', notes: '' };
const toDraft = (t) => ({ name: t.name, partOf: t.partOf, definition: t.definition, avoid: t.avoid.join(', '), notes: t.notes });
const toTerm = (d) => ({ name: d.name, partOf: d.partOf, definition: d.definition, avoid: d.avoid.split(','), notes: d.notes });
const same = (a, b) => Object.keys(blankDraft).every((k) => a[k] === b[k]);
const key = (s) => s.trim().toLowerCase();

// The terms in reading order: each one followed by the terms that are part of it, with its depth for the indent.
function inTreeOrder(terms) {
  const known = new Set(terms.map((t) => key(t.name)));
  const out = [];
  const seen = new Set();
  const add = (term, depth) => {
    if (seen.has(term)) return;
    seen.add(term);
    out.push({ term, depth });
    terms.filter((t) => key(t.partOf) === key(term.name)).forEach((child) => add(child, depth + 1));
  };
  terms.filter((t) => !t.partOf || !known.has(key(t.partOf))).forEach((t) => add(t, 0));
  terms.forEach((t) => add(t, 0)); // anything left over is in a cycle of a hand-edited file: still shown
  return out;
}

const matches = (t, q) => [t.name, t.definition, t.notes, ...t.avoid].some((text) => text.toLowerCase().includes(q));

// The Lexicon tab: the defined terms of the open backlog. A term's fields are saved when a field is left; a change a rule
// refuses (`error`, a list of messages) is shown and the term on screen stays as typed until it is fixed or discarded.
// `onSave(term, replaces)` and `onRemove(name)` return { ok }.
export default function LexiconTab({ hidden, lexicon, selected, error, message, onSelect, onSave, onRemove, onClearError }) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const q = query.trim().toLowerCase();
  const rows = useMemo(() => inTreeOrder(lexicon.terms), [lexicon.terms]);
  const shown = q ? rows.filter((r) => matches(r.term, q)) : rows;
  const rawText = [lexicon.preamble, ...lexicon.terms.flatMap((t) => t.extra)].some((text) => text.trim());

  const start = () => {
    onClearError();
    setAdding(true);
  };
  const pick = (name) => {
    setAdding(false);
    onSelect(name);
  };

  return (
    <div id="lexiconView" className="editor" role="tabpanel" aria-labelledby="tabLexicon" hidden={hidden}>
      {!hidden && (
        <>
          <div className="card story-list-panel">
            <div className="row">
              <div className="grow">
                <label htmlFor="lexiconSearch">Search</label>
                <input id="lexiconSearch" type="text" value={query} placeholder="term, definition or avoided word" onChange={(e) => setQuery(e.target.value)} />
              </div>
              <button type="button" id="addTermBtn" className="primary" onClick={start}>Add term</button>
            </div>
            <ul className="story-list lexicon-list" style={{ marginTop: 10 }}>
              {shown.map(({ term, depth }) => (
                <li key={term.name} className={!adding && selected?.name === term.name ? 'selected' : ''} style={{ marginLeft: depth * 16 }} onClick={() => pick(term.name)}>
                  <span className="title">{term.name}</span>
                  {term.avoid.length > 0 && <span className="badge" title={`Avoid: ${term.avoid.join(', ')}`}>{`avoid ${term.avoid.length}`}</span>}
                </li>
              ))}
            </ul>
            {!lexicon.terms.length && <p className="muted">No terms yet. Add one, or use propose-stories to draft some.</p>}
            {lexicon.terms.length > 0 && !shown.length && <p className="muted">No term matches “{query}”.</p>}
            {rawText && (
              <details>
                <summary className="muted">Text kept as written</summary>
                <p className="muted">These lines are not terms or fields. They are kept in the file but cannot be edited here.</p>
                {lexicon.preamble.trim() && <pre className="preview">{lexicon.preamble}</pre>}
                {lexicon.terms.filter((t) => t.extra.length).map((t) => <pre key={t.name} className="preview">{`${t.name}\n${t.extra.join('\n')}`}</pre>)}
              </details>
            )}
          </div>
          <div>
            {message && <p className="warning" role="status">{message}</p>}
            {adding && (
              <TermForm
                key="new" term={null} lexicon={lexicon} error={error}
                onSave={(term) => {
                  const result = onSave(term, null);
                  if (result.ok) setAdding(false);
                  return result;
                }}
                onCancel={() => { setAdding(false); onClearError(); }}
              />
            )}
            {!adding && selected && (
              <TermForm
                key={`term-${lexicon.terms.findIndex((t) => t.name === selected.name)}`} term={selected} lexicon={lexicon} error={error}
                onSave={(term) => onSave(term, selected.name)}
                onRemove={() => confirm(`Delete the term "${selected.name}"?`) && onRemove(selected.name)}
              />
            )}
            {!adding && !selected && lexicon.terms.length > 0 && <p className="card muted">Select a term to see it.</p>}
          </div>
        </>
      )}
    </div>
  );
}

// An existing term (`term`) saves itself when a field is left; a new one (`term` null) waits for Add.
function TermForm({ term, lexicon, error, onSave, onRemove, onCancel }) {
  const [draft, setDraft] = useState(() => (term ? toDraft(term) : blankDraft));
  const saved = term ? toDraft(term) : blankDraft;
  const signature = JSON.stringify(saved);
  // The term changed under the form (a save, or the file was reloaded): show what is stored.
  useEffect(() => setDraft(term ? toDraft(term) : blankDraft), [signature]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (field) => (e) => setDraft((d) => ({ ...d, [field]: e.target.value }));
  const dirty = !same(draft, saved);
  const commit = (next = draft) => {
    if (term && !same(next, saved)) onSave(toTerm(next));
  };
  const parents = lexicon.terms.filter((t) => key(t.name) !== key(draft.name)).map((t) => t.name);
  const kids = term ? childrenOf(lexicon, term.name) : [];

  return (
    <form className="card story-form" id="termForm" onSubmit={(e) => { e.preventDefault(); if (!term) onSave(toTerm(draft)); }}>
      <h2>{term ? 'Term' : 'New term'}</h2>
      {error && (
        <div className="error" role="alert">
          {error.map((m) => <div key={m}>{m}</div>)}
          {term && dirty && <button type="button" className="link-btn" onClick={() => setDraft(saved)}>Discard my changes</button>}
        </div>
      )}
      <div className="grid3">
        <div>
          <label htmlFor="termName">Name</label>
          <input id="termName" type="text" value={draft.name} className={error && !draft.name.trim() ? 'missing' : ''} onChange={set('name')} onBlur={() => commit()} autoFocus={!term} />
        </div>
        <div>
          <label htmlFor="termPartOf">Part of</label>
          <select
            id="termPartOf" value={draft.partOf}
            onChange={(e) => { const next = { ...draft, partOf: e.target.value }; setDraft(next); commit(next); }}
          >
            <option value="">(none)</option>
            {draft.partOf && !parents.some((n) => key(n) === key(draft.partOf)) && <option value={draft.partOf}>{`${draft.partOf} (not a term)`}</option>}
            {parents.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="termDefinition">Definition</label>
        <textarea id="termDefinition" rows={3} value={draft.definition} onChange={set('definition')} onBlur={() => commit()} />
      </div>
      <div>
        <label htmlFor="termAvoid">Avoid (words stories must not use for this term, separated by commas)</label>
        <input id="termAvoid" type="text" value={draft.avoid} onChange={set('avoid')} onBlur={() => commit()} />
      </div>
      <div>
        <label htmlFor="termNotes">Notes</label>
        <textarea id="termNotes" rows={2} value={draft.notes} onChange={set('notes')} onBlur={() => commit()} />
      </div>
      {term?.extra.length > 0 && (
        <div>
          <div className="preview-label">Kept as written</div>
          <pre className="preview">{term.extra.join('\n')}</pre>
        </div>
      )}
      {kids.length > 0 && <p className="muted">Part of this term: {kids.map((k) => k.name).join(', ')}.</p>}
      <div className="row">
        {term ? (
          <button type="button" id="deleteTermBtn" className="danger" onClick={onRemove}>Delete term</button>
        ) : (
          <>
            <button type="submit" id="confirmAddBtn" className="primary" disabled={!draft.name.trim() || !draft.definition.trim()}>Add</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </>
        )}
      </div>
    </form>
  );
}
