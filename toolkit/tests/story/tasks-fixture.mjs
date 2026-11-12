// Shared fixtures of the tasks-*.test.mjs files: the mock streaks slice and a valid tasks.md for it.
import fs from 'node:fs';
import { SAMPLE_SLICE } from './helpers/backlog-tree.mjs';
import path from 'node:path';

// A Windows checkout may hold CRLF; the tests build text with "\n".
export const document = fs.readFileSync(path.join(SAMPLE_SLICE, 'UC-streaks.md'), 'utf8').replace(/\r\n/g, '\n');

export const CURRENT_TASK = 'T-streaks-current-count';
export const BEST_TASK = 'T-streaks-best-count';

export const tasksText = ({ current = ' ', best = ' ' } = {}) => `# Tasks

## current

- [${current}] ${CURRENT_TASK} Show the current streak of a habit
  Satisfies: AC-streaks-current (steps 1.1, 2.5)
  Verify: check a habit off on 3 days in a row and see a streak of 3

## best

- [${best}] ${BEST_TASK} Show the best streak of a habit
  Satisfies: AC-streaks-best (steps 2.10, 2.11)
  Verify: build a 5 day run, break it, check off 2 more days and see a best streak of 5
`;
