## MODIFIED Requirements

### Requirement: Settings tab
The portal SHALL have a Settings tab that shows the data directory and where the config file is, lets the user change the directory, and runs init. The tab SHALL NOT offer a way to edit the project name: the Project dropdown in the page header already names the active project. The config file's `projectName` key is still read, and still shown in the page header and the browser title when it is set.

#### Scenario: View
- **WHEN** the user opens the Settings tab
- **THEN** it shows the data directory and the config file path, and no project name box

#### Scenario: Change and save
- **WHEN** the user chooses a valid new data directory with the folder picker
- **THEN** the config file holds the new value and the portal reloads from the new directory

#### Scenario: The data directory box is read-only
- **WHEN** the user opens the Settings tab
- **THEN** the data directory box shows the current directory and cannot be typed in

#### Scenario: Folder picker
- **WHEN** the user presses Change folder
- **THEN** the server opens the system's folder dialog and the chosen folder goes through the same check, offer and switch as any new directory

#### Scenario: Picker cancelled
- **WHEN** the user closes the folder dialog without choosing
- **THEN** nothing is checked, saved or switched

#### Scenario: Picker unavailable
- **WHEN** the server cannot open the folder dialog
- **THEN** the tab shows the reason and the data directory is unchanged

#### Scenario: Run init from the tab
- **WHEN** the user runs init
- **THEN** the tab shows the folders created and the folders that already existed

#### Scenario: Invalid value
- **WHEN** the user saves a value the server refuses
- **THEN** the tab shows the reason and the config file is unchanged

#### Scenario: Skill sessions
- **WHEN** the data directory has been changed
- **THEN** the tab states that skill scripts and open Claude sessions use the new directory only after they are started again
