# Design

## Context

- The toolkit has no skills yet (`toolkit/skills/` does not exist). The installer copies a skill folder whole (`Copy-Item -Recurse`) and hashes every file in it, so a `references/` subfolder installs and drifts like any other file.
- `check_toolkit.py` already requires `metadata.version` and `metadata.last_updated` on `skills/*/SKILL.md`. It does not check a skill's `name` against its folder.
- `toolkit/rules/jois-code-typescript-react.md` covers React mechanics (types, hooks, tokens instead of literals, colocated CSS modules, breakpoints). Nothing in the toolkit covers how the markup and components are grouped, which is the gap behind scattered elements and run-on components.
- The only design tokens in this repo are about 15 colour, radius and dark-mode variables in `planner/portal/web/shared/style.css`. There is no spacing, type or shadow scale. The toolkit must not depend on them.
- Source draft: GitHub issue #30. Its starter greys were measured on white: `--grey-400` 2.49:1, `--grey-500` 3.67:1, `--grey-600` 5.27:1.

## Goals / Non-Goals

**Goals:**
- A skill that fires on visual tasks only and costs little context when it does.
- Rules that defer to a project's own tokens.
- Starter values that obey the skill's own checklist.
- Frontend code that is grouped into containers, uses semantic elements and is split into components by role, so it is easy to work with.

**Non-Goals:**
- Changing the planner portal or the React rule.
- Restating React mechanics (types, hooks, styles) in the skill.
- Dark-mode, focus-state or responsive guidance.
- A tool that checks generated UI against the rules.

## Decisions

### Split into a lean `SKILL.md` plus `references/` now

- Layout: `SKILL.md` (at most 150 lines) with `references/tokens.md`, `color.md`, `depth.md`, `images-and-polish.md` and `structure.md`.
- Why: the draft is about 330 lines, and the colour, depth and image rules apply only to some tasks.
- Alternative: one file first and split later. Rejected because moving text into references later is easy but the lean entry file is the part worth testing.
- The A/B runs may still show the split is wrong. Then the files merge with no behaviour change.

### Project tokens first, starter values as fallback

- `SKILL.md` has one step: look for the project's tokens, use them, fill the gaps from `references/tokens.md`.
- Why: the toolkit is installed globally and cannot know any project's tokens.
- The starter names carry a prefix (for example `--ui-`) so they cannot override a project's `--text` or `--radius`.
- Alternative: ship no starter values. Rejected because a project with no tokens would then get no scale at all.

### Fix the contrast defect in the tokens

- Text roles use greys that measure at least 4.5:1: primary `--ui-grey-900`, secondary and tertiary `--ui-grey-600` or darker.
- Lighter greys are for borders and backgrounds only, and the file says so.
- The numbers are checked with a contrast calculation during the task, not left to the eye.

### Units: `px` or `rem` for font sizes, `ch` for line length

- The `em` ban exists because nested `em` values compound into off-scale sizes (14px inside 14px gives 12.25px). That is a font-size problem only.
- Line length is stated in characters (45 to 75), so `ch` matches it directly.

### Process section becomes the personality levers

- Keep font, colour, radius and copy tone, and "never mix square and rounded corners".
- Drop the human-designer workflow (grayscale first, disposable sketches, scope pessimism). Claude builds in one pass and these steps do not apply.

### Structure rules in the same skill

- Both halves fire on the same task (build or restyle a UI), so one skill and one description. `SKILL.md` carries the structure rules in one line each, and `references/structure.md` holds the detail and a small example (a card with title, body and actions, as a container with a gap).
- The skill links to `jois-code-typescript-react` for mechanics and adds only grouping, containers, semantic elements and component size.
- The size limits (about 100 lines, about 4 levels of JSX nesting) are the author's defaults, marked as such. They are cues to split, not hard failures.
- Alternative: a second skill for code structure. Rejected because it would need its own trigger on the same prompts, and the two would be loaded together anyway.
- Alternative: add the rules to the React rule. Rejected because that rule is about TypeScript and React mechanics, loads for every `.ts` and `.css` file, and the structure rules also apply to plain HTML and CSS.

### Description with a negative clause

- The draft's "ANY user interface… even if" over-triggers. The new description names designing, building, styling and reviewing a UI, including its frontend code, and excludes behaviour-only changes and non-UI code.
- It is tuned again after the A/B runs.

### A/B protocol

- 5 to 10 prompts, run with and without the skill using the `skill-creator` eval flow.
- At least 3 prompts are visual (a form, a dashboard card, a landing section).
- At least 2 check structure: one asks for a page with several related blocks, one for a long form. Judge the output by its code: a container per group, semantic tags, no flat run of siblings, no component past the limits.
- At least 1 is a small edit to existing UI (for example "add a Save button to this card"). It tests whether the skill fires on a small edit. If it does not and the structure suffers, move the structure rules into a rule that loads for `.css`, `.html` and `.tsx` files (the skill keeps the visual rules).
- At least 2 are negatives (a command-line change, a backend bug fix).
- At least 1 runs in this repo's portal, which has colours but no scale, to test the project-tokens-first step.
- Results are recorded in the pull request, not in the repo.

## Risks / Trade-offs

- [The skill under-triggers after the negative clause is added] → run the visual prompts first; loosen the description before shipping if any miss.
- [The skill improves nothing measurable] → report the comparison as it is; the change still ships only if the comparison shows the output is no worse and the negative prompts stay clean.
- [The structure rules turn into over-splitting, many tiny components] → the limits are cues, and the rule says to split by role, not by size alone; the A/B structure prompts check for it.
- [A paraphrase stays too close to the book] → write each rule in its own words and have no sentence copied; the attribution line names the book.
- [Prefix in token names is awkward for users who copy the starter CSS] → the reference file says to map the names to the project's own, so the prefix is a label for the template.

## Open Questions

- Which prefix for the starter tokens (`--ui-` is the working choice). Deferrable: it changes names only, not specs or tasks.
