## Context

A `Depends On` entry is plain text: a story code, a `NEW-<n>` placeholder, or anything a hand edit left there. `backlogProblems` (ids.js) already reports the three bad cases (does not exist, itself, still proposed). A review row of any kind goes through `validateFindings` when written and `applySuggestions` / `suggestionState` when applied (core/review.js). See proposal.md for why.

Today a `Depends On` row is validated as if it always named a story: the target must be a story of the backlog, not the story itself, and a `NEW-<n>` must be in the row's Group. That is right for `add`, which creates a link to a story. It is wrong for `remove`, which only deletes text the story already holds. Apply has the same assumption: it turns the entry into a story id (`idOf`) and then into the story's code, so an entry without a story fails with "a dependency needs both stories to have an ID".

`suggestionState` already treats `remove` as "stale when the story no longer lists the entry", with no story lookup.

## Goals / Non-Goals

**Goals:**
- A `remove` row works for any entry the story lists, so the review can ask for the removal of every problem `backlogProblems` reports.
- One rule for what a `remove` means: delete the listed entry.

**Non-Goals:**
- No change to `add` rows, to cycle checks, or to what counts as a problem.
- No attempt to decide what a dangling code "really" meant, or to restore a link when a proposal is accepted (the user adds it back by hand).
- No change to the review file columns, the portal UI or the lexicon.

## Decisions

**A `remove` is literal.** Apply filters the story's `dependsOn` by the entry text. A code that has since become a real story (a reorder or a new story can make `IAM-0099` exist) is removed like any other entry. Alternative: make the row stale when the entry now resolves to a story, so a dangling-link row only ever removes a dangling link. Rejected by the user: the review cannot know which link is valid, and proposals can be accepted in any order, so "stale is stale" and a row that still matches the story's text is applied.

**Validation splits on the action.** For `remove` the writer keeps one check: the story lists the entry. The "target is a story", "not itself" and "`NEW-<n>` in the same Group" checks apply to `add` only. A `remove` therefore needs no Group.

**`targetTitle` only where a story is named.** The Title check exists so an ID that shifted cannot point at a different story. On a `remove` it still runs when a story other than the row's own holds the code, because the row then names that story. When no story holds the code, or the code is the story's own, there is no other story to name, so the key is optional (and checked if given and a story is found).

**Apply resolves nothing for a `remove`.** The link list in `applySuggestions` keeps `target` as text. `add` still resolves the target story and its final code after the renumber; `remove` skips that lookup and the "needs both stories to have an ID" error, and filters `dependsOn` and `ambiguous` by the entry. The source story must still exist.

**`retargetRows` is unchanged.** It rewrites codes in `Current` and `Suggested` of open rows when stories are renumbered. A dangling code is not in the renumber map and stays as written; a `NEW-<n>` accepted into the backlog is rewritten in the story's `Depends On` by `renumber`, so the row's entry no longer matches and the row is stale.

**Skill goes back to `remove`.** The SKILL.md dependency row becomes one rule: every dependency problem on a submitted story is a `remove` (Area `INVEST`), with the Reason saying what the link was probably meant to be or, for a `NEW-<n>`, that it returns by hand on acceptance.

## Risks / Trade-offs

[A `remove` row for a dangling code deletes a valid link if the code became a real story before Apply] -> Accepted. Apply is a user click on a visible row that shows the entry; the row text and the story's `Depends On` match, which is what "not stale" means.

[`targetTitle` skipped on a no-story entry loses the shifted-ID guard for that case] -> There is no story to compare against, and the literal-match rule means a shifted ID cannot change which text is removed.

[Writer and Apply drift: the writer accepts what Apply cannot do] -> Both use the same rule (the entry is in `dependsOn`); tests cover a dangling, self and `NEW-<n>` row through write, `suggestionState` and `applySuggestions`.
