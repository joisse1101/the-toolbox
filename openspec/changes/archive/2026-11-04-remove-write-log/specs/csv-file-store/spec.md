# Spec Delta

## ADDED Requirements

### Requirement: The server serves a new data folder without a restart
The server SHALL start using a new data directory as soon as the config is saved with it, for the file API and the backup routes. It SHALL refuse the switch with a busy error while a write or a backup is running, and the old folder SHALL be left unchanged.

#### Scenario: Switch while idle
- **WHEN** a new data directory is saved and no write or backup is running
- **THEN** the next list, read or write request is answered from the new directory

#### Scenario: Switch during a write
- **WHEN** a new data directory is saved while a write or a backup is running
- **THEN** the server answers busy, the config and the served folder stay as they were, and nothing is written to either folder by the refused request

## REMOVED Requirements

### Requirement: Writes are logged
**Reason**: Nothing reads the write log, and it would add a file to a folder the code base's owner may commit.
**Migration**: None. An existing `logs/` folder is left as it is and is no longer updated.

### Requirement: The server switches data folder without a restart
**Reason**: Replaced by "The server serves a new data folder without a restart", which no longer mentions the write log.
**Migration**: None. The switch behaves as before.
