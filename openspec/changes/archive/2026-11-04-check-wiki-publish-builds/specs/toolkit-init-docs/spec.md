# Spec Delta

## ADDED Requirements

### Requirement: Publish workflow runs the builder
The shipped checker SHALL fail when `.github/workflows/wiki-publish.yml` exists and no non-comment line in it runs `build_wiki.py` with `--out`. It SHALL name `file:line` and say that `.md` links would reach the wiki unrewritten. It SHALL pass when the file does not exist, and it SHALL NOT depend on which folder holds the scripts.

#### Scenario: Shipped workflow passes
- **WHEN** the checker runs against the shipped `wiki-publish.yml`
- **THEN** the workflow check SHALL pass

#### Scenario: Plain copy of wiki/
- **WHEN** the workflow copies `wiki/` with `rsync` and has no step that runs `build_wiki.py --out`
- **THEN** the checker SHALL exit with failure and name the workflow file and the missing builder

#### Scenario: Builder named only in a comment
- **WHEN** `build_wiki.py --out` appears only on a comment line of the workflow
- **THEN** the checker SHALL exit with failure

#### Scenario: No publish workflow
- **WHEN** the repo has no `.github/workflows/wiki-publish.yml`
- **THEN** the workflow check SHALL pass

## MODIFIED Requirements

### Requirement: Re-run replaces in place
Everything the command manages SHALL sit between `jois-init:docs` begin and end marker comments in the file's own comment syntax. A re-run SHALL replace the content between the markers in place and SHALL NOT add a second copy. When the content between the markers differs from the template, the command SHALL show the diff and ask before replacing it, and SHALL leave the block as it is after a no.

#### Scenario: Second run
- **WHEN** the command runs twice in the same repo and the user agrees both times
- **THEN** every managed block SHALL appear exactly once and the second report SHALL show the blocks as replaced or unchanged

#### Scenario: Project text kept
- **WHEN** a file holds text outside the markers
- **THEN** a re-run SHALL leave that text as it was

#### Scenario: Block edited by hand
- **WHEN** the content between the markers differs from the template
- **THEN** the command SHALL show the diff and ask before replacing it

#### Scenario: Replacement declined
- **WHEN** the user answers no to replacing a block that differs from the template
- **THEN** the block SHALL be left as it is and the report SHALL show the part as `skipped (declined)`
