# Planner Guide

The planner is a local web page, the backlog portal, for editing the user-story backlogs of a project. It saves every edit to plain CSV files that Excel can open, and the story skills (see [Story Skills](Story-Skills.md)) write their suggestions into the same files, so the portal and the skills never talk to each other directly. This page says how to start the portal and what each tab shows and edits. The step-by-step routines are on [User Flows](User-Flows.md).

## Words used on this page

A **backlog** is one folder of the data folder that holds a `user-stories.csv`. A **story** is one row of it, written as "As a ..., I want ..., so that ...", with acceptance criteria. Stories are grouped into a **feature**, and features into an **epic**. The **data folder** is the folder the portal reads and writes, and a **code base** is a project folder that keeps its backlogs in a `.plans` folder inside it. The layout of the data folder is on [Data Folder](architecture/Data-Folder.md). The rules for good epics, features and stories are in `planner/guidelines/product-backlog.md`, and the portal shows its sizing guideline next to the points selector.

## Run the portal

Run the commands from `planner/`, which holds `package.json` and `node_modules/`. `npm install` once, then `npm start`: it builds the page if needed, starts the server on `127.0.0.1:3000` (set `PORT` to change it) and opens the browser. `npm start -- --dev` runs the Vite development server with hot reload instead. After you change anything under `planner/portal/web/` or `planner/logic/`, run `npm run build` before the server shows the change.

The server serves the folder named by `dataDir` in `planner/planner.config.yaml`, or by `codeBase` (then `<code base>/.plans`). Without a config file the folder is `planner/data/`. The file `PLANNER_CONFIG` names, when set, is read instead of the config file. You can switch the folder from the Settings tab without editing the config by hand.

## The top of the page

The header shows the project name and a save chip with three states, "Saved", "Saving" and "Save failed". Every tab saves by itself shortly after you stop typing, so there is no Save button. When a save fails, for example because the file is open in Excel, the unsaved edits stay on screen and the portal retries until the file is writable. The browser also warns if you close the tab while a save is pending.

The file bar under the header holds the backlog dropdown, the backlog name (edit it and leave the field to rename the backlog), **New**, **Open folder** and a refresh button. New creates a backlog called `new-backlog` (`new-backlog-2` and so on when the name is taken) with empty starting files, opens it with one blank story and puts the cursor in its name. It never copies the backlog that is open. Open folder opens the data folder in Windows Explorer. Refresh re-reads every file from disk; the portal also does this when you return to the browser tab, and unsaved local edits win over what is on disk. When the data folder holds no backlog but holds the older layout, the file bar says so and points to the Settings tab.

The keyboard shortcuts are listed behind the keyboard button in the header. Alt+N adds a story and Alt+D deletes the selected one, both only on the Editor tab. Ctrl+Up and Ctrl+Down select the previous and next story, and Alt+Shift+N creates a new backlog from any tab. On a Mac, Option replaces Alt.

## Editor tab

The Editor edits the stories of the open backlog in the file `<backlog>/user-stories.csv`. On the left the story list is grouped as epic, then feature, then story. Each epic and feature head folds and unfolds, and the folds are remembered per backlog in the browser. Two buttons fold every epic or every feature at once. Dragging a story reorders it inside its epic or moves it to another epic, and dragging an epic or feature head moves the whole group. A story row shows its ID, title, sprint points, a count of open review suggestions and a count of open questions.

Story IDs such as `IAM-0003` are derived from the epic's initials and the story's position in the epic, so they change when stories are added, deleted, reordered or moved. The portal rewrites every `Depends On` link so that it follows its story. The **Renumber** button puts each feature's stories together in the order shown and renumbers them. This is why the skills and the portal name a story by its title and not by its ID alone.

A story with no epic has no ID yet, and one is assigned once an epic is set. The form on the right holds these fields:

- Epic, Feature and Title, with suggestions drawn from the names already in the backlog.
- The user story, split into "As", "I want" and "So that", with a preview of the single cell it is saved as.
- Sprint points on the scale 1, 2, 3, 5, 8, 13, 21, 34 and 55 (the buttons above 13 warn that the story should be split), and Priority.
- User acceptance criteria, each as Given, When and Then, which can be added, removed and reordered by dragging.
- Depends On, which lists the stories this one depends on and the stories that depend on it. A choice that would close a cycle is not offered.
- Notes, and Clarifications as numbered questions with answers, where an empty answer is an open question.

