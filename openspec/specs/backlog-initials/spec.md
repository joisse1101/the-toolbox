# backlog-initials Specification

## Purpose
Give every backlog short initials that start each story ID, so no two stories in any backlog of the data folder share an ID.

## Requirements

### Requirement: Every backlog has initials
Every backlog SHALL have initials, a short code that starts the ID of every story of the backlog (`B1-IAM-0003`). They SHALL be stored in `backlog.json` in the backlog's folder as `{"initials":"B1"}`. Valid initials SHALL be 1 to 6 characters long, SHALL hold only letters and digits, SHALL start with a letter and SHALL contain no hyphen, and SHALL be stored in uppercase, so entered text SHALL be uppercased and anything else SHALL be rejected with a message that says what is valid. A backlog with no `backlog.json` SHALL be given the lowest `B<n>` (n counted from 1) that no sibling backlog in the same data folder uses, and the initials SHALL be saved in `backlog.json` when they are first needed. A backlog SHALL work with the initials read from its file or, until they are saved, the default it would be given.

#### Scenario: Default for a new backlog
- **WHEN** a backlog is created while two sibling backlogs use `B1` and `B2`
- **THEN** its `backlog.json` holds `{"initials":"B3"}`

#### Scenario: Lowest unused number
- **WHEN** sibling backlogs use `B1` and `B3` and a backlog without `backlog.json` is first used
- **THEN** it gets `B2`

#### Scenario: Older backlog
- **WHEN** a backlog has no `backlog.json` and its stories are shown
- **THEN** its stories show the default initials in their IDs and `backlog.json` is saved with them

#### Scenario: Entered in lowercase
- **WHEN** the user enters `ops` as the initials
- **THEN** the initials are stored as `OPS`

#### Scenario: Not valid
- **WHEN** the user enters `1A`, `A-B`, an empty value or seven characters
- **THEN** the initials are not changed and the message says valid initials are 1 to 6 letters or digits, start with a letter and have no hyphen

### Requirement: Edit the initials
The portal SHALL show the backlog's initials in an **Initials** box beside the Backlog name box, and the user SHALL be able to edit them there. The change SHALL be committed when the box loses focus, as a change of the backlog name is, and SHALL NOT change anything while the user is typing. A committed change SHALL be saved in `backlog.json`, and the IDs of the stories that are not frozen SHALL be recomputed with the new initials, with every `Depends On` entry that named an old ID rewritten to the new ID, so each link keeps pointing at the same story. A commit that does not change the initials SHALL change nothing.

#### Scenario: Change the initials
- **WHEN** the user changes `B1` to `OPS` and leaves the box in a backlog whose stories are not frozen
- **THEN** the stories are `OPS-IAM-0001` onward, `backlog.json` holds `OPS`, and each `Depends On` entry names the same story as before

#### Scenario: Not changed while typing
- **WHEN** the user is typing in the Initials box and has not left it
- **THEN** no story ID has changed yet

#### Scenario: Same value
- **WHEN** the user leaves the box without changing the value
- **THEN** nothing is saved and no ID changes

### Requirement: Initials are unique among sibling backlogs
The portal SHALL refuse initials that are used by another backlog in the same data folder, compared without regard to case, and SHALL refuse initials that start the ID of a frozen story of another backlog in the same data folder, that is, a frozen ID whose first part before the first hyphen equals the initials. The refusal SHALL name the other backlog, SHALL leave the initials unchanged and SHALL NOT save anything. The check SHALL cover the default as well, so the default is the lowest `B<n>` that passes it. It SHALL NOT look at backlogs in another data folder.

#### Scenario: Used by a sibling
- **WHEN** the backlog `iam` uses `B1` and the user enters `b1` in the Initials box of the backlog `billing`
- **THEN** the change is refused, the message names `iam`, and `billing` keeps its initials

#### Scenario: Retired initials in a frozen ID
- **WHEN** the backlog `iam` now uses `OPS` but still holds the frozen story `B1-IAM-0002`, and the user enters `B1` for `billing`
- **THEN** the change is refused and the message names `iam`

#### Scenario: Own backlog
- **WHEN** the user re-enters the initials their own backlog already uses
- **THEN** it is not treated as a clash

#### Scenario: Default skips taken initials
- **WHEN** a sibling backlog holds a frozen ID starting `B1-` and no backlog uses `B1`
- **THEN** a backlog without initials gets `B2`

### Requirement: Frozen IDs keep the initials they were given
A change of a backlog's initials SHALL change only the IDs of stories that are not frozen. The ID of a frozen story SHALL NOT change, so a backlog MAY hold frozen IDs that start with earlier initials, and each of those SHALL be read and shown as it is. Renaming a backlog SHALL NOT change its initials, and a backlog created or renamed SHALL NOT take its initials from its name. A backlog created on request SHALL get fresh default initials and SHALL NOT take them from another backlog.

#### Scenario: Frozen story keeps its ID
- **WHEN** `B1-IAM-0001` is frozen and the user changes the initials to `OPS`
- **THEN** it is still `B1-IAM-0001`, and the stories that are not frozen start `OPS-`

#### Scenario: Rename keeps initials
- **WHEN** the backlog `iam` with initials `B1` is renamed `identity`
- **THEN** its initials are still `B1`

#### Scenario: New backlog is fresh
- **WHEN** a backlog is created while `iam` uses `B1`
- **THEN** the new backlog does not get `B1`
