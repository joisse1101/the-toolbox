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
