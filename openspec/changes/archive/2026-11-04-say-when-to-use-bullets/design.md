# Design

## Context

The rule is `toolkit/rules/jois-comms-documents.md`, version `1.1.0`, scoped to `**/*.md`. It has five short sections, and three of them (Structure, Bullets, Words) hold fewer than three bullets. See proposal.md for why the change is needed.

`python check_toolkit.py` checks only that the rule is scoped to `md`, and no test reads its wording. So the only way to know whether the new wording changes what a writer produces is to have a writer follow it. The user asked for that to be done with subagents, comparing the rule before and after the edit.

## Goals / Non-Goals

**Goals:**

- The new rule changes what a writer produces on the cases in the issue, and the comparison shows it.
- The rule file follows its own rule.

**Non-Goals:**

- No change to `jois-comms-replies.md` or to the replies requirements in the spec.
- No rewrite of existing toolkit files, and no reinstall of the rule into `~/.claude/`.

## Decisions

### Section layout of the rule

The rule keeps its header order and changes what each section holds. Structure stays as it is, written as a paragraph. A new section, "Bullets and paragraphs", holds the parallel-items test, the read-aloud test, the three-bullet minimum, the header rule, and last of all the "one idea in one short sentence" instruction for the bullets that remain. A short "Numbered lists" paragraph and a "Rewriting" paragraph follow. Words and Next steps stay.

The one-idea instruction goes last because the old rule put it first, and a writer who reads it first splits everything before deciding whether a bullet is the right form. The alternative was to keep it in place and add a condition. I rejected it because the order of reading is what caused the problem.

### How the before-and-after test is run

Each writer is a fresh general-purpose subagent. It is given the rule text inline in its prompt and told that this text is the only rule for the task. Two variants exist: the old text, taken from git with `git show HEAD:toolkit/rules/jois-comms-documents.md`, and the new text from the working tree.

Two things keep the comparison fair. First, the global installed copy of the rule in `~/.claude/rules/` is the old version, and it loads whenever a `.md` file is touched. So every writer reads its inputs from `.txt` files and writes its outputs as `.txt` files under `.scratch/`, and the path-scoped rule never loads. Second, a separate grader subagent sees the outputs under neutral labels and does not know which is old or new.

The alternative was to run the comparison in the main session by editing the rule between runs. I rejected it because the main session already has the old rule loaded and cannot unload it.

### Fixtures

Fixtures are built from the repo's own text, as the mock-data rule asks, and live in `.scratch/bullets-test/`. Each one targets a point of the new rule:

| Fixture | Source | Expected result under the new rule |
|---|---|---|
| Chain of bullets | the commit-hygiene bullets "Name a confirmation word" then "Then end your turn" | one short paragraph |
| Reason and effect nested | README lines 549–557 and the nested bullet under `jois-comms-replies` | a paragraph with the reason kept |
| Reasoning paragraph | a "because ... so ..." paragraph from the README rules section | stays a paragraph, words intact |
| Parallel items | the five store kinds in `CLAUDE.md` (`backlog`, `review`, `proposals`, `lexicon`, `lexicon-suggestions`) | stays a bulleted list |
| Two-bullet list | the Structure section of the old rule | a sentence |
| Single-bullet header | the Words section of the old rule | a paragraph or no header |
| Rewrite check | a paragraph with three "because" clauses, asked to be shortened | every "because" survives |

The writers get one task: "rewrite each file following the rule, keep every fact."

### Size, repetition and judging

The run is two writers per variant, so four writers and one grader. Agents answer in different ways from run to run, and one run per variant could show a difference that is only luck. Each writer handles all seven fixtures in turn and writes one output file per fixture. Each writer appends a line to `.scratch/agents/<name>.log` after each fixture, as the repo's stay-in-repo rule requires, and nobody reads a subagent transcript. Results come from the output files and the final reports.

The grader scores each output against the table above and also counts how many "because" and "so" words from each input survive. A hand check of those counts and of the list fixture follows, so the verdict does not rest on the grader alone.

The test passes when the new-rule outputs meet every expectation in at least three of the four fixtures that the old rule is expected to get wrong, and the list and paragraph fixtures stay as they were in both variants. If the old rule already passes everything, that is reported as it is: either the fixtures are too easy or the change is not needed. If the new rule fails a fixture, the wording is revised and the run repeated once. A second failure goes back to the user.

## Risks / Trade-offs

- [The subagent follows the inline rule less strictly than a loaded rule] → The comparison measures the wording, not the loading, and the loading is already covered by the existing scoped-rule requirement.
- [Fixtures drawn from the repo are the same text the rule was written against] → The reasoning paragraph and the rewrite fixture each come from a different file than the one cited in the issue.
- [Four runs is a small sample] → The result is evidence for the wording, not proof. The report says so.
- [The rule file is longer, and it loads on every markdown read] → The spec states no size limit for this rule, and the added points are short.
- [Older toolkit files stay out of line with the new rule] → The spec sentence says they change when next edited, and a retrofit is a separate change.

## Open Questions

None that change the specs, the approach or the tasks. Whether the replies rule needs the same fix is a separate decision for the user.
