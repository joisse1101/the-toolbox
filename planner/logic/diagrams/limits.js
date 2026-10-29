// The numeric limits and stereotypes of a slice and the relationship types of a context map, read from the fenced `diagram-limits` block of
// planner/guidelines/diagram-conventions.md so that the document is the only place they are written. Pure: the caller
// reads the file and passes its text. A `palette` key in the block is ignored: colors are optional and never checked.

const BLOCK = /```diagram-limits\r?\n([\s\S]*?)```/;

const fail = (key, why) => {
  throw new Error(`diagram-conventions.md, diagram-limits block: "${key}" ${why}`);
};

// markdown text -> { maxClasses, stereotypes: {name: layer}, relationshipTypes: [name] } (the types a context map may use). Throws naming the bad key.
export function parseLimits(markdown) {
  const match = BLOCK.exec(String(markdown ?? ''));
  if (!match) throw new Error('diagram-conventions.md has no diagram-limits block');
  let raw;
  try {
    raw = JSON.parse(match[1]);
  } catch (e) {
    throw new Error(`diagram-conventions.md, diagram-limits block is not valid JSON: ${e.message}`);
  }
  if (!Number.isInteger(raw.maxClasses) || raw.maxClasses < 1) fail('maxClasses', 'must be a positive integer');
  if (!raw.stereotypes || typeof raw.stereotypes !== 'object') fail('stereotypes', 'must be an object of stereotype -> layer');
  for (const [name, layer] of Object.entries(raw.stereotypes)) if (typeof layer !== 'string' || !layer) fail(`stereotypes.${name}`, 'must name a layer');
  if (!Array.isArray(raw.relationshipTypes) || raw.relationshipTypes.length === 0) fail('relationshipTypes', 'must be a non-empty list of names');
  for (const [i, type] of raw.relationshipTypes.entries()) if (typeof type !== 'string' || !type.trim()) fail(`relationshipTypes[${i}]`, 'must be a name');
  return { maxClasses: raw.maxClasses, stereotypes: raw.stereotypes, relationshipTypes: raw.relationshipTypes.map((t) => t.trim()) };
}

// The layer of a stereotype (case-insensitive), or undefined for a stereotype that is not in the conventions.
export const layerForStereotype = (limits, stereotype) => limits.stereotypes[String(stereotype ?? '').trim().toLowerCase()];
