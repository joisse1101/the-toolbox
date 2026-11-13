// The initials a skill script gives `loadBacklog` for a backlog: the ones saved in the backlog's `backlog.json`, or, when
// that file is missing or holds no valid value, the default the backlog would be given (the lowest `B<n>` that no sibling
// backlog uses). A skill never saves the default; the portal does that when it first opens the backlog.

import fs from 'node:fs';
import { loadBacklog } from '../backlog/model.ts';
import { readInitials, defaultInitials } from '../storage/backlog-initials.ts';
import type { Sibling } from '../storage/backlog-initials.ts';
import { backlogFile, listBacklogs } from '../storage/backlog-paths.ts';

// The other backlogs of the data folder as { name, initials, frozenCodes }. A sibling whose file cannot be read counts as
// holding no frozen IDs.
function siblingsOf(dataDir: string, name: string): Sibling[] {
  return listBacklogs(dataDir)
    .filter((other) => other !== name)
    .map((other) => {
      const initials = readInitials(dataDir, other);
      let frozenCodes: string[] = [];
      try {
        const text = fs.readFileSync(backlogFile(dataDir, other, 'backlog'), 'utf8');
        const { stories } = loadBacklog(text, { initials: initials || 'B0' });
        frozenCodes = stories.filter((s) => s.frozen && s.code).map((s) => s.code);
      } catch { /* an unreadable sibling is reported when it is opened, not here */ }
      return { name: other, initials, frozenCodes };
    });
}

export function initialsOf(dataDir: string, name: string): string {
  return readInitials(dataDir, name) ?? defaultInitials(siblingsOf(dataDir, name));
}
