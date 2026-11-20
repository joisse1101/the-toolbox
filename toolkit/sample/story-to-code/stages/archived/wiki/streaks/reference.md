# Streaks: reference

Facts to look up. For how to use streaks, see the [overview](overview.md).

## Functions

| Function | Called by | Input | Returns |
|---|---|---|---|
| `currentStreak(checks, today)` | `render` | `checks`: days as YYYY-MM-DD, `today`: YYYY-MM-DD | whole number of days, 0 when there is no run |
| `bestStreak(checks)` | `render` | `checks`: days as YYYY-MM-DD | whole number of days, 0 when there are no checks |

Both live next to the `Habit` type in `app/src/storage.ts`.

## Data

| Item | Where | Format |
|---|---|---|
| Saved state | browser local storage, key `habit-focus-tracker` | JSON with the habits |
| `Habit.checks` | inside the saved state | list of days as YYYY-MM-DD, each day at most once |

No streak is stored. Both numbers are worked out from `Habit.checks` each time the list is drawn.
