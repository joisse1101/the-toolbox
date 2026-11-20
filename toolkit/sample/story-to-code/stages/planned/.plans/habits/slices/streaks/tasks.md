# Tasks

## see-current-streak

- [ ] T-streaks-current-count Add currentStreak to the habit data code
  Satisfies: AC-streaks-current-shown (steps 1.3, 2.1, 2.2)
  Design: https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-default-desktop, https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-default-mobile
  Verify: in app/src/storage.test.ts, currentStreak(['2026-11-18','2026-11-19','2026-11-20'], '2026-11-20') returns 3, the same checks with today '2026-11-21' also return 3 (D-streaks-today), and an empty list returns 0.

- [ ] T-streaks-current-show Show the current streak pill on each habit
  Satisfies: AC-streaks-current-shown (steps 2.1, 3.1)
  Design: https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-default-desktop, https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-default-mobile
  Verify: in the dev server, with local storage holding checks for the last 3 days of a habit, the item shows "3-day streak"; a habit with no checks shows "No streak yet".

## see-best-streak

- [ ] T-streaks-best-count Add bestStreak to the habit data code
  Satisfies: AC-streaks-best-shown (steps 1.3, 2.1, 2.2)
  Design: https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-best-desktop, https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-best-mobile
  Verify: in app/src/storage.test.ts, bestStreak for a run of 5 days, a gap, then a run of 2 days returns 5, and an empty list returns 0.

- [ ] T-streaks-best-show Show the best streak beside the current streak
  Satisfies: AC-streaks-best-shown (steps 2.1, 3.1)
  Design: https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-best-desktop, https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-best-mobile
  Verify: in the dev server with local storage holding a 5-day run and a current streak of 2, the item shows "2-day streak" and "Best 5"; on a 390 px wide window "Best 5" sits under the habit name.

- [ ] T-streaks-tests Run the tests of the whole slice and fix what fails
  Satisfies: AC-streaks-best-shown (steps 1.3, 2.2)
  Design: https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-best-desktop, https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco#artboard-streaks-list-best-mobile
  Verify: from app/, npm test and npm run build both exit 0, with the streak tests of both stories counted in the Vitest summary.
