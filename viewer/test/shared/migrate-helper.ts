// Runs a story migration over in-memory backlog files, in the order the Migrate flow uses (useMigrateFlow.ts and the autosave
// relink it hands forwards to). Not a test file: the tests of migrate-edge-cases.test.ts and others import it.
//
// A "disk" maps a backlog name to the text of its four files (the design index is '' when the backlog has none). The steps, as the flow does them:
//   1. load the source and the target; the target's own renumber (`idChanges`) is relinked into the source in memory
//      and into every other backlog's files;
//   2. `migrateStories`, `moveReviewRows` and `moveDesignRows`; the target's backlog, review and design files are written
//      (the target's own design rows follow its renumber first), then the source's design file without the moved rows;
//   3. the source save: its ID changes are `idChanges(before, after)` with the forwards in place of the '' of each migrated
//      story; the source's stories are written, its proposals and review follow in memory (moved rows removed first), and
//      the `relink*Text` functions rewrite the files of every other backlog, the target included.
// Design decision 8 lists the same steps; the flow and the design agree.

import { COLUMNS, BENCHED_COLUMN, loadBacklog, serializeBacklog } from '#shared/backlog/model.ts';
import { toCsv } from '#shared/backlog/csv.ts';
import { idChanges, relinkStories } from '#shared/backlog/ids.ts';
import { migrateStories } from '#shared/backlog/proposals.ts';
import { relinkBacklogText, relinkProposalsText, relinkReviewText, relinkDesignIndexText } from '#shared/backlog/relink-text.ts';
import { moveDesignRows, parseDesignIndexCsv, retargetDesignRows, serializeDesignIndex } from '#shared/design/design-index-csv.ts';
import type { DesignIndexRow } from '#shared/design/design-index-csv.ts';
import { moveReviewRows, parseReview, retargetRows, serializeReview } from '#shared/review/review.ts';
import type { ReviewRow } from '#shared/types.ts';

export interface Files {
  initials: string;
  stories: string;
  proposals: string;
  review: string;
  design: string;
}
export type Disk = Map<string, Files>;

// A story row to build: `code` is only for a frozen story (it keeps it); the others are numbered by position.
export interface StorySpec {
  epic: string;
  title?: string;
  dependsOn?: string[];
  frozen?: boolean;
  code?: string;
}

function csvOf(headers: readonly string[], specs: readonly StorySpec[]): string {
  const rows = specs.map((s) => headers.map((h) => {
    if (h === 'ID') return s.code ?? '';
    if (h === 'Epic') return s.epic;
    if (h === 'Title') return s.title ?? '';
    if (h === 'Depends On') return (s.dependsOn ?? []).join(';');
    if (h === 'Frozen') return s.frozen ? 'Yes' : '';
    return '';
  }));
  return toCsv([[...headers], ...rows]);
}

// The files of a backlog, written as the portal would write them (IDs filled in). Proposals carry NEW-<n> codes.
export function makeBacklog(initials: string, stories: StorySpec[], proposals: StorySpec[] = [], review: ReviewRow[] = [], design: DesignIndexRow[] = []): Files {
  const backlog = loadBacklog(csvOf(COLUMNS, stories), { initials });
  const proposed = loadBacklog(csvOf([...COLUMNS, BENCHED_COLUMN], proposals), { placeholderIds: true });
  return {
    initials,
    stories: serializeBacklog({ headers: backlog.headers, stories: backlog.stories, hasBom: false }),
    proposals: serializeBacklog({ headers: proposed.headers, stories: proposed.stories, hasBom: false }),
    review: serializeReview(review),
    design: design.length ? serializeDesignIndex(design) : '',
  };
}

export const designRow = (over: Partial<DesignIndexRow>): DesignIndexRow => ({
  storyId: '', story: 'A story', criterion: 'It works.', kind: 'main', artboards: ['home-desktop'], viewports: ['desktop'],
  canvas: 'https://canvas.example/mock', extra: {}, ...over,
});