**Locked** marks a story as reference only. A locked story keeps its ID and epic, cannot be dragged or deleted, and is not submitted to the review skill. A lock button on each epic and feature head locks or unlocks every story of the group. **Move to Proposed** takes the story out of the backlog and puts it in the Proposed tab under a new placeholder ID. **Delete story** removes it after a confirmation. When the review has suggestions for the open story, they appear next to the field they concern with Apply and Dismiss buttons.

## Story IDs, dependencies and locks

A story with an Epic has an ID such as `IAM-0003`: the initials of the epic's words, then the story's position within its epic, which is the row order. A new story goes to the bottom of its epic. If two epics have the same initials, the later one gets a longer prefix (`DD`, `DDI`).

IDs are not fixed. They are recomputed when stories are added, deleted, reordered or moved to another epic, and when a file is opened, so reordering rows in Excel also renumbers them. Links in `Depends On` (IDs separated by `;`) are rewritten to follow their story, so they keep pointing at the same story. An ID quoted outside the file, in chat or in a ticket, can go stale. To reorder stories, drag them in the Stories panel of the Editor tab, and drop onto another epic's group to move the story to that epic. The first time an older backlog is opened, IDs are added and the file is saved with the new `ID` and `Depends On` columns.

A story is locked with the Locked toggle in the story form, or with **Lock selected** in the Stories tab, and it needs an ID. A locked story is reference only: it is not submitted for review (`jois-story-review` still reads it for context), keeps its ID and Epic, and cannot be dragged, moved to Proposed or deleted. Its title, points, dependencies and other fields stay editable. Unlocked stories take the lowest free numbers around the locked IDs, so numbering can have gaps. The lock is stored in the `Locked` column as `Yes`. When the review has a strong objection to a locked story it writes an `unlock` row. The story form then shows a banner with **Unlock** and **Dismiss**, and the review's other suggestions for that story cannot be applied until you unlock it.

## Stories tab

The Stories tab shows every story in one read-only table: ID, epic, feature, title, points, priority and depends on. Click a column header to sort ascending, then descending, then back to backlog order, and drag a column border to resize it (double-click fits the column to its text). The search box looks for a word in any field of a story, and three dropdowns filter by priority, epic and feature. Clicking a title opens the story in the Editor.

The tick boxes drive bulk actions on the selected stories: set Priority, Epic or Feature on all of them (confirmed first, because it cannot be undone and a new epic renumbers stories), lock, unlock, or delete. Locked stories keep their epic and are kept when deleting. Shift-click ticks a range, and ticks the search or filters hide are left alone by select-all.

## Graph tab

The Graph tab draws the dependencies between stories as a graph that you can zoom, pan and edit. Stories are grouped into clusters of linked stories, and a colour bar on each node shows its epic. To add a dependency, drag from the dot on a story onto the story it depends on, or select a story, press **Link** and click the target. The portal refuses a link to itself and a link that would create a cycle, and says why. Select an arrow and press **Remove dependency** (or the Delete key) to remove it. Each story is drawn to the right of the stories it depends on. Each cluster of linked stories has its own labelled band, largest first, and arrows never pass through a story box. Ctrl and the mouse wheel zoom, the wheel alone and dragging the background pan, and **Fit** shows the whole graph. Double-click a story, or press **Open in Editor**, to edit it. The Features and Epics buttons fold the stories into groups and are read-only: they show how many story links lie behind each arrow, and **Show stories** goes back to the story level with those stories highlighted.

## Proposed tab

The Proposed tab holds stories that are not in the backlog yet, in `<backlog>/user-stories/proposals.csv`. It is the Editor's list and form on that file, so you can add, edit, reorder and delete proposed stories, and it saves the same way. Proposed stories carry placeholder IDs `NEW-<n>` that never change, because their IDs are not derived from an epic. The tab label shows how many there are. The explore and propose skills write here, and so does Move to Proposed in the Editor.

