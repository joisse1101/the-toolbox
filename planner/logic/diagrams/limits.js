// The numeric limits and stereotypes of a slice, read from the fenced `diagram-limits` block of
// planner/guidelines/diagram-conventions.md so that the document is the only place they are written. Pure: the caller
// reads the file and passes its text. A `palette` key in the block is ignored: colors are optional and never checked.

const BLOCK = /```diagram-limits\r?\n([\s\S]*?)```/;

const fail = (key, why) => {
  throw new Error(`diagram-conventions.md, diagram-limits block: "${key}" ${why}`);
};

// markdown text -> { maxClasses, stereotypes: {name: layer} }. Throws naming the bad key.
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
  return { maxClasses: raw.maxClasses, stereotypes: raw.stereotypes };
}

// The layer of a stereotype (case-insensitive), or undefined for a stereotype that is not in the conventions.
export const layerForStereotype = (limits, stereotype) => limits.stereotypes[String(stereotype ?? '').trim().toLowerCase()];
