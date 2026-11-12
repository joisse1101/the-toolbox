// Keeps the data of the app in browser local storage. Every function takes the storage object, so a test can pass a plain stand-in.

export type Category = 'coding' | 'writing' | 'reading';
export const CATEGORIES: Category[] = ['coding', 'writing', 'reading'];

export interface Habit {
  id: string;
  name: string;
  // Days the habit was checked off, as YYYY-MM-DD.
  checks: string[];
}

export interface State {
  habits: Habit[];
  category: Category;
}

export type Store = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'habit-focus-tracker';

export const emptyState = (): State => ({ habits: [], category: 'coding' });

export function loadState(store: Store): State {
  const raw = store.getItem(KEY);
  if (!raw) return emptyState();
  try {
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      category: CATEGORIES.includes(parsed.category as Category) ? (parsed.category as Category) : 'coding',
    };
  } catch {
    return emptyState();
  }
}

export function saveState(store: Store, state: State): void {
  store.setItem(KEY, JSON.stringify(state));
}

export const today = (now = new Date()): string => now.toISOString().slice(0, 10);

export function addHabit(state: State, name: string): State {
  const trimmed = name.trim();
  if (!trimmed) return state;
  return { ...state, habits: [...state.habits, { id: `h${state.habits.length + 1}-${Date.now()}`, name: trimmed, checks: [] }] };
}

// Checks the habit off for the day, or clears the check when it is already there.
export function toggleCheck(state: State, habitId: string, day: string): State {
  return {
    ...state,
    habits: state.habits.map((h) => {
      if (h.id !== habitId) return h;
      return { ...h, checks: h.checks.includes(day) ? h.checks.filter((d) => d !== day) : [...h.checks, day] };
    }),
  };
}

export const setCategory = (state: State, category: Category): State => ({ ...state, category });
