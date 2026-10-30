## MODIFIED Requirements

### Requirement: Replies end with a next step or numbered questions
The replies rule SHALL tell Claude to act on a sensible default and say which default it chose, and to ask only when it is blocked on a decision that is the user's to make. It SHALL tell Claude to close a reply that needs an answer with the question set apart from the text above it. It SHALL tell Claude to write one question as a plain sentence ending with a question mark, not numbered. It SHALL tell Claude to number questions only when a reply holds several independent ones, each a full question on its own line ending with a question mark. It SHALL tell Claude to write alternatives as options inside one question, not as separate questions. It SHALL tell Claude never to place a question the user must answer inside a paragraph. It SHALL tell Claude to end a reply with one clear next step when it needs nothing from the user. It SHALL NOT require Claude to limit the number of options it presents or the number of questions it asks.

#### Scenario: Default is used and stated
- **WHEN** a sensible default exists for a decision
- **THEN** the rule SHALL require Claude to act on it and say which default it chose, without asking

#### Scenario: Question is not hidden
- **WHEN** Claude is blocked on a decision that is the user's to make
- **THEN** the rule SHALL require the question to close the reply, apart from the text before it

#### Scenario: One question is not numbered
- **WHEN** a reply holds exactly one question
- **THEN** the rule SHALL require it to be a plain sentence, not a numbered item

#### Scenario: Questions are numbered
- **WHEN** a reply holds two or more independent questions
- **THEN** the rule SHALL require them to be numbered, so the user can answer by number

#### Scenario: Alternatives stay in one question
- **WHEN** Claude offers alternatives for one decision
- **THEN** the rule SHALL require them to appear as options inside one question, not as separate numbered questions

#### Scenario: Nothing is asked
- **WHEN** Claude needs nothing from the user
- **THEN** the rule SHALL require the reply to end with the one next step

#### Scenario: Options are not capped
- **WHEN** the replies rule is read
- **THEN** it SHALL NOT limit Claude to a fixed number of options
