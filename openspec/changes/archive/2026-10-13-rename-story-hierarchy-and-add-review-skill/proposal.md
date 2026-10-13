## Why

The story format is meant to follow the Agile hierarchy in `product-management.md`: Epic > Feature > User Story > Acceptance Criteria. The tool has an extra level (Capability) between Epic and Feature, and its "Feature" field actually holds the story's own title (`Local Login`, `Logout`). The labels therefore do not match the guideline, and the list label `<capability>: <feature>` is really `<feature>: <title>`.

Some guideline rules (INVEST, acceptance-criteria quality, whether titles, features and epics sit at the right level) need judgment and cannot be checked mechanically in the app. They belong in a review skill that reads a backlog and reports.

## What Changes

- Rename the story fields to match the guideline. The old Capability column becomes Feature, and the old Feature column becomes **Title** (the title of the user story). Epic is unchanged.
  - CSV columns become `ID, Epic, Feature, Title, User Story, Sprint points, Priority, Depends On, Acceptance Criteria, Notes`.
  - The story list label, Stories tab, Graph nodes, bulk edit bar and completeness check use the new names. The list label is the Title alone, or "New story" when blank.
  - Feature suggestions are narrowed by Epic only. Title has no suggestions.
  - Bulk edit offers Priority, Epic and Feature (was Capability).
- **BREAKING**: the `Feature` header now means what `Capability` meant. An old file loaded unchanged would show its titles as features. The header line of `user-stories/data-portal.csv` is rewritten once (`Capability` to `Feature`, `Feature` to `Title`). The tool gets no legacy-header handling.
- Add a repo skill, `.claude/skills/review-backlog/SKILL.md`, that reviews a backlog CSV against `product-management.md` and **only reports, suggesting fixes**; it never edits the CSV. It covers:
  - hierarchy: each Title is a story and not a feature or epic, each Feature sits under the right Epic, single-story features and single-feature epics, epic and feature at the right level
  - INVEST per story: Independent (for each `Depends On` link, a hard block or something a mock or stub removes), Negotiable, Valuable, Estimable, Small, Testable
  - acceptance criteria: objective and pass/fail, says what and not how, covers the Title's intent
- The skill reads these checks from the guideline, with one local rule: Small means at most 13 sprint points. The in-app 13-point warning is unchanged.

## Capabilities

### New Capabilities
- `backlog-review-skill`: a read-only, repo-local review skill for a backlog CSV that reports hierarchy, INVEST and acceptance-criteria findings with suggested fixes.

### Modified Capabilities
- `user-story-editor`: Capability/Feature fields become Feature/Title, with the matching CSV columns, list label, suggestions, completeness check, Stories tab columns, bulk edit field and Graph labels.

## Impact

- `src/user-story-generator/model.js`: `COLUMNS`, story fields (`capability` to `feature`, `feature` to `title`), serialize, `storyIssues`, `applyBulk`, `storyLabel`.
- `src/user-story-generator/components/StoryForm.jsx`, `StoriesTab.jsx`, `GraphTab.jsx`: labels, datalists, bulk edit input, node title.
- `test/model.test.mjs`, `test/ids.test.mjs`, `test/reducer.test.mjs`: field and header renames.
- `openspec/specs/user-story-editor/spec.md`: modified requirements (applied on archive).
- `user-stories/data-portal.csv`: header line only.
- New `.claude/skills/review-backlog/SKILL.md`. No app code depends on it.
- `README.md` and `CLAUDE.md` mention no capability or feature fields, so they need no change.
- **Trade-off:** any CSV outside the repo with the old headers must be migrated by hand, because it would otherwise load without error but with titles under Feature.