Tick stories and press **Accept selected**, or press **Accept all**, to move them into the backlog. An accepted story goes after the last story of its epic, whatever its feature, and a story whose epic is new starts a new epic at the end. Backlog IDs are then recomputed and every `Depends On` link follows its story. Nothing moves if any story in the request has no epic, is benched, or would create a dependency cycle, and the tab says why. Open clarification questions do not block accepting, and the questions and answers move with the story when it is accepted or moved back to Proposed. A **benched** story is parked: the explore and propose skills ignore it, and Accept stays off until you un-bench it with the Benched checkbox.

## Lexicon tab

The Lexicon tab edits the backlog's defined terms in `<backlog>/lexicon.csv`. Each term has a name, a definition (required), an optional parent term in Part of, a list of Avoid words that stories must not use for this term, and notes. The list shows child terms indented under their parent, and the search matches name, definition and avoided words. An existing term saves when you leave a field, and a new one is added with the Add button.

The portal refuses a change that breaks a term rule and leaves what you typed on screen with the reason. The rules are: names are unique ignoring case, Part of must name another term and may not make a cycle, an Avoid word may not be the name of a term, and a term that other terms are part of cannot be deleted. Renaming a term updates its children's Part of. When the propose skill suggests renaming, deleting or editing a term, the suggestion appears at the top of the tab with Apply and Dismiss, and the term changes only when you apply it. The tab label shows how many suggestions are open.

Each suggestion shows its impact: the terms that use the old name in their wording, and the terms that are part of it. Apply does the same rename or delete as a change by hand. A rename also adds the old name to the term's Avoid list in the same save, along with any other suggested word (each is a checkbox), so the old name can be an Avoid word at once. A delete is refused while the term has children. A suggestion whose term is gone, or whose new name is now taken, can only be dismissed. The two skills that read the lexicon use its terms, and the propose skill can add or change terms too (see [Story Skills](Story-Skills.md)).

## Review tab

The Review tab appears only while the backlog has a review file, `<backlog>/user-stories/review.csv`, which the review skill and the propose skill write. It lists every suggestion in one place, open ones grouped by area (Hierarchy, INVEST, Acceptance criteria and the others the skills use) and out-of-date ones last. Each entry names its story, shows the proposed value with the changed words marked, gives the reason, and offers **Apply** and **Dismiss**. Apply makes the edit in the same way as a manual edit, so IDs, links and saving behave as usual, and marks the row applied.

Open questions are suggested as `Clarifications` rows, and Apply adds them to the story as unanswered questions. A suggestion is out of date when the story no longer matches what the row expects, for example because you edited the field or the story was renumbered. An out-of-date entry can only be dismissed. A suggestion on a locked story cannot be applied until you unlock the story. **Accept all**, for everything or for one area, asks you to confirm the number a dry run will apply and then applies them as one edit. **Clear all** deletes every row, including applied and dismissed ones, and leaves an empty review file.

## Settings tab

The Settings tab shows the project name, the data folder, the code base and the path of the config file, and it is always available, even when the data folder holds no backlog. The data folder box is read-only: **Change folder** opens the system folder dialog, which the server opens because a browser cannot return a full path. A folder that already holds backlogs is switched to at once. A folder that holds none is offered a copy of the current data (never overwriting a file) or an empty structure.

**Create missing folders** (init) creates the data folder when it is missing, and a first backlog `new-backlog` when the folder holds none, and lists what it created and what was already there. **Change code base** picks a project folder and uses its `.plans` folder as the data folder, and **Move data into a code base** copies the current data there first. The older layout is never read as data: when the folder holds it, a **Migrate older layout** button copies it into one folder per backlog and leaves the old files alone. After a switch the tab reminds you that skill scripts and open Claude sessions use the new folder only after they are started again.

## Where the facts come from

The tab behaviour above was checked against the components in `planner/portal/web/backlog-portal/components/` and the specs `user-story-editor`, `story-proposals`, `backlog-review-suggestions`, `backlog-lexicon` and `project-config` in `openspec/specs/`. Where an older spec text and the component disagree, this page follows the component. Two examples are the `user-story-editor` spec, which still says the Open folder button opens `backlogs/` and that there is no apply-all in the Review tab, and `CLAUDE.md`, which says init creates only the data folder. The code opens the data folder, offers Accept all and Clear all, and creates `new-backlog`.
