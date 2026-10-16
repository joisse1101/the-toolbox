## 1. Guard

- [x] 1.1 In `.claude/skills/explore-stories/guard-bash.mjs`, allow `node .claude/skills/review-backlog/write-review.mjs <file> --append <<'JSON'` (same heredoc/closing-line rules as the proposal writer) only with `allowWrite`; deny the form without `--append`, and deny it in read-only mode; list the new form in the denial message. Verify with new cases in `test/guard-story-bash.test.mjs` (allowed in read-write, denied read-only, denied without `--append`, denied with extra arguments or text after `JSON`) and `npm test` passing.

## 2. Skills and command

- [ ] 2.1 Extend `.claude/skills/propose-stories/SKILL.md`: add `Bash(node .claude/skills/review-backlog/write-review.mjs:*)` to `allowed-tools`; add an "Edit a backlog story" section (what an edit is, review row keys from `review-backlog/SKILL.md` without restating its rules, `--append` only, no `add-story`, existing Area values, locked story needs an `unlock` row, no Priority); show edits (story, field, old, new, reason) in the confirm step with the single yes/no; describe the two-write order and the "resend only the failed part" rule; update the Report (suggestions appear in the editor, apply them there, a later full audit run replaces pending rows). Put the review example after the first `<<'JSON'` example. Verify `test/propose-skill.test.mjs` still passes.
- [ ] 2.2 Update `.claude/commands/story/propose.md`: add the review writer to `allowed-tools`, say edits are shown and written in the same turn, same rules. Verify by reading it against the skill.
- [ ] 2.3 Update `.claude/skills/explore-stories/SKILL.md`: a change to a backlog story is written as a suggestion through `propose-stories`; open on the story's current text when the story is a backlog ID. Keep its `allowed-tools` (reader only) and verify `test/propose-skill.test.mjs` still passes.

## 3. Launcher

- [ ] 3.1 In `ai/launchers/shape-stories.ps1`, accept a backlog story ID as the story: validate against `user-stories/<backlog>` (the `ID` column), refuse an unknown one before starting Claude, update the header comment (also the `/story:propose` line). Verify by running the script with a known ID, an unknown ID, a `NEW-<n>` and free text.

## 4. Docs

- [ ] 4.1 Update `CLAUDE.md` (the `explore-stories`/`propose-stories` paragraph: second writer, append-only, guard form) and any matching sentence in `README.md`. Verify by grep that no sentence still says the propose skill writes only `proposals/`.

## 5. End to end

- [ ] 5.1 Run a shape session on a scratch backlog (`TLT_DATA_DIR`): one new story plus an edit to a backlog story and one to a locked story; check `proposals/` and `reviews/` content, that existing review rows are unchanged, that the portal shows the suggestions, and that `user-stories/` is byte-for-byte unchanged. Run `npm test`.
