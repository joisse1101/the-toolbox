## Why

Claude's default UI output tends to look generic: everything shouts equally and spacing, sizes and colours are chosen freely. The frontend code behind it is often just as loose: long run-on components, elements scattered as siblings with no container around related ones, and stacked `div`s instead of meaningful structure, which makes it hard to work with. The advice in *Refactoring UI* (Wathan and Schoger) is concrete enough to turn into rules, and a skill applies those rules every time instead of re-explaining them in each prompt. A draft exists (GitHub issue #30) but is untested, and it has defects: its tertiary text colour fails the contrast it demands, and it contradicts itself on units. The toolkit also ships no skills yet, so this is the first one.

## What Changes

- Add the skill `toolkit/skills/jois-design-ui-principles/`, named by the toolkit's `jois-<domain>-<thing>` rule with a new `design` domain.
  - A lean `SKILL.md`: the three core principles, the rules by topic in one line each, the review checklist and a pointer to each reference file.
  - A `references/` folder read only when a task needs it: starter tokens, colour, depth, images and finishing touches, and code structure.
  - A structure half for the frontend code Claude writes (see below), so one skill covers how a UI looks and how its code is organised.
  - `metadata.version` and `metadata.last_updated` in the frontmatter, so `check_toolkit.py` accepts it.
- Rework the draft:
  - Use the project's own design tokens first; the starter values are a fallback and are marked as defaults.
  - Fix the starter text colours so every colour meant for text meets 4.5:1 on its background (the draft's tertiary grey measures 2.49:1).
  - Say "never `em` for font sizes" and give line length in `ch` (45 to 75), not `em`.
  - Give the starter tokens names that do not collide with common project names such as `--text` and `--radius`, and move the shadow values into the starter block, marked as the author's values.
  - Cut the process section to the personality levers (font, colour, radius, copy tone).
  - Write a description that says when to use the skill (designing, building, styling, reviewing or polishing a UI, including its frontend code) and when not to (behaviour-only changes, non-UI code).
- Add structure rules for frontend code, new to the draft (the book has none), with size limits that are the author's defaults:
  - Group related elements in one named container; a page is a few named sections, not a flat list of siblings.
  - Put `gap`, flex or grid on the container, not margins on each child, and never position items absolutely to line them up.
  - Use semantic elements (`section`, `header`, `nav`, `ul`, `form` with `label` and `fieldset`, `button`) instead of stacked `div`s.
  - One component per visual unit, named by its role; split one that mixes layout, data and styling, or passes about 100 lines or about 4 levels of JSX nesting.
  - Use small layout helpers (a stack, a row, a grid that takes the spacing token) instead of repeating flex rules.
  - Keep the code's nesting in line with the screen: page, section, card, element.
  - Leave React mechanics (types, hooks, tokens, CSS modules, breakpoints) to the existing `jois-code-typescript-react` rule and link to it.
  - Name the book as the source, paraphrase rather than quote, and mark every value the book does not give.
- Document the skill and the `design` domain in `toolkit/README.md`.
- Run 5 to 10 sample UI prompts with and without the skill, including prompts that check structure and prompts where the skill must not fire, and tune the description from the result.

## Capabilities

### New Capabilities

- `toolkit-ui-design-principles`: the `jois-design-ui-principles` skill, its triggering, its layout, how it uses a project's tokens, what its starter values must satisfy and the structure rules for the frontend code it writes.

### Modified Capabilities

None. `toolkit-skills` already requires a `SKILL.md` with `name` and `description` per skill folder, and its "installer works with no skills" requirement stays true.

## Impact

- `toolkit/skills/jois-design-ui-principles/`: new folder (`SKILL.md`, `references/`).
- `toolkit/README.md`: the "ships no skills" sentence, the domain table and a skill section.
- `toolkit/check_toolkit.py` and its tests: no change expected; the check already covers `skills/*/SKILL.md`. Verified by running it.
- `toolkit/rules/jois-code-typescript-react.md` is not changed; the skill links to it for React mechanics.
- Out of scope: any planner or portal change (the portal's own tokens are only a test project for the runs), dark-mode and focus-state guidance (not in the draft or the book), and a script that checks generated UI against the rules.
- Assumption: a paraphrased, attributed condensation of the book is acceptable to distribute with the toolkit. No passage is copied verbatim.
