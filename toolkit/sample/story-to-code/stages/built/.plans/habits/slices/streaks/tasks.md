# Tasks

## current-streak

- [x] T-streaks-count-current Count and show the current streak
  Satisfies: AC-streaks-current-streak (steps 1.2, 2.1, 2.2, 2.3, 2.4, 2.5)
  Verify: With a habit whose checked days are the last 3 local days, currentStreak returns 3 and the habit list shows "3" next to it. With the same days ending yesterday, it still returns 3 (D2). With an unknown habit id it returns the error "habit not found" and the list shows that message (D3). Time to count 1000 checked days is under 100 ms.
  result: npm test -> 2 files, 8 tests passed, 0 failed; npm run build -> exit 0; list rendering not run in a browser, covered by the type-check and build only

- [x] T-streaks-local-day Use the local day for check-offs and streaks
  Satisfies: AC-streaks-current-streak (steps 1.1, 2.3)
  Verify: With the clock set to 23:30 local time on a day whose UTC date is the next day, a check-off is stored under the local date and counts for that evening (D1). The streak still holds when checks on the previous days were stored under their local dates.
  result: npm test -> 2 files, 8 tests passed, 0 failed, including the 23:30 local-time test; npm run build -> exit 0

## best-streak

- [x] T-streaks-best-compute Find the best streak
  Satisfies: AC-streaks-best-streak (steps 1.2, 1.3, 2.1, 2.2, 2.3, 2.8, 2.9)
  Verify: With a habit whose longest run is 5 days and whose current streak is 2, bestStreak returns 5 and the list shows "5". With a habit that has no checked days it returns 0. With an unknown habit id it returns the same "habit not found" error as the current streak (D3).
  result: npm run build -> tsc and vite build ok; npm test -> 11 passed, 0 failed, including a scratch test of best 5 with current 2 giving 5, no checks giving 0, unknown id giving "habit not found"

- [x] T-streaks-best-cache Keep the best streak in local storage
  Satisfies: AC-streaks-best-streak (steps 2.4, 2.5, 2.6, 2.7')
  Verify: After bestStreak runs, the saved state in a stand-in storage holds the best streak (D4). Change the check-offs and run it again: the cache holds the recomputed value. With a stand-in storage whose setItem throws a quota error, the best streak is still returned and shown and the failure is logged (D6).
  result: npm run build -> ok; npm test -> 11 passed, 0 failed, including a scratch test of cache {"a":5} then {"a":1} after changed check-offs, and a throwing setItem still returning the best streak with one logged failure

- [x] T-streaks-run-tests Run the project tests for the whole slice and fix failures
  Satisfies: AC-streaks-best-streak (steps 2.3, 2.8, 2.9)
  Verify: From app/, `npm test` and `npm run build` both exit with code 0 (type-check and unit tests for the current streak, the best streak, the local day and the cache, covering the whole slice).
  result: npm test -> exit 0, 2 files, 40 tests passed; npm run build -> exit 0 (tsc --noEmit and vite build ok), at commit c06e6f6
