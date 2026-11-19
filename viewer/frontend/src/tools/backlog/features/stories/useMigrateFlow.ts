import { useCallback, useRef, useState } from 'react';
import type { ReviewRow, ReviewStatus, Story } from '#shared/types.ts';
import type { Ask } from '#frontend/src/shared/hooks/useConfirm.ts';
import type { BacklogActions } from '#frontend/src/tools/backlog/shell/useBacklog.ts';
import { createFileStore, messageOf, relink } from '#frontend/src/shared/api/files.ts';
import { idChanges, relinkStories } from '#shared/backlog/ids.ts';
import { loadBacklog, serializeBacklog } from '#shared/backlog/model.ts';
import { migrateStories } from '#shared/backlog/proposals.ts';
import { openUnitsFor } from '#shared/review/review.ts';

const store = createFileStore('backlog');

// A backlog the stories can move to: its folder name and its initials.
export interface MigrateTarget {
  name: string;
  initials: string;
}

export interface MigrateNote {
  kind: 'ok' | 'error';
  text: string;
}

// The "Migrate" action of the Stories tab: moves the ticked stories into another backlog of the data folder.
// The order matters (design decision 7): settle the open backlog, read the target fresh, work out the move, ask, write the
// target, and only then change the open backlog, so a failed target write leaves everything as it was. The flow then waits
// for the open backlog's save, which writes the source and relinks every other backlog once (see useAutosave `registerForwards`).
// `review` is the slice of the review result this flow uses (a feature never imports another feature).
export function useMigrateFlow({ current, stories, headers, initials, files, actions, review, ask, onIdChanges, onMoved }: {
  current: string | null;
  stories: Story[];
  headers: readonly string[];
  initials: string;
  files: readonly string[];
  actions: BacklogActions;
  review: { rows: ReviewRow[]; decide: (indexes: Iterable<number>, status: ReviewStatus) => void };
  ask: Ask;
  // Makes the open backlog's proposals and review rows follow ID changes made outside its own save (the target's renumber).
  onIdChanges: (changes: ReadonlyMap<string, string>) => void;
  // Called once the migration has reached every backlog, so the index of the other backlogs is read again.
  onMoved: () => void;
}) {
  const [dialog, setDialog] = useState<{ targets: MigrateTarget[] | null; problem: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<MigrateNote | null>(null);
  // The latest values, read after each await (the flow outlives the render that started it).
  const latest = useRef({ current, stories, headers, initials, review, files });
  latest.current = { current, stories, headers, initials, review, files };

  const others = files.filter((f) => f !== current);

  // Opens the target dialog and reads the initials of the other backlogs. Changes nothing on disk.
  const openDialog = useCallback(async () => {
    setNote(null);
    setDialog({ targets: null, problem: null });
    const { current: open, files: all } = latest.current;
    const results = await Promise.allSettled(all.filter((f) => f !== open).map(async (name) => ({ name, initials: (await store.readBacklog(name)).initials })));
    const targets = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const failed = results.length - targets.length;
    setDialog({ targets, problem: failed ? `${failed} backlog${failed === 1 ? '' : 's'} could not be read and ${failed === 1 ? 'is' : 'are'} not listed.` : null });
  }, []);

  const closeDialog = useCallback(() => setDialog(null), []);

  const fail = (text: string) => setNote({ kind: 'error', text });

  // Moves the stories in `ids` (the ticked rows on screen) to the backlog `targetName`.
  const run = async (targetName: string, ids: ReadonlySet<number>) => {
    const source = latest.current.current;
    if (!source || busy) return;
    setDialog(null);
    setNote(null);
    setBusy(true);
    try {
      if (!(await actions.settle())) return fail('Nothing was moved: your latest changes are not saved yet. Fix the save problem and try again.');
      const now = latest.current;

      let read;
      try {
        read = await store.readBacklog(targetName);
      } catch (err) {
        return fail(`Nothing was moved: ${targetName} could not be read. ${messageOf(err)}`);
      }
      const target = loadBacklog(read.content, { initials: read.initials });
      // The target's own IDs changed on load (its file was out of order): every other backlog must follow them too.
      const targetChanges = idChanges(target.parsed, target.stories);
      // Links of the open backlog to the target's old codes follow in memory, because the server never rewrites the open backlog.
      const sourceStories = targetChanges.size ? relinkStories(now.stories, targetChanges) : now.stories;

      const result = migrateStories({
        source: { stories: sourceStories, headers: [...now.headers] },
        target: { stories: target.stories, headers: target.headers },
        ids, sourceInitials: now.initials, targetInitials: read.initials,
      });
      if ('error' in result) return fail(result.error);

      const moved = sourceStories.filter((s) => ids.has(s.id));
      const units = moved.flatMap((s) => openUnitsFor(now.review.rows, s.code));
      const count = moved.length;
      const noun = count === 1 ? 'story' : 'stories';
      const suggestions = units.length
        ? `\n\n${units.length} open review suggestion${units.length === 1 ? '' : 's'} on ${count === 1 ? 'it' : 'them'} will be dismissed.`
        : '';
      const message = `${count} ${noun} will move from ${source} to ${targetName} and get new IDs there. Links in the other backlogs are updated.${suggestions}\n\nThis cannot be undone.`;
      if (!(await ask({ title: `Migrate ${count} ${noun} to ${targetName}?`, message, confirmLabel: 'Migrate' }))) return;

      // The target is written first. If that fails, nothing has changed and the stories stay where they are.
      try {
        await store.write(targetName, serializeBacklog({ headers: result.targetHeaders, stories: result.target, hasBom: target.hasBom }));
      } catch (err) {
        return fail(`Nothing was moved. ${messageOf(err)}`);
      }
      if (targetChanges.size) {
        // Not the open backlog: its files are in memory and it was relinked above.
        const others = now.files.filter((f) => f !== source && f !== targetName);
        const reply = await relink(targetName, targetChanges, others).catch((err: unknown) => ({ failed: [{ name: targetName, file: '', message: messageOf(err) }] }));
        if (reply.failed.length) {
          const first = reply.failed[0]!;
          return fail(`Nothing was moved out of ${source}, but ${targetName} was rewritten and its renumbering could not reach ${first.name}${first.file ? `/${first.file}` : ''}: ${first.message} Close the file and migrate again.`);
        }
        onIdChanges(targetChanges);
      }

      actions.registerForwards(result.forwards);
      const sourceSaved = actions.replaceStoriesAndSettle(result.source); // the moved stories leave the ticked set with it
      if (units.length) now.review.decide(units.flatMap((u) => u.indexes), 'dismissed');
      // The source is written and every other backlog relinked before the note shows (design decision 7, step 7): a
      // reload right after the note then finds the backlogs consistent.
      await sourceSaved;
      onMoved();
      const codes = [...result.forwards.values()];
      const shown = codes.length > 3 ? `${codes.slice(0, 3).join(', ')} and ${codes.length - 3} more` : codes.join(', ');
      setNote({ kind: 'ok', text: `${count} ${noun} moved to ${targetName} as ${shown}.` });
    } finally {
      setBusy(false);
    }
  };

  return { others, dialog, busy, note, openDialog, closeDialog, run };
}

export type MigrateFlow = ReturnType<typeof useMigrateFlow>;