export const reviewRow = (over: Partial<ReviewRow>): ReviewRow => ({
  storyId: '', field: 'Title', action: 'replace', current: 'x', suggested: 'y', reason: 'r',
  area: 'Hierarchy', confidence: 'ready', group: '', status: 'open', ...over,
});

const file = (disk: Disk, name: string): Files => {
  const found = disk.get(name);
  if (!found) throw new Error(`no backlog ${name} on the mock disk`);
  return found;
};

const rowsOf = (text: string): ReviewRow[] => {
  const parsed = parseReview(text);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.rows;
};

// What a test reads back: the Depends On of each story (by code), of each proposed story, and the review rows.
export const storyLinks = (disk: Disk, name: string): Record<string, string[]> =>
  Object.fromEntries(loadBacklog(file(disk, name).stories, { initials: file(disk, name).initials }).parsed.map((s) => [s.code, s.dependsOn]));
export const proposalLinks = (disk: Disk, name: string): Record<string, string[]> =>
  Object.fromEntries(loadBacklog(file(disk, name).proposals, { placeholderIds: true }).parsed.map((s) => [s.code, s.dependsOn]));
export const reviewRowsOf = (disk: Disk, name: string): ReviewRow[] => rowsOf(file(disk, name).review);
export const designRowsOf = (disk: Disk, name: string): DesignIndexRow[] => parseDesignIndexCsv(file(disk, name).design);

// Every code a backlog's files name in Depends On (stories, proposals, open and decided review rows' Current/Suggested).
export function namedCodes(disk: Disk, name: string): string[] {
  const reviewNames = reviewRowsOf(disk, name).flatMap((r) => (r.field === 'Depends On' ? [...r.current.split(';'), ...r.suggested.split(';')] : []));
  return [
    ...Object.values(storyLinks(disk, name)).flat(),
    ...Object.values(proposalLinks(disk, name)).flat(),
    ...reviewNames.map((c) => c.trim()).filter(Boolean),
  ];
}

export interface MigrationOutcome {
  forwards: Map<string, string>;
  changes: Map<string, string>;
  moved: number;
  designMoved: number;
}

// The file a mock write refuses, as a locked file does: the flow stops there and names it.
export class LockedFile extends Error {
  backlog: string;
  file: string;
  constructor(backlog: string, file: string) {
    super(`${backlog}/${file} is open in another program`);
    this.backlog = backlog;
    this.file = file;
  }
}

