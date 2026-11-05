// GENERATED. Do not edit this copy.
// The initials a skill script gives `loadBacklog` for a backlog: the ones saved in the backlog's `backlog.json`, or, when
// that file is missing or holds no valid value, the default the backlog would be given (the lowest `B<n>` that no sibling
// backlog uses). A skill never saves the default; the portal does that when it first opens the backlog.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { loadBacklog } from '../backlog/model.js';

const require = createRequire(import.meta.url);
const { readInitials, defaultInitials } = require('../storage/backlog-initials.cjs');
const { backlogFile, listBacklogs } = require('../storage/backlog-paths.cjs');

// The other backlogs of the data folder as { name, initials, frozenCodes }. A sibling whose file cannot be read counts as
// holding no frozen IDs.
function siblingsOf(dataDir, name) {
  return listBacklogs(dataDir)
    .filter((other) => other !== name)
    .map((other) => {
      const initials = readInitials(dataDir, other);
      let frozenCodes = [];
      try {
        const text = fs.readFileSync(backlogFile(dataDir, other, 'backlog'), 'utf8');
        const { stories } = loadBacklog(text, { initials: initials || 'B0' });
        frozenCodes = stories.filter((s) => s.frozen && s.code).map((s) => s.code);
      } catch { /* an unreadable sibling is reported when it is opened, not here */ }
      return { name: other, initials, frozenCodes };
    });
}

export function initialsOf(dataDir, name) {
  return readInitials(dataDir, name) ?? defaultInitials(siblingsOf(dataDir, name));
}
