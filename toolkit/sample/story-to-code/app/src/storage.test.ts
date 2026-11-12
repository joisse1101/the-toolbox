import { describe, expect, it } from 'vitest';
import { addHabit, emptyState, loadState, saveState, toggleCheck, type Store } from './storage';

const fakeStore = (): Store => {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('storage', () => {
  it('reads back a saved check-off', () => {
    const store = fakeStore();
    let state = addHabit(emptyState(), 'Read');
    state = toggleCheck(state, state.habits[0].id, '2026-01-05');
    saveState(store, state);
    expect(loadState(store).habits[0].checks).toEqual(['2026-01-05']);
  });
});
