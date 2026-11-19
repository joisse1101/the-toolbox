import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Story } from '#shared/types.ts';
import { createFileStore } from '#frontend/src/shared/api/files.ts';
import { loadBacklog } from '#shared/backlog/model.ts';
import { indexOtherBacklogs } from '#shared/backlog/other-backlogs.ts';
import type { NamedBacklog } from '#shared/backlog/other-backlogs.ts';

const store = createFileStore('backlog');

// The read-only index of the other backlogs of the data folder (design decision 9): read when a backlog opens (or the list
// of backlogs changes), and again when `reload` is called, which the backlog tool does after each relink job and each migration.
// A backlog that cannot be read is left out. Nothing here is ever written. Returns the lookups and the other backlogs' codes.
export function useOtherBacklogs({ current, files, stories }: { current: string | null; files: readonly string[]; stories: readonly Story[] }) {
  const [lists, setLists] = useState<NamedBacklog[]>([]);
  const latest = useRef({ current, files });
  latest.current = { current, files };
  const round = useRef(0); // only the newest read may set the state

  const reload = useCallback(async () => {
    const { current: open, files: all } = latest.current;
    const mine = ++round.current;
    const results = await Promise.allSettled(
      all.filter((f) => f !== open).map(async (name) => {
        const { content, initials } = await store.readBacklog(name);
        return { name, stories: loadBacklog(content, { initials }).parsed };
      }),
    );
    if (mine !== round.current) return;
    setLists(results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])));
  }, []);

  const filesKey = files.join('\n');
  useEffect(() => {
    void reload();
  }, [current, filesKey, reload]);

  const index = useMemo(() => indexOtherBacklogs(lists, current ?? '', stories), [lists, current, stories]);
  const codes = useMemo(() => new Set(index.byCode.keys()), [index]);
  return { index, codes, reload };
}
