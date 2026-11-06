# Design

## Context

Story IDs are computed, not stored: `loadBacklog` in `planner/logic/backlog/model.js` calls `renumber` in `planner/logic/backlog/ids.js` on every load, and the portal and the skill scripts all go through `loadBacklog`. The lock is a `Locked` column that `renumber` treats as an anchor (the story keeps its code, its number is reserved, its Epic's prefix is pinned) and that `moveStory`, `commitEpic`, `removeStory` and `removeStories` check. The portal has the lock toggle, a group lock button, bulk Lock and Unlock, and the `unlock` review row. A backlog is a folder in the data folder, named by the portal's Backlog name box; the server creates, lists and renames those folders. See `proposal.md` for the motivation and the decisions this design carries out.

## Goals / Non-Goals

**Goals:**
- Keep the existing anchor mechanism and turn it into the frozen state, instead of building a second one.
- Make every ID unique across backlogs without a central registry.
- Keep one implementation of the ID and freeze rules in `planner/logic/`, used by the portal, the server and the skills.

**Non-Goals:**
- A way to change or supersede a frozen story (PR 2).
- Detecting a hand-edited frozen story in the CSV.
- Migrating IDs that other documents already quote; IDs are not stable today and this change does not try to preserve them.

## Decisions

**1. The ID is the prefix chain `<initials>-<epic prefix>`, plus the number.** `renumber(stories, initials)` takes the backlog initials and builds each code as `<initials>-<epic prefix>-<NNNN>`. The existing `CODE` pattern `^(.+)-(\d+)$` still splits the number off, so code that only reads the number is unaffected. Initials never contain a hyphen, so the first segment of an ID is always its initials. Alternative considered: a separate column for the backlog part. Rejected because the ID must stay one string that slices, tasks and wiki pages can quote.

**2. Frozen reserves the epic part, not the initials.** An anchored (frozen) story keeps its whole code. The Epic's pinned prefix is the part between the first hyphen and the number, so unfrozen stories of that Epic use the backlog's current initials with the pinned epic prefix. This is what makes "changing initials affects only unfrozen stories" work. Reserved numbers are tracked per full prefix (initials and epic prefix), so a frozen `B1-IAM-0002` and an unfrozen `B2-IAM-0002` do not clash. Alternative: pin the whole prefix including old initials. Rejected because renaming initials would then change nothing for any Epic that had a frozen story.

**3. Prefix collisions add a digit.** `prefixesFor` keeps its first-come order, but a clash now appends `1`, `2`, ... to the initials (`IAM`, `IAM1`, `IAM2`) instead of lengthening with letters. Prefixes pinned by frozen stories are taken first, as the lengthening code does today, so a frozen prefix is never given to another Epic.

**4. Frozen replaces locked in the logic, with the portal read-only.** The `locked` field becomes `frozen` and every check in `ids.js` and `model.js` follows. `applyBulk` skips a frozen story entirely (today it skips only the Epic of a locked one) and reports how many it skipped. The form disables every field of a frozen story, and the reducer refuses an edit action for a frozen story as a second guard, so a stale UI cannot change one. `lockStories`, `unlockStories` and `groupLockState` are deleted. A function `freezeStories(stories, ids)` is added: it sets `frozen` on stories that have a code and returns the list of skipped ones, and is the only way to set the flag.

**5. The plan skill gets one writer, `write-freeze.mjs`.** It follows the pattern of the other writers: validate everything first (`--check`), refuse a path outside the data folder, write atomically, read back. It changes only the `Frozen` column. `jois-story-plan`'s logic list in `sync-skill-logic.mjs` gains `backlog/ids.js`, so the skill's copy of `freezeStories` is generated from the planner's. The skill asks its existing single yes/no with the list of stories it will freeze added, and runs the writer only after the yes.

**6. A story with an old-form ID is not frozen.** A backlog that has not been opened in the new portal still holds `IAM-0003`. The writer compares each story's ID with the backlog's initials and refuses a story whose ID does not start with them, telling the user to open the backlog in the portal first. Freezing an old-form ID would make it permanent.

**7. Initials are a backlog setting in `backlog.json`.** `planner/logic/storage/` gets small functions to read and write it, to pick the default (the lowest unused `B<n>` among sibling backlogs) and to check validity (1 to 6 letters or digits, starting with a letter, uppercased). `loadBacklog(text, { initials })` takes the value from its callers. The portal gets it from the server with the backlog; the skill scripts read it from the backlog folder next to the CSV. A backlog with no `backlog.json` is given the default, and the file is written when the backlog is created, or when it is first opened. Alternative: derive the initials from the existing IDs. Rejected because an empty backlog has none.

**8. Uniqueness is checked by the server, with logic from `planner/logic/`.** A pure function takes the proposed initials and a list of sibling backlogs (name, initials, codes) and returns the conflicting sibling or nothing. The server builds that list from the data folder and refuses the rename of initials with a message naming the sibling. A sibling conflicts when it holds those initials, or when any of its frozen IDs begins with them and a hyphen. Initials are compared ignoring case. The check cannot see backlogs in other data folders; that limit is stated in the wiki.

**9. The `Locked` column is dropped, not converted.** `loadBacklog` ignores a `Locked` value and does not keep the column as an unknown one; `serializeBacklog` writes `Frozen`. A file with neither column loads as before. The review reader prints a `Frozen` column and its scope line counts frozen stories.

**10. The `unlock` review row is removed.** The review writer rejects it. An `unlock` row already in a review file is shown as stale with Dismiss only, so an old file does not break. The review skill reports an objection to a frozen story in its report text.

## Risks / Trade-offs

- **A mistaken freeze cannot be undone in the product** → The wiki says to edit `Frozen` in the CSV by hand, and the skill lists the stories before it asks. A hand edit is allowed because the file is the source of truth.
- **Hand edits bypass read-only** → Out of scope; the wiki says read-only is a portal rule.
- **IDs of unfrozen stories change once, on first open** → Expected, and `Depends On` is rewritten with them. Anything that quoted an old ID (chat, tickets) goes stale, as it already can today.
- **The sibling check is per data folder** → Two data folders can still reuse initials. Accepted: the folders are separate projects, and the check says so.
- **Old `unlock` rows in review files** → Shown as stale, dismissible; no migration of review files.
- **Big surface: about 60 lock tests and 57 review tests change** → The tasks do the logic first with its tests, then the portal, then the skills, so each step can be tested before the next.

## Migration Plan

1. Ship the logic, portal, server and skills together; the repo keeps no old path.
2. On the first open of an existing backlog, the portal writes `backlog.json` with the default initials and the file is saved with the initialled IDs, `Depends On` rewritten, and without the `Locked` column.
3. Skill scripts run on a backlog that has no `backlog.json` use the same default without writing it, and the freeze writer refuses until the backlog has been opened in the portal (decision 6).
4. Rollback is `git revert` of the change plus restoring the backlog CSVs from version control; there is no data outside the data folder.

## Open Questions

- Whether the Initials box shows the full ID preview (for example `B1-IAM-0001`) next to it. This is a display choice and does not change the specs or tasks.
