## Context

The toolkit's skills and commands are markdown instructions that a model follows; there is no code to change except wording and `allowed-tools` lists. A skill is callable by a model unless it says otherwise. A command that sets `disable-model-invocation: true` is not. `jois-story-review` and `jois-story-verify` are skills with no such flag, so they can already be called. `jois-code:review` and `jois-code:apply` are commands with the flag set.

Today each stage ends by handing a result to the user: propose writes proposals, plan writes and freezes a slice, apply builds and tests. The user decided that each stage should end with a check of its own output, and that errors are fixed before the next step (the tests, the freeze).

## Goals / Non-Goals

**Goals:**
- Each stage runs its check on its own output without the user asking.
- Certain mistakes are fixed automatically and every fix is reported.
- Nothing irreversible (the freeze) happens before the check passes.

**Non-Goals:**
- No new script, no new file format, no portal change.
- No change to what review, verify or validate check.
- No automatic decision on anything that needs the user's choice.

## Decisions

**Findings mode for review, not a second skill.** A caller passes a scope and review reads only and returns rows. This reuses review's checks and its row shape, so propose can turn a row straight into a patch. A separate "lint" skill would copy the checks and drift from the real ones.

**Propose fixes only `ready` findings.** Review already labels each row `ready` (the value is certain) or `confirm` (a value only the user can decide). Reusing that label gives "certain" a definition that exists today. A `confirm` finding becomes a Clarifications question, so nothing is guessed. Two rounds is the cap, matching apply's fix loop, so a loop between review and propose cannot run on.

**The review round runs after the write, not before the yes.** Review reads files through its script, and the drafts are not in any file until the write. The cost is a second, unasked write, so the new requirement states that exception, limits it to patches of the stories just written, and makes the report list every old and new value.

**Plan freezes after verify.** Verify needs the stored slice, so it must run after the write. The freeze cannot be undone by any tool, so it moves last, and only a critical finding blocks it. Warnings (`TBC` decisions, open questions) do not block, because "decide later" is a legitimate answer at the design checkpoint and would otherwise block every slice that has one. Slice corrections go through `write-diagram.mjs` without a second yes, for the same reason as in propose: the yes was for this slice. Verify writes nothing when called by plan, so the writer is used in one place only.

**Apply reviews after the last group's code is committed.** `code-review` looks at the branch against `main`, and apply commits a group only when all its tasks are done, test task included. So the last group is split in two commits: first its non-test tasks, then, after the review, any fix and the test task. Review fixes are their own `fix` commit through the existing fix loop, because review never edits code.

**Static check always, validate only for slices.** An OpenSpec change has no slice and no PR for validate to test against, and validate would ask the user. In that form review reports the behavioural check as not run. Validate runs the project's own tests in a throwaway checkout; for slices this overlaps the test task, which is accepted because validate checks claims and the test task checks the whole suite.

**Remove `disable-model-invocation` from `review.md` only.** Apply must call it. Review keeps its own rules (no commit, no push, no `--fix`), so removing the flag does not let a model change code through it. The other commands keep the flag.

## Risks / Trade-offs

- A model can patch a story the user never saw in that form. The report lists each patch, the user can edit it in the portal, and only `ready` findings are patched.
- Review, verify and validate are slow, and a slice run now does three checks. Accepted, because each catches what the others do not.
- A review that keeps finding things stops after 2 rounds and reports the rest, so the stage ends with findings listed rather than looping.
- Skills calling skills depends on the Skill tool being allowed in `allowed-tools`. A missing skill is reported as "not run", never as passed.
- `validate` may ask the user a question when apply calls review in the slice form. The user answers it, as `review.md` already says.