// Moves the stories of `source` whose codes are in `codes` to `target`, rewriting `disk` as the flow would. Throws on a refusal.
// `locked` names a file the mock refuses to write as `<backlog>/<file>` (a LockedFile is thrown at that write; what was written
// before it stays, as on a real disk). The two design-index writes happen once per migration, so a story with no rows has none.
export function migrate(disk: Disk, sourceName: string, targetName: string, codes: readonly string[], locked?: string): MigrationOutcome {
  const src = file(disk, sourceName);
  const tgt = file(disk, targetName);
  const source = loadBacklog(src.stories, { initials: src.initials });
  let proposals = loadBacklog(src.proposals, { placeholderIds: true });
  let reviewRows = rowsOf(src.review);
  const target = loadBacklog(tgt.stories, { initials: tgt.initials });
  const targetReview = rowsOf(tgt.review);
  const sourceDesign = parseDesignIndexCsv(src.design);
  const targetDesign = parseDesignIndexCsv(tgt.design);
  const refuse = (backlog: string, name: string) => {
    if (locked === `${backlog}/${name}`) throw new LockedFile(backlog, name);
  };

  const relinkOthers = (changes: ReadonlyMap<string, string>, skip: readonly string[]) => {
    for (const [name, f] of disk) {
      if (skip.includes(name)) continue;
      disk.set(name, {
        ...f,
        stories: relinkBacklogText(f.stories, changes) ?? f.stories,
        proposals: relinkProposalsText(f.proposals, changes) ?? f.proposals,
        review: relinkReviewText(f.review, changes) ?? f.review,
        design: relinkDesignIndexText(f.design, changes) ?? f.design,
      });
    }
  };
  const followInSource = (changes: ReadonlyMap<string, string>) => {
    proposals = { ...proposals, stories: relinkStories(proposals.stories, changes) };
    reviewRows = retargetRows(reviewRows, changes);
  };

  const targetChanges = idChanges(target.parsed, target.stories);
  const sourceStories = targetChanges.size ? relinkStories(source.stories, targetChanges) : source.stories;
  const ids = new Set(sourceStories.filter((s) => codes.includes(s.code)).map((s) => s.id));
  const result = migrateStories({
    source: { stories: sourceStories, headers: source.headers },
    target: { stories: target.stories, headers: target.headers },
    ids, sourceInitials: src.initials, targetInitials: tgt.initials,
  });
  if ('error' in result) throw new Error(result.error);

  const moved = sourceStories.filter((s) => ids.has(s.id));
  const movedRows = moveReviewRows(reviewRows, targetReview, moved.map((s) => s.code));

  // The target's own design rows follow its renumber (the server's relink skips the target), then the moved rows join them.
  const targetOwnRows = retargetDesignRows(targetDesign, targetChanges);
  const designMove = moveDesignRows(sourceDesign, targetOwnRows, moved.map((s) => s.code));
  const writesTargetDesign = designMove.moved > 0 || targetOwnRows !== targetDesign;

  // Target first, then its review file and design index, then the target's own renumber reaches the other backlogs and the open one.
  refuse(targetName, 'user-stories.csv');
  disk.set(targetName, {
    ...tgt,
    stories: serializeBacklog({ headers: result.targetHeaders, stories: result.target, hasBom: target.hasBom }),
  });
  if (movedRows.moved) {
    refuse(targetName, 'review.csv');
    disk.set(targetName, { ...file(disk, targetName), review: serializeReview(movedRows.target) });
  }
  if (writesTargetDesign) {
    refuse(targetName, 'design-index.csv');
    disk.set(targetName, { ...file(disk, targetName), design: serializeDesignIndex(designMove.target) });
  }
  if (designMove.moved) {
    // The open backlog's own design index loses the moved rows before its save, or the save's relink would rename them.
    refuse(sourceName, 'design-index.csv');
    disk.set(sourceName, { ...file(disk, sourceName), design: serializeDesignIndex(designMove.source) });
  }
  if (targetChanges.size) {
    relinkOthers(targetChanges, [sourceName, targetName]);
    followInSource(targetChanges);
  }

  // The source save: forwards replace the '' of each migrated story, the moved rows leave the source review, then
  // the save's changes reach the source's own proposals and review, and every other backlog's files.
  const changes = idChanges(source.stories, result.source);
  for (const [oldCode, newCode] of result.forwards) if (changes.get(oldCode) === '') changes.set(oldCode, newCode);
  reviewRows = reviewRows.filter((_, i) => !movedRows.indexes.includes(i));
  followInSource(changes);
  disk.set(sourceName, {
    ...file(disk, sourceName),
    stories: serializeBacklog({ headers: source.headers, stories: result.source, hasBom: source.hasBom }),
    proposals: serializeBacklog({ headers: proposals.headers, stories: proposals.stories, hasBom: proposals.hasBom }),
    review: serializeReview(reviewRows),
  });
  relinkOthers(changes, [sourceName]);
  // The server also rewrites the open backlog's own design index once per change list.
  const own = file(disk, sourceName);
  disk.set(sourceName, { ...own, design: relinkDesignIndexText(own.design, changes) ?? own.design });

  return { forwards: result.forwards, changes, moved: movedRows.moved, designMoved: designMove.moved };
}
