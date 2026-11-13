# Design

## Context

A slash command's text stays in the conversation after the command ends, and the model has no signal that the command is over. `apply.md` and `archive.md` each say to print the command's own line "at every stop after the slice is settled", and `archive.md` repeats this in its Rules, step 3, step 8d and Resuming. The word "stop" is not defined as the end of the run, so the model prints the line at the end of every later turn. See proposal.md for the full list of files.

## Goals / Non-Goals

**Goals:**
- A line is printed only at the end of a run that finished, and names the next stage.
- The wording defines when the run is over, so the instruction cannot be read as "every turn".

**Non-Goals:**
- No hook, state file or other mechanism to stop the model. The fix is wording, as the toolkit's commands are advisory text.
- No change to what apply and archive do besides the closing line.
- No change to `jois-code:validate` or `jois-code:review`, which print no command line today.

## Decisions

**Print the next stage's command, never the command's own.** A rerun line was the original purpose (copy it to resume). The user's flow is plan, apply, archive, and each stage naming the next is the useful hand-off. Resuming needs no printed line, because apply resumes from `tasks.md` and the user can type the command again. Alternative: keep the rerun line but only at the end. Rejected, because the user asked for one line at the end and nothing else.

**Print only on a finished run, not at early stops.** An early stop already says what to fix. A command line there invites the user to rerun before fixing. This also removes most of the "every stop" wording, since a finished run has exactly one end.

**Say outright that the line is never printed again.** Each file gets one sentence in its closing rule: the line is printed once, in the final reply of the finished run, and in no later reply. A positive definition of the end ("the run ends with this reply") alone was judged too weak, since the existing text was already a positive definition and still failed.

**Apply keeps choosing between archive and validate.** Step 11 already prints validate first when `validation.md` is missing or out of date, because archive refuses an unvalidated slice. That rule stays, and the line prints only the one command that applies.

**Archive prints nothing.** The next step after archive is the commit confirmation word, which is not a slash command. Its "Resuming" section is rewritten to say a rerun is a fresh command, with no printed line to copy.

**Plan prints apply at the very end.** The plan skill's last action is the commit question, after the freeze. The apply line goes in the reply that ends the run: after the question is answered, or at the end of the freeze reply when the question does not apply.

## Risks / Trade-offs

- [The model may still repeat a line from an older installed copy] → The fix reaches the user only after `Install-Toolkit.ps1` reinstalls the three items. The tasks end with a reminder; this change does not touch `~/.claude`.
- [Users lose the copyable rerun line] → Accepted, as the proposal says. Apply resumes from `tasks.md`.
- [A wording fix cannot be proven by a test that runs the model] → The tests pin the new sentences. A live check in the sample mock repo, as `CLAUDE.md` describes, covers behavior and is left to the user because it costs model tokens.
