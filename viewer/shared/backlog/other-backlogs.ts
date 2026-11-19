// The portal's read-only index of the other backlogs of the data folder. A `Depends On` entry may name a story of another
// backlog; the open backlog does not hold that story, so the Editor looks it up here. Pure functions, no DOM.

import type { Story } from '../types.ts';

// A backlog of the data folder: its folder name and its stories as loaded.
export interface NamedBacklog {
  name: string;
  stories: readonly Story[];
}

// A story of another backlog that depends on a story of the open backlog.
export interface ExternalDependent {
  backlog: string;
  code: string;
  title: string;
}

export interface OtherBacklogsIndex {
  // Code of a story in another backlog -> where it lives and its Title (for labels in Depends On).
  byCode: Map<string, { backlog: string; title: string }>;
  // Code of a story of the open backlog -> its dependents in other backlogs (for Required by).
  dependentsOf: Map<string, ExternalDependent[]>;
}

// Works out the two lookups. `openName` is the open backlog: if `backlogs` lists it, it is ignored. A story without a
// code is left out; so is a dependent whose target no story of `openStories` holds.
export function indexOtherBacklogs(backlogs: readonly NamedBacklog[], openName: string, openStories: readonly Story[]): OtherBacklogsIndex {
  const openCodes = new Set(openStories.map((s) => s.code).filter(Boolean));
  const byCode = new Map<string, { backlog: string; title: string }>();
  const dependentsOf = new Map<string, ExternalDependent[]>();
  for (const { name, stories } of backlogs) {
    if (name === openName) continue;
    for (const s of stories) {
      if (!s.code) continue;
      byCode.set(s.code, { backlog: name, title: s.title });
      for (const e of s.dependsOn) {
        if (!openCodes.has(e)) continue;
        dependentsOf.set(e, [...(dependentsOf.get(e) ?? []), { backlog: name, code: s.code, title: s.title }]);
      }
    }
  }
  return { byCode, dependentsOf };
}
