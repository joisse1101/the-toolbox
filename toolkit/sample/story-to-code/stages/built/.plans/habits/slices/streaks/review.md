Review: run
Date: 2026-11-12
Reviewed commit: c06e6f6d1f3f81c051c57d124b5669680454c1f4
Fix rounds: 3

Static check: run (three passes; the last pass came before the final round, which fixed its two label findings and was not reviewed again)
Behavioural check: run once, before the fixes, at commit 1729358 (7 of 7 claims met). It was not repeated after the fixes, so validation.md is out of date.

## Known, not fixed

Reason for all lines: the review stopped after two full fix rounds, and the recommended option was taken because no one could be asked. That option fixes crashes and regressions from earlier rounds and records the rest.

- The best-streak cache is never read by the display. The slice's decision D4 requires the cache, so it stays.
- Habits that share an id both load and show the first habit's streaks.
- Check-offs saved under the old UTC day are not migrated, because the old time zone is unknown. The wiki records it as a limit.
- A tab left open past midnight keeps showing the old day until the next reload.
- The 1000-day timing test asserts a wall-clock limit of 100 ms on the best of 5 runs, so a loaded machine can still fail it.

## Not fixed by design

- Efficiency note: the best streak is computed twice per habit on each render (optional cleanup).
