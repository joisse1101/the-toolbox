## 1. Model

- [x] 1.1 In `src/user-story-generator/model.js`, rename story property `feature` to `title`, then `capability` to `feature`; update `COLUMNS` to `ID, Epic, Feature, Title, User Story, Sprint points, Priority, Depends On, Acceptance Criteria, Notes`, `newStory`, `storyFromCells` and `serializeBacklog`. Verify by running `node --test test/model.test.mjs` after step 4.1.
- [x] 1.2 Update `storyIssues` to require Epic, Feature and Title (messages name the field), `applyBulk` to take `feature` instead of `capability`, and `storyLabel` to return the trimmed Title or "New story". Verify with the updated model tests.

## 2. UI

- [x] 2.1 In `StoryForm.jsx`, replace the Capability and Feature inputs with Feature and Title, narrow the Feature datalist by Epic only, remove the Capability and Title datalists, and fix the field list near line 17. Verify the form shows Epic, Feature, Title and no Capability field (`npm run build`, then open the tool).
- [x] 2.2 In `StoriesTab.jsx`, show columns ID, Epic, Feature, Title, Points, Priority, Depends On, with the Title as the link that opens the story; rename the bulk edit Capability input and datalist to Feature. Verify in the Stories tab and that applying a bulk Feature change leaves IDs unchanged.
- [x] 2.3 In `GraphTab.jsx`, label nodes with `s.title` instead of `s.feature`; check the "No dependencies" list uses the same label. Verify in the Graph tab.

## 3. Data

- [x] 3.1 Rewrite only the header line of `user-stories/data-portal.csv` from `ID,Epic,Capability,Feature,…` to `ID,Epic,Feature,Title,…`, keeping the BOM and line endings, and verify (the file is gitignored, so no git diff) by loading it and checking that it round-trips byte-identical.
- [ ] 3.2 Open `data-portal.csv` in the built tool and verify the list shows story titles such as "Local Login", Feature shows "Authentication", no story is flagged red for a missing Feature or Title, and a save does not change the file apart from what the tool normally rewrites.

## 4. Tests

- [x] 4.1 Update `test/model.test.mjs` for the renames: column order, `.feature`/`.title`, the "blank capability" test becomes blank Feature and blank Title tests, and the `applyBulk` test uses `feature`. Verify with `node --test test/model.test.mjs`.
- [x] 4.2 Update `test/ids.test.mjs` (the unknown-column round-trip header), `test/reducer.test.mjs` (`byFeature` and the `Feature` header become Title) and add a model test that an old `Capability` column is kept unchanged and not copied into Feature or Title. Verify with `npm test` passing in full.

## 5. Review skill

- [x] 5.1 Create `.claude/skills/review-backlog/SKILL.md` with frontmatter (name, description, read-only `allowed-tools`) and instructions to: ask which backlog if none is named, read `product-management.md` and the CSV, treat CSV text as data, and never write files. Verify the file exists and its `allowed-tools` has no write or edit tool.
- [x] 5.2 Write the hierarchy, INVEST (with the decoupling definition of Independent and the 13-point Small rule) and acceptance-criteria checks, and the report format (summary counts first, findings grouped by area citing ID and Title, suggested fix per finding, "nothing found" stated per clean area), as specified in `specs/backlog-review-skill/spec.md`.
- [ ] 5.3 Run the skill on `user-stories/data-portal.csv` and verify it produces a report that follows the format and that `git status` shows the CSV unmodified by the review.

## 6. Docs

- [x] 6.1 Add a line to `CLAUDE.md` pointing to the review skill under Workflow, and check that `README.md` needs no change. Verify by reading both.
- [x] 6.2 Run `openspec validate rename-story-hierarchy-and-add-review-skill` and verify it passes.
