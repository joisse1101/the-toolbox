import { useCallback, useRef, useState } from 'react';
import { clampWidth, parseStoredWidth } from '../lib/panel-size.ts';

// The browser store can be missing or throw (private window, blocked site data): the width then lasts until the page closes.
const readStored = (name: string) => {
  try {
    return localStorage.getItem(name);
  } catch {
    return null;
  }
};
const writeStored = (name: string, value: number | null) => {
  try {
    if (value === null) localStorage.removeItem(name);
    else localStorage.setItem(name, String(value));
  } catch {
    // not stored: the width still applies for this page
  }
};

// Widths in pixels for the keys of `defaults` ({ key: default width }), kept in the browser under `<prefix>.<key>`.
// `setWidth` changes a width while a handle is dragged and `setWidths` several at once; `commit` stores one key (or a list of
// keys) when the drag ends; `reset` restores the default.
export default function usePanelSizes(prefix: string, defaults: Record<string, number>, { min, max }: { min: number; max: number }) {
  const [widths, setWidths] = useState<Record<string, number>>(() => Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [key, parseStoredWidth(readStored(`${prefix}.${key}`), { min, max, fallback })]),
  ));
  const latest = useRef(widths);

  const update = (next: Record<string, number>) => {
    latest.current = next;
    setWidths(next);
  };
  const setWidth = useCallback((key: string, width: number) => update({ ...latest.current, [key]: clampWidth(width, min, max) }), [min, max]);
  const setMany = useCallback((next: Record<string, number>) => update({
    ...latest.current,
    ...Object.fromEntries(Object.entries(next).map(([key, width]) => [key, clampWidth(width, min, max)])),
  }), [min, max]);
  const commit = useCallback((keys: string | string[]) => [keys].flat().forEach((key) => writeStored(`${prefix}.${key}`, latest.current[key] ?? null)), [prefix]);
  const reset = useCallback((key: string) => {
    update({ ...latest.current, [key]: defaults[key] });
    writeStored(`${prefix}.${key}`, null);
  }, [prefix, defaults]);

  return { widths, setWidth, setWidths: setMany, commit, reset };
}
