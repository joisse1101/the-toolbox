## MODIFIED Requirements

### Requirement: The typed word commits and the loop continues
When the user's next message is the word from the most recent prompt, `/jois-git:stage` SHALL commit
exactly the staged change, with no attribution line added to the message, and SHALL then stage
and present the next concern. It SHALL repeat until `git status` shows a clean working tree, and
then report the commits made. If the user asks for changes instead, it SHALL restage, present again
and name a new word.

#### Scenario: Loop reaches a clean tree
- **WHEN** the user confirms the last of three concerns
- **THEN** the command SHALL commit it, find the tree clean and report the three commits

#### Scenario: Changes requested
- **WHEN** the user answers a prompt with a request to change the message
- **THEN** the command SHALL revise, restage, present again with a different word and end its turn

#### Scenario: Commit carries no attribution line
- **WHEN** the user confirms a concern with the word from the most recent prompt
- **THEN** the commit message SHALL be the proposed `type(scope): subject` message and its body, with no `Co-Authored-By` or other attribution line added
