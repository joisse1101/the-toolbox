// Width rules for the resizable panels and table columns: pure, so the portal's hook and the tests share them.

// A width kept between min and max, as a whole number of pixels.
export function clampWidth(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

// The width a stored string stands for: the nearest allowed width when it is a number, `fallback` when it is not.
export function parseStoredWidth(raw, { min, max, fallback }) {
  if (typeof raw !== 'string' || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? clampWidth(value, min, max) : fallback;
}

// Widths that fit in `available` pixels: when their sum is too wide, each loses the same share of its room above `min`
// (so none goes below `min`, and a wide one gives up more than a narrow one). Returns the widths unchanged when they fit,
// and all `min` when even those do not.
export function fitWidths(widths, available, min) {
  const sum = widths.reduce((total, w) => total + w, 0);
  const excess = sum - available;
  if (excess <= 0) return widths;
  const room = sum - widths.length * min;
  if (excess >= room) return widths.map(() => min);
  return widths.map((w) => Math.floor(w - (excess * (w - min)) / room));
}

// `widths` ({ key: width }) with column `key` set to `wanted`, taking the room it needs from the other columns: they shrink
// to `min`, one after the other in the order of `order` (keys), until the widths fit in `available` pixels or no room is left.
export function makeRoom(widths, key, wanted, available, min, order) {
  const next = { ...widths };
  const others = Object.entries(widths).reduce((sum, [k, w]) => (k === key ? sum : sum + w), 0);
  let deficit = wanted - (available - others);
  for (const k of order) {
    if (deficit <= 0) break;
    if (k === key || !(k in next)) continue;
    const give = Math.min(next[k] - min, deficit);
    next[k] -= give;
    deficit -= give;
  }
  next[key] = wanted - Math.max(0, deficit);
  return next;
}
