// The numeric limits, palette and stereotypes of a slice, read from the fenced `diagram-limits` block of
// planner/guidelines/diagram-conventions.md so that the document is the only place they are written. Pure: the caller
// reads the file and passes its text.

const BLOCK = /```diagram-limits\r?\n([\s\S]*?)```/;
const HEX = /^#[0-9A-Fa-f]{6}$/;

const fail = (key, why) => {
  throw new Error(`diagram-conventions.md, diagram-limits block: "${key}" ${why}`);
};

// markdown text -> { maxClasses, palette: {role: '#RRGGBB'}, stereotypes: {name: role} }. Throws naming the bad key.
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
  if (!raw.palette || typeof raw.palette !== 'object') fail('palette', 'must be an object of role -> #RRGGBB');
  for (const [role, color] of Object.entries(raw.palette)) if (!HEX.test(color)) fail(`palette.${role}`, 'must be a #RRGGBB color');
  if (!raw.stereotypes || typeof raw.stereotypes !== 'object') fail('stereotypes', 'must be an object of stereotype -> palette role');
  for (const [name, role] of Object.entries(raw.stereotypes)) if (!(role in raw.palette)) fail(`stereotypes.${name}`, `names "${role}", which is not in palette`);
  return { maxClasses: raw.maxClasses, palette: raw.palette, stereotypes: raw.stereotypes };
}

// The color a stereotype must have (upper case, as written in the palette), or undefined for an unknown stereotype.
export function colorForStereotype(limits, stereotype) {
  const role = limits.stereotypes[String(stereotype ?? '').trim().toLowerCase()];
  return role ? limits.palette[role].toUpperCase() : undefined;
}
