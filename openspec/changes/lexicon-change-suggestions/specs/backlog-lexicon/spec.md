## ADDED Requirements

### Requirement: Lexicon tab shows suggestions
When the open backlog has open lexicon suggestions, the Lexicon tab SHALL show them at the top of the tab, above the term form, with the count of open ones in the tab label, as described by `lexicon-suggestions`. A suggested rename or delete SHALL change the lexicon only when the user applies it, and then through the same rules as renaming or deleting a term by hand (`Term rules`). The tab SHALL otherwise behave as before when there are none.

#### Scenario: Suggestions listed
- **WHEN** the file holds two open suggestions
- **THEN** the tab shows both with Apply and Dismiss and the count 2

#### Scenario: Nothing applied by itself
- **WHEN** the tab is opened with an open delete suggestion
- **THEN** the term is still in the lexicon

#### Scenario: Same rules as by hand
- **WHEN** the user applies a delete of a term that has children
- **THEN** the message is the one a manual delete shows and the lexicon is unchanged
