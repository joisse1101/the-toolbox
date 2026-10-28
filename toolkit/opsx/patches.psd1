@{
    # The OpenSpec release these patches were written against. Install-Opsx.ps1 refuses any other
    # version: bump it on a branch, rerun the installer, and fix whichever patch reports a missing anchor.
    OpenSpecVersion = '1.13.0'

    # Machine-level OpenSpec settings the generator runs with (and `-Apply` writes to the real config).
    # `commands` gives /opsx:* only, so Claude Code does not list every workflow twice.
    Delivery  = 'commands'
    Workflows = @('propose', 'explore', 'apply', 'update', 'sync', 'archive')

    # Added to the frontmatter of every generated file: no model-triggered runs, no listing in the
    # session's skill list. A file that already has it is an error (the patch would be a no-op).
    FrontmatterFlag = 'disable-model-invocation: true'

    # Each patch swaps `Find` for `Replace` in one generated file. `Find` must occur exactly once.
    # Line endings are compared as LF; the output keeps LF.
    Patches = @(
        @{
            File    = 'apply.md'
            Name    = 'commit hard stop in the pause conditions'
            Find    = @'
   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - A task needs work beyond what the spec and tasks describe, or you are tempted to drop, narrow, defer, or accept exceptions to specified behavior to make it fit → surface the added scope and ask; do not absorb it silently
   - Error or blocker encountered → report and wait for guidance
   - User interrupts
'@
            Replace = @'
   **Pause if:**
   - **Pending commit (HARD STOP, never commit in the same turn you stage):** Follow the jois-git-commit-hygiene rule. Changes are ready to commit when one concern is complete, not when the task list is done. Stage and present a commit after each concern, before starting a task that belongs to another concern. If the stage spans several concerns, unstage and present only the first, and offer the rest as following commits.
     1. Stage the files of that concern by explicit path (`git add <path>`) and run `git diff --staged --stat`.
     2. Print, as plain text in your reply (not inside a question tool): the staged file summary and the proposed commit message.
     3. **End your turn there.** Do NOT call AskUserQuestion or any other tool, and do NOT run `git commit`. Say: "Staged. Reply with <word> to commit, or tell me what to change." Use a common word that differs from the word in your previous prompt.
     4. A message approving the *feature* (e.g. "looks good", "works well") or a plain "yes" is NOT approval to commit. Only the word from your most recent staged-changes prompt counts.
     - **If the user types the word:** run `git commit` with the proposed message, then continue with the remaining tasks.
     - **If the user asks for changes:** make them, restage by explicit path, reprint the summary and the revised message with a new word, and end your turn again. Repeat until the user types the current word.
   - **Visual verification:** the task produces visually checkable changes (UI, styling, layout) → tell the user what to check and how to view it.
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - A task needs work beyond what the spec and tasks describe, or you are tempted to drop, narrow, defer, or accept exceptions to specified behavior to make it fit → surface the added scope and ask; do not absorb it silently
   - Error or blocker encountered → report and wait for guidance
   - User interrupts
'@
        }
        @{
            File    = 'apply.md'
            Name    = 'commit pause output template'
            Find    = @'
**Output On Completion**
'@
            Replace = @'
**Output On Commit Pause**

```
## Ready to Commit

<staged file summary>

<suggested commit message>

Reply with <word> to commit, or tell me what to change.
```

**Output On Completion**
'@
        }
        @{
            File    = 'archive.md'
            Name    = 'allow the git commands the commit step uses'
            Find    = @'
allowed-tools: Bash(openspec:*)
'@
            Replace = @'
allowed-tools: Bash(openspec:*), Bash(git add:*), Bash(git diff:*), Bash(git status:*), Bash(git commit:*)
'@
        }
        @{
            File    = 'archive.md'
            Name    = 'stage and propose the archive commit'
            Find    = @'
   - Note about any warnings (incomplete artifacts/tasks)

'@
            Replace = @'
   - Note about any warnings (incomplete artifacts/tasks)

7. **Stage and propose a commit (HARD STOP, never commit in the same turn you stage)**

   The archive (and any spec sync) leaves uncommitted changes. They are one concern: archiving this change. Follow the jois-git-commit-hygiene rule and keep unrelated edits out of the commit. After the summary:
   1. Stage them by explicit path (`git add <path>` for the archive directory, the moved change files and any synced main specs) and run `git diff --staged --stat`.
   2. Print, as plain text in your reply: the staged file summary and a concise proposed commit message (e.g. `chore(openspec): archive <change-name>`).
   3. **Ask with AskUserQuestion as the last action of your turn**: a single-select question such as "Commit these staged changes?" with the options "Yes, commit" and "No, let me change something". Do NOT run `git commit` in this turn.
   4. Commit only after the user picks "Yes, commit". If they pick "No", or answer via "Other" with changes, apply them, restage, reprint the summary and the revised message, and ask again.
   5. If nothing is staged (e.g. `openspec/` is gitignored), say so and skip this step.

'@
        }
    )

    # Strings that must be in the patched output. A patch can apply and still leave a file that no
    # longer says what we need (an upstream rewrite that moved the anchor); this catches that.
    Expect = @(
        @{ File = 'apply.md';   Text = 'HARD STOP' }
        @{ File = 'apply.md';   Text = 'End your turn there' }
        @{ File = 'apply.md';   Text = 'do NOT run `git commit`' }
        @{ File = 'archive.md'; Text = 'HARD STOP' }
        @{ File = 'archive.md'; Text = 'AskUserQuestion' }
        @{ File = 'archive.md'; Text = 'Yes, commit' }
    )
}
