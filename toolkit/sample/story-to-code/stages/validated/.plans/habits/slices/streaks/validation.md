Run kind: full
Date: 2026-11-12
Tested commit: 05c0b725dc5f69a487c7b2db702c74aa7b990814
Validated: yes (the latest full run has every claim met)

Rule: a slice counts as validated only when its latest full run has every claim met. A partial run never validates it. Later code changes make this file stale.

| Claim | Source | Verdict | Evidence |
|---|---|---|---|
| C1 | T-streaks-count-current | met | npm test exit 0 (2 files, 40 passed); tests cover 3 days, run ending yesterday, unknown id "habit not found", 1000 days under 100 ms |
| C2 | T-streaks-local-day | met | npm test exit 0; test builds 23:30 local time, today() is local date, streak 3 across local-date days. It does not force a time zone where the UTC date differs |
| C3 | T-streaks-best-compute | met | npm test exit 0; best 5 with current 2, 0 for no checks, "habit not found" for unknown id |
| C4 | T-streaks-best-cache | met | npm test exit 0; cache holds value, then recomputed value; quota error logged and best streak still returned. Writing is a separate saveBestStreaks call, tested in two steps |
| C5 | T-streaks-run-tests | met | npm test exit 0 (40 passed); npm run build exit 0 |
| C6 | H1-HT-0001 AC1 | met | browser on mock data: page text "Three days / Streak 3 / Best 3" |
| C7 | H1-HT-0002 AC1 | met | browser on mock data: page text "Best five / Streak 2 / Best 5" |
