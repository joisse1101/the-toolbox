## MODIFIED Requirements

### Requirement: Lexicon file per backlog
Each backlog SHALL have at most one lexicon, the file `lexicon.csv` in its backlog folder. The file API SHALL expose it as the kind `lexicon`. The lexicon of one backlog SHALL NOT be visible in or affect another backlog. A backlog without a lexicon file SHALL work without error, and the file SHALL be created when the first term is saved.

#### Scenario: Lexicon follows the backlog
- **WHEN** the open backlog is `IAM`
- **THEN** the Lexicon tab shows the terms of `IAM/lexicon.csv`, and a backlog `Reports` shows its own `Reports/lexicon.csv`

#### Scenario: No lexicon yet
- **WHEN** the open backlog has no lexicon file
- **THEN** the Lexicon tab shows an empty list with no error, and saving a first term creates the file

## REMOVED Requirements

### Requirement: Lexicon is backed up with its backlog
**Reason**: Backups were not useful to the user, so the feature is removed with the backlog folder change.
**Migration**: None. Backups already on disk are left where they are and are no longer read, listed or copied.
