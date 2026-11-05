// Shared fixtures of the tasks-*.test.mjs files: the mock sign-in slice and a valid tasks.md for it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// A Windows checkout may hold CRLF; the tests build text with "\n".
export const document = fs.readFileSync(path.join(HERE, 'fixtures', 'sample', 'slices', 'sign-in', 'UC-sign-in.md'), 'utf8').replace(/\r\n/g, '\n');

export const LOGIN_TASK = 'T-sign-in-login-dashboard';
export const RESET_TASK = 'T-sign-in-reset-link';

export const tasksText = ({ login = ' ', reset = ' ' } = {}) => `# Tasks

## login

- [${login}] ${LOGIN_TASK} Show the dashboard after sign-in
  Satisfies: AC-sign-in-dashboard (steps 1.1, 2.5)
  Verify: sign in with the right password and see the dashboard

## reset

- [${reset}] ${RESET_TASK} Send the reset link
  Satisfies: AC-sign-in-reset-link (steps 2.10, 2.11)
  Verify: ask for a reset and read the mailer's outbox
`;
