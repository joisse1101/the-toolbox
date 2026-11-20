Run kind: full
Date: 2026-11-20
Tested commit: f93dadf3394d6ed648ef51eb9d87f2b0403082b7
Validated: yes (the latest full run has every claim met)

Rule: a slice counts as validated only when its latest full run has every claim met. A partial run never validates it. Later code changes make this file stale.

| Claim | Source | Verdict | Evidence |
|---|---|---|---|
| C1 | T-streaks-current-count | met | npm test exit 0 (1 file, 7 passed); currentStreak tests give 3 for the last 3 days with today 2026-11-20 and with today 2026-11-21, and 0 for an empty list |
| C2 | T-streaks-current-show | met | browser on mock data at 1440 px and 390 px: "Read 10 pages / 3-day streak", "Stretch / No streak yet"; compared with https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-default-desktop and https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-default-mobile. Outside the criterion: the page also shows "Best 3", and on mobile the pill sits under the name as on the best-streak artboard |
| C3 | T-streaks-best-count | met | npm test exit 0 (7 passed); bestStreak gives 5 for a run of 5, a gap and a run of 2, and 0 for an empty list |
| C4 | T-streaks-best-show | met | browser on mock data: "2-day streak" and "Best 5", in a row at 1440 px and under the name, indented about 28 px, at 390 px; matches https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-best-desktop and https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-best-mobile |
| C5 | T-streaks-tests | met | npm test exit 0 (7 passed: 4 currentStreak, 2 bestStreak, 1 storage); npm run build finished with no type error ("built in 399ms"), exit code inferred from a clean run |
| C6 | H1-HT-0001 AC1 | met | browser on mock data at 1440 px and 390 px: page text "Read 10 pages / 3-day streak / Best 3 / Stretch / No streak yet" |
| C7 | H1-HT-0002 AC1 | met | browser on mock data at 1440 px and 390 px: page shows "2-day streak" and "Best 5" |
