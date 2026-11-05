# User Flows

The routines a team lead follows with the planner and its story skills, one flow each. Every flow names the portal tab or skill involved and the file it reads or writes. Files are named from the backlog folder, written `<backlog>/`, inside the data folder. The tabs are described on [Planner Guide](Planner-Guide.md), the skills on [Story Skills](Story-Skills.md), and the folder layout on [Data Folder](architecture/Data-Folder.md).

Follow the flows in the order given the first time. The portal and the skills share nothing but these files, so each flow ends with a file on disk that the next one reads. When you change a file in the portal while a skill session is open, tell the session with `/jois-story:re-read`, which re-reads the backlog, proposals and lexicon and says what changed.

## Create a backlog

Use the **Backlog** file bar of the portal. The result is a new folder in the data folder with empty starting files, so every skill and tab works on it at once.

1. Start the portal (`npm start` in `planner/`) and open it in the browser.
2. Press **New** in the file bar (or Alt+Shift+N). The portal creates `<backlog>/user-stories.csv` and the other starting files of the folder layout under the name `new-backlog`, selects it and opens it with one blank story.
3. Type the real name in the Backlog name box and leave the field. The portal renames the folder.

When the data folder is new and holds no backlog at all, the Settings tab's **Create missing folders** does the same job and also creates the data folder itself. A backlog is created only from the portal. The skills never create one, and `jois-story-propose`, `jois-story-review` and `jois-story-plan` offer only to create the `.plans` folder of a code base when they find no data folder.

## Shape and save stories

Use the Editor, Graph and Stories tabs. The portal saves by itself, so the result is an up-to-date `<backlog>/user-stories.csv`.

1. On the **Editor** tab press **Add story** (Alt+N). The new story has no ID until you set its Epic.
2. Fill in Epic, Feature and Title, the "As", "I want" and "So that" parts, the sprint points and the acceptance criteria, including a failure case. Use Clarifications for what is not decided yet.
3. Set Depends On in the form, or switch to the **Graph** tab and drag from one story's dot to the story it depends on.
4. Watch the save chip in the header until it reads "Saved". If it reads "Save failed", close the file in Excel and the portal retries.
5. Use the **Stories** tab to check the whole backlog, to sort and filter it, and to set Priority, Epic or Feature on several stories at once. Lock stories that are settled so reviews and reordering leave them alone.

To work out stories in conversation first, use the skills as in the next flow. They do not write to `user-stories.csv`.

## Accept proposals

Use the explore and propose skills, then the Proposed tab. The skills write `<backlog>/user-stories/proposals.csv`, and accepting moves stories from it into `<backlog>/user-stories.csv`.

1. Start Claude in the code base folder (the skills look for `.plans` in the current folder only) and ask it to use `jois-story-explore` on a backlog and a story or an idea. It reads the backlog, proposals and lexicon and discusses scope, splitting, placement and dependencies. It writes nothing.
2. When the drafts are right, run `/jois-story:propose`, or ask for `jois-story-propose`. The skill shows each draft in full, checks it with the writers' `--check`, and writes `<backlog>/user-stories/proposals.csv` (new stories and patches to proposed ones). A skill that also writes terms or review suggestions asks one yes or no first. The command skips that question, because running it is the go-ahead.
3. Open the **Proposed** tab. Edit a story if needed, and answer its open questions.
4. Tick the stories to take and press **Accept selected**, or press **Accept all**. The portal moves them to the end of their epic in `<backlog>/user-stories.csv`, renumbers the backlog, and removes them from `proposals.csv`. If it refuses, for example because a story has no Epic or is benched, nothing moves and the message says why.

A story already in the backlog is not proposed again. A change to it comes back as a review suggestion in the next flow, and **Move to Proposed** on the Editor tab does the reverse of accepting.

## Review and apply suggestions

Use the review skill, then the Review tab or the story form. The skill writes `<backlog>/user-stories/review.csv`, and applying a suggestion edits `<backlog>/user-stories.csv` and marks the row in `review.csv`.

1. Ask Claude to use `jois-story-review` on the backlog. It reads the backlog Epic by Epic against `planner/guidelines/product-backlog.md`, then writes its findings to `<backlog>/user-stories/review.csv` and reports them in the chat. It never edits `user-stories.csv`, and it treats locked stories as reference only.
2. Open the **Review** tab, which appears once the review file exists. Each suggestion shows its story, the proposed value, the reason, and Apply and Dismiss. The same suggestion also shows next to its field in the Editor's story form, and the story list shows a count.
3. Press **Apply** to make the edit, or **Dismiss** to drop it. A suggestion marked out of date can only be dismissed, and one on a locked story can be applied only after you unlock the story. **Accept all** applies a whole area after you confirm the count.
4. Re-run the review after large changes. A later full review replaces the suggestions that are still open, so apply the ones you want first.

`/jois-story:propose` can add review rows too, for changes you agreed to in a session for stories already in the backlog. They appear in the same places. The command `/jois-story:review` is not this flow. It audits the session's own work, reads files only, and writes nothing.

