// The queue of relink jobs of one open backlog (pure: the call to the server is passed in, so a test can stub it).
// One job is one save's list of ID changes. Jobs run strictly in order, one at a time, because a later list can build on an
// earlier one (A becomes B, then B becomes C). A job whose reply names failures is narrowed to the failed backlogs, so a
// backlog that was rewritten is never rewritten again (applying a list twice can undo a swap). Later jobs wait behind it.

import type { RelinkReply } from '#shared/types.ts';

export type RelinkCall = (from: string, changes: ReadonlyMap<string, string>, only?: readonly string[]) => Promise<RelinkReply>;

export interface RelinkJob {
  from: string; // the backlog whose IDs changed, fixed per job even when another backlog is opened later
  changes: ReadonlyMap<string, string>;
  only?: string[]; // set once a run failed: the backlogs that still need this list
}

// ok: the queue is empty. Otherwise the head job is still queued and `message` names what failed.
export type RelinkRun = { ok: true } | { ok: false; message: string };

export interface RelinkQueue {
  enqueue(from: string, changes: ReadonlyMap<string, string>): void;
  isEmpty(): boolean;
  // Runs jobs until the queue is empty or one fails. Calls while a run is going share it.
  run(): Promise<RelinkRun>;
}

export function createRelinkQueue(relink: RelinkCall): RelinkQueue {
  const jobs: RelinkJob[] = [];
  let running: Promise<RelinkRun> | null = null;

  // Resolves the failure text of the head job, or null when it is done.
  async function runHead(job: RelinkJob): Promise<string | null> {
    let reply: RelinkReply;
    try {
      reply = await relink(job.from, job.changes, job.only);
    } catch (err) {
      return err instanceof Error ? err.message : String(err); // nothing is known to be written: the job stays as it is
    }
    if (!reply.failed.length) return null;
    job.only = [...new Set(reply.failed.map((f) => f.name))];
    return reply.failed.map((f) => `${f.name}/${f.file}: ${f.message}`).join('; ');
  }

  async function runAll(): Promise<RelinkRun> {
    while (jobs.length) {
      const message = await runHead(jobs[0]!);
      if (message !== null) return { ok: false, message };
      jobs.shift();
    }
    return { ok: true };
  }

  return {
    enqueue(from, changes) {
      jobs.push({ from, changes });
    },
    isEmpty: () => jobs.length === 0,
    run() {
      running ??= runAll().finally(() => {
        running = null;
      });
      return running;
    },
  };
}
