## MODIFIED Requirements

### Requirement: Result file of a slice run
After a slice run, validate SHALL write a result file into the slice folder. It SHALL record each claim, its verdict and evidence, and whether the run was full or partial. A PR run SHALL write no file and print its report only. The result file is a working file: validate SHALL say in its command file that `/jois-code:archive` copies its summary into `ARCHIVED.md` and then removes it, and validate SHALL NOT read a result file of an earlier run back.

#### Scenario: Full run
- **WHEN** a slice run tests every claim
- **THEN** the file says the run was full and lists every verdict

#### Scenario: Partial run
- **WHEN** a run names one story
- **THEN** the file says partial and lists only the claims tested

#### Scenario: PR run
- **WHEN** the target is a PR number
- **THEN** no file is written

#### Scenario: Slice already reduced by archive
- **WHEN** validate is run on a slice whose folder holds only `ARCHIVED.md` and `source.json`
- **THEN** validate says the slice is archived and its tasks are gone, and tests nothing
