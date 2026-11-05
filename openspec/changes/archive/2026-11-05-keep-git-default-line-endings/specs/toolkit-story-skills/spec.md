# Spec Delta

## ADDED Requirements

### Requirement: Generated copies keep their source's line ending
The build script that writes the generated copies SHALL write each copy with one line ending throughout, including the first line naming the source: CRLF when its source file has CRLF endings and LF otherwise. A copy SHALL never mix the two.

#### Scenario: A source file has CRLF endings
- **WHEN** the build script runs on a machine whose checked-out planner files have CRLF endings
- **THEN** every line of every generated copy ends with CRLF and no copy has a lone LF

#### Scenario: A source file has LF endings
- **WHEN** the build script runs on a machine whose checked-out planner files have LF endings
- **THEN** every generated copy contains no `\r`

#### Scenario: The script runs in a CRLF checkout
- **WHEN** a user whose git has `core.autocrlf=true` runs the build script in a clean checkout
- **THEN** git reports no changed file