## Edit the lexicon

Use the Lexicon tab, or the propose skill. Both work on `<backlog>/lexicon.csv`. Suggested changes to existing terms go through `<backlog>/lexicon/lexicon-suggestions.csv`.

1. Open the **Lexicon** tab. Press **Add term**, type a name and a definition, and add the words stories must not use in Avoid. Choose a parent in Part of when the term belongs to another.
2. Edit an existing term by changing its fields. The term saves when you leave a field, and a change that breaks a term rule stays on screen with the reason.
3. For terms discussed in a skill session, run `/jois-story:propose`. It writes new terms straight into `lexicon.csv`. An edit, rename or delete of an existing term is written to `lexicon-suggestions.csv`, and it shows at the top of the Lexicon tab.
4. Press **Apply** on a suggestion to change the lexicon under the same rules as a manual change, or **Dismiss** to drop it. Apply the suggestion before you accept stories that use the new name.

## Plan a slice

Use the plan skill. It reads `<backlog>/user-stories.csv` and `<backlog>/lexicon.csv` and writes a slice, `<backlog>/slices/<slice>/`, holding the document `UC-<slice>.md`, the build tasks `tasks.md` and `source.json`. It may also write the context map, `<backlog>/context-map.json` and `<backlog>/context-map.md`.

1. Ask Claude to use `jois-story-plan` on the backlog. Say whether you want the slice for an Epic, a Feature or one story. The skill recommends one with a reason.
2. Optionally ask it to draw the context map first, which sets bounded contexts, owners and links between contexts. It shows the whole map and asks "Write this map?".
3. Answer the design checkpoint: the skill shows an outline of participants, contracts and failure branches, and asks for each design decision the stories do not settle.
4. Read the complete document and the complete `tasks.md` it shows in the same reply, and choose "Yes, write" to write both. There is one question for the two files. A typed "yes" is not enough, and nothing is written before that choice.
5. Open `UC-<slice>.md` in GitHub or the VS Code markdown preview, and tick tasks in `tasks.md` as you finish them. When a story changes later, the skill reports the slice as stale and redraws it only when you ask; after a redraw it tells you which ticks were reset or dropped.

The skill needs the packages in its own folder, installed by `npm ci` there. The installer does this unless it was run with `-NoPackages`. Proposed stories are not drawn, because they are not in the backlog until you accept them.

## Verify a slice

Use the verify skill. It reads the slice `<backlog>/slices/<slice>/` and the stories in its scope, and writes only after you approve: a corrected slice to the same folder, or review suggestions to `<backlog>/user-stories/review.csv`.

1. Ask Claude to use `jois-story-verify`, or run `/jois-story:verify` with the backlog and the slice. When you name none, it asks which.
2. Read the ranked report: critical, warning and suggestion findings, each with a fix and an owner, and any check that was not run.
3. For a slice fix, read the complete corrected document and `tasks.md` and choose "Yes, write", or "No, change it". A typed "looks good" is not an answer.
4. For a story problem, read the suggestion row it shows and answer yes or no. Then apply or dismiss the suggestion in the Review tab. The skill never edits a story.
5. Answer any `TBC` decision it asks you. It never fills one with a guess.

The skill needs `jois-story-plan` installed, because it uses that skill's scripts.

## Change the data folder or code base

Use the Settings tab. It reads and writes the config file, `planner/planner.config.yaml` (or the file `PLANNER_CONFIG` names), and copies backlog files between folders.

1. Open the **Settings** tab and press **Change folder** to pick another data folder, or **Change code base** to use a project folder's `.plans` as the data folder. **Move data into a code base** does the same and copies the current data into it first.
2. The portal copies the current project's backlogs to the chosen folder and replaces the project's saved path, not adding a second entry. An empty or missing folder is copied to without a prompt. If the folder already holds backlogs, the portal lists the files an overwrite would replace and asks **Overwrite**, **Just switch** or **Cancel**. The path is saved only after every file has been read back, so a failed copy changes nothing. Choosing a code base saves `codeBase` and removes `dataDir`, because the config accepts only one of them.
3. If the tab offers **Migrate older layout**, press it to copy files of the older layout into one folder per backlog. The old files stay where they are.
4. Restart skill sessions. The tab reminds you that scripts and open Claude sessions use the new folder only after they start again.

The server refuses a relative path, a system folder, a drive root and any folder inside this repository, so the dialog is the only way to set a folder from the portal.

## Switch between saved projects

Use the **Project** dropdown in the file bar. It reads and writes the `projects` list and the active path in `planner/planner.config.yaml` (or the file `PLANNER_CONFIG` names), and it touches no backlog file.

1. Open the **Project** dropdown and choose a saved project. The portal saves its path as the active one and reloads.
2. To add one, choose **Add Project...**. Link a code base (it offers to create `.plans/` and a first backlog when it has none) or create a project from a name in `planner/data/<name>`. A project already in the list is switched to and not added twice.
3. Restart skill sessions, because they read the active path only when they start.

A project whose folder has gone is shown disabled.
