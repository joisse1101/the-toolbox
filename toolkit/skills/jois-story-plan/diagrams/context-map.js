// The context map of a backlog (planner/guidelines/diagram-conventions.md section 9): its checks, its comparison with the Epics
// of the backlog and the document composed from it. Pure: the caller passes the source object, the Epic names and the limits.
// The source is { contexts: [{ name, purpose, owner, epics, reason? }], relationships: [{ from, to, type, crosses }] }.

export const TBC = 'TBC';

const norm = (s) => String(s ?? '').trim().toLowerCase();
const text = (s) => String(s ?? '').trim();

// The distinct Epic names of a backlog's stories, in order of first appearance.
export function epicNames(stories) {
  const seen = new Map();
  for (const story of stories) {
    const name = text(story.epic);
    if (name && !seen.has(norm(name))) seen.set(norm(name), name);
  }
  return [...seen.values()];
}

const arrayOf = (value) => (Array.isArray(value) ? value : []);

function checkContext(context, index, problems) {
  const label = text(context?.name) ? `context "${text(context.name)}"` : `context #${index + 1}`;
  if (!text(context?.name)) problems.push(`${label} has no name.`);
  if (!text(context?.purpose)) problems.push(`${label} has no purpose.`);
  if (!text(context?.owner)) problems.push(`${label} has no owner (write ${TBC} when it is not known).`);
  const epics = arrayOf(context?.epics);
  if (epics.length === 0) problems.push(`${label} holds no Epic.`);
  if (epics.length > 1 && !text(context?.reason)) problems.push(`${label} holds ${epics.length} Epics and records no reason for the merge.`);
}

// -> [problem text]; empty when the map is sound. Tests facts only: coverage of the Epics, names, types and references.
export function checkContextMap(source, { epics, relationshipTypes }) {
  const problems = [];
  const contexts = arrayOf(source?.contexts);
  const relationships = arrayOf(source?.relationships);
  if (!Array.isArray(source?.contexts)) problems.push('The map has no contexts list.');
  if (source?.relationships !== undefined && !Array.isArray(source.relationships)) problems.push('relationships must be a list.');

  const contextNames = new Map();
  contexts.forEach((context, i) => {
    checkContext(context, i, problems);
    const key = norm(context?.name);
    if (!key) return;
    if (contextNames.has(key)) problems.push(`The context name "${text(context.name)}" is used twice.`);
    contextNames.set(key, text(context.name));
  });

  const known = new Map(epics.map((name) => [norm(name), name]));
  const holder = new Map();
  for (const context of contexts) {
    for (const epic of arrayOf(context?.epics)) {
      const key = norm(epic);
      if (!known.has(key)) {
        problems.push(`The context "${text(context.name)}" lists the Epic "${text(epic)}", which the backlog does not hold.`);
      } else if (holder.has(key)) {
        problems.push(`The Epic "${known.get(key)}" is in two contexts: "${holder.get(key)}" and "${text(context.name)}".`);
      } else {
        holder.set(key, text(context.name));
      }
    }
  }
  for (const [key, name] of known) if (!holder.has(key)) problems.push(`The Epic "${name}" is in no context.`);

  const types = new Set([...relationshipTypes, TBC]);
  relationships.forEach((rel, i) => {
    for (const end of ['from', 'to']) {
      if (!contextNames.has(norm(rel?.[end]))) problems.push(`Relationship #${i + 1} (${end}) names the context "${text(rel?.[end])}", which the map does not list.`);
    }
    if (norm(rel?.from) && norm(rel?.from) === norm(rel?.to)) problems.push(`Relationship #${i + 1} joins the context "${text(rel.from)}" to itself.`);
    if (!types.has(text(rel?.type))) problems.push(`Relationship #${i + 1} has the type "${text(rel?.type)}"; use one of ${[...types].join(', ')}.`);
    if (!text(rel?.crosses)) problems.push(`Relationship #${i + 1} says nothing about what crosses the link (write ${TBC} when it is not known).`);
  });
  return problems;
}

// The Epics the map lacks and the Epics it lists that the backlog no longer holds. A renamed Epic shows as one of each.
export function compareContextMap(source, epics) {
  const listed = new Map();
  for (const context of arrayOf(source?.contexts)) for (const epic of arrayOf(context?.epics)) listed.set(norm(epic), text(epic));
  const held = new Set(epics.map(norm));
  return {
    missing: epics.filter((name) => !listed.has(norm(name))),
    unknown: [...listed].filter(([key]) => !held.has(key)).map(([, name]) => name),
  };
}

const cell = (value) => text(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const quoted = (value) => `"${text(value).replace(/"/g, '#quot;').replace(/\r?\n/g, ' ')}"`;

const contextTable = (contexts) => [
  '| Context | Owner | Epics | Purpose |',
  '|---|---|---|---|',
  ...contexts.map((c) => `| ${cell(c.name)} | ${cell(c.owner)} | ${cell(arrayOf(c.epics).join(', '))} | ${cell(c.purpose)} |`),
];

const relationshipTable = (relationships) =>
  relationships.length === 0
    ? ['No relationships between the contexts are recorded.']
    : ['| Upstream | Downstream | Type | Crosses |', '|---|---|---|---|', ...relationships.map((r) => `| ${cell(r.from)} | ${cell(r.to)} | ${cell(r.type)} | ${cell(r.crosses)} |`)];

// A `flowchart` with a subgraph per context (its Epics as nodes) and a labelled link per relationship, upstream to downstream.
function flowchart(contexts, relationships) {
  const idOf = new Map(contexts.map((c, i) => [norm(c.name), `ctx${i + 1}`]));
  const lines = ['flowchart LR'];
  contexts.forEach((c, i) => {
    lines.push(`  subgraph ctx${i + 1}[${quoted(c.name)}]`);
    arrayOf(c.epics).forEach((epic, j) => lines.push(`    ctx${i + 1}_e${j + 1}[${quoted(epic)}]`));
    lines.push('  end');
  });
  for (const r of relationships) lines.push(`  ${idOf.get(norm(r.from))} -->|${quoted(`${r.type}: ${r.crosses}`)}| ${idOf.get(norm(r.to))}`);
  return lines.join('\n');
}

// context-map.md from a source that passed checkContextMap. Same source, same bytes.
export function composeContextMap(source) {
  const contexts = arrayOf(source.contexts);
  const relationships = arrayOf(source.relationships);
  return [
    '# Context map',
    '',
    'Generated from `context-map.json`; edit the map through `plan-stories`, not this file.',
    '',
    '## Contexts',
    '',
    ...contextTable(contexts),
    '',
    '## Relationships',
    '',
    ...relationshipTable(relationships),
    '',
    '## Diagram',
    '',
    '```mermaid',
    flowchart(contexts, relationships),
    '```',
    '',
  ].join('\n');
}
