# Streaks design

- A streak counts consecutive calendar days in the local time zone.
- A run that ends yesterday still counts, so one missed morning does not erase it.
- The check-offs stay the single source of truth, and a streak is computed from them.
