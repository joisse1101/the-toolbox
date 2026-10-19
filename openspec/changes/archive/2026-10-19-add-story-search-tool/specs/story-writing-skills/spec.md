## ADDED Requirements

### Requirement: Skills find related stories by search
The `explore-stories` and `propose-stories` skills and the `/story:*` commands SHALL be allowed to call `search_stories`, and SHALL use it to find stories related to the one under discussion (by its subject words, the terms it uses, or a story the user names loosely) instead of reading the whole `index` section for that purpose. Their input steps SHALL NOT list `index` among the sections read at the start of every use; it is read only when the task needs the whole backlog. They SHALL read a found backlog story in full with `read_context` using its ID and the Title the search returned, and SHALL read a found proposed story from the `proposals` section. They SHALL name stories to the user by Title. A search that finds nothing SHALL NOT be taken as proof that no related story exists: before telling the user a story is new, they SHALL try at least one other wording.

#### Scenario: Related story looked up
- **WHEN** the user asks to shape a story about exporting a report and the backlog has a story titled "Schedule CSV export"
- **THEN** the skill searches, finds that story by its Title, reads it with its ID and Title, and mentions it as related instead of reading the whole index

#### Scenario: User names the story in words
- **WHEN** the user starts a session with free text such as "data access" as the story
- **THEN** the skill calls `search_stories` with those words before any other story read, and does not read the `index` section to find the story; when the search returns its cap it adds a word and searches again

#### Scenario: Nothing found
- **WHEN** the first search for a new story's subject finds nothing
- **THEN** the skill tries another wording before it says the subject is not yet in the backlog or the proposals

#### Scenario: Found story is stale by the time it is read
- **WHEN** the search returned an ID and Title and the backlog was renumbered before the read
- **THEN** the Title check of `read_context` reports the mismatch and the skill follows the existing mismatch handling
