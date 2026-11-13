// The search box, the Priority / Epic / Feature filters and the clear button.
export default function StoriesFilters({ query, filter, options, filtering, onQuery, onFilter, onClear }) {
  return (
    <div className="row stories-search">
      <div className="grow">
        <input id="storiesSearch" type="text" autoComplete="off" value={query} placeholder="Search any word in any field of a story" onChange={(e) => onQuery(e.target.value)} />
      </div>
      {[['priority', 'Priority'], ['epic', 'Epic'], ['feature', 'Feature']].map(([key, label]) => (
        <div key={key}>
          <label htmlFor={`filter-${key}`}>{label}</label>
          <select id={`filter-${key}`} value={filter[key]} onChange={(e) => onFilter(key, e.target.value)}>
            <option value="">All</option>
            {options[key].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      ))}
      <button type="button" id="clearFiltersBtn" aria-label="Clear filters" title="Clear filters" disabled={!filtering} onClick={onClear}>X</button>
    </div>
  );
}
