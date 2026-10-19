# Product backlog guidelines

The standards for every backlog in `user-stories/`. They are used both to write stories and to review them, and this file is the only place the rules are defined. Other files (such as the review skill) cite it.

```
Epic -> Feature -> User Story -> Acceptance criteria
```

An Epic contains several Features, a Feature several User Stories, and a Story is validated by several acceptance criteria.

---

## 1. Epic

**What it is:** a domain area of the product, named by a short noun phrase. It groups the Features that belong together.

**Rules:**

- Names an area, not an outcome or a project (for example "Identity & Access Management", not "Make logging in secure").
- Spans several Features. An Epic with one Feature is a question: merge it or confirm it is intended.
- Is not sized or described by how long it takes.

**Example:** `Identity & Access Management`

---

## 2. Feature

**What it is:** a capability a user would recognise by name, named by a short noun phrase.

**A candidate is a Feature if:**

- a user would recognise it by name ("Password Reset"),
- when all its stories are done it can be demonstrated end to end, and
- it is sliced into several stories. A Feature with one story is a question: split the story, merge the Feature into another, or confirm it is intended.

**Rules:**

- Belongs to exactly one Epic.
- Is not sized or described by how long it takes.
- A Feature that reads like a single story is a story; a Feature that reads like a whole area is an Epic.

**Example:** `Password Reset` (under the Epic `Identity & Access Management`)

---

## 3. User Story

**What it is:** a small piece of work written from the end user's perspective: who needs it, what they do and why it matters.

**Rules:**

- Format: *"As a [role], I want [action], so that [benefit]."* The "so that" is a real user or business benefit, not a restatement of the "I want".
- The Title names one story (a single action), not a Feature or an Epic.
- Belongs to exactly one Feature.
- Follows INVEST (section 4).
- **Size:** at most **13 sprint points**, on the scale 1, 2, 3, 5, 8, 13. A story above 13 is split. The tool also accepts 21, 34 and 55, but these are "too big, split" markers, not valid sizes. Stories are sized in points only, not in days. See [`sprint-points-guideline.md`](sprint-points-guideline.md) for what each number means.
- Does not prescribe the technical solution.

**Example:**

> **Title:** Request Password Reset Link
>
> **User Story:** As a user who forgot my password, I want to request a reset link by email, so that I can regain access without contacting an administrator.

---

## 4. INVEST

Every story is checked against these six principles.

- **I - Independent:** decoupled for planning and development. The story can be prioritised, estimated and built in any order, using mocks, stubs or test doubles for upstream state (a stub session, token or record), so a developer never waits on another story mid-sprint.
  - A real-world order is not a dependency problem. Logout happens after Login, but Logout can be built against a stubbed session.
  - A **hard block** is a problem: the story cannot be built or tested without another story's code. Layer-by-layer slices (a schema story, then an API story, then a UI story) are the typical case; slice vertically instead, so each story delivers a thin working path through every layer.
  - A **mockable** link is not a problem: a stub removes it. It may be recorded in Depends On, but it does not make the story dependent.
- **N - Negotiable:** the story states a need and invites a conversation. Details can change between the team and the product owner.
- **V - Valuable:** the "so that" states a tangible benefit to a user or the business.
- **E - Estimable:** the team understands it well enough to size it, so Sprint points is filled in.
- **S - Small:** at most 13 sprint points (section 3).
- **T - Testable:** it has acceptance criteria that can pass or fail.

---

## 5. Acceptance criteria (AC)

**What it is:** the explicit conditions attached to one story that define the boundary of the work and when it is done.

**Rules:**

- Unambiguous and objective: each criterion passes or fails. No measure-less words such as "fast", "user friendly" or "properly"; give a number or an observable result.
- Subjective qualities ("relevant", "readable", "intuitive") need a measurable bar: a fixed sample, a threshold and who judges it (for example "at least 8 of 10 results in the agreed sample are marked relevant by the product owner"). The reviewer's judgement alone is not a bar. If the bar cannot be fixed yet, put "to be agreed: <what>" in Notes.
- Says *what* the system does, not *how* it is built. No table names, classes or libraries.
- Can fail. A criterion that always holds tests nothing.
- Together the criteria cover the story's Title and "I want", including the failure path (invalid input, not found, not allowed).
- Written before development starts, so the developer and the tester share the same definition of success.
- Written in Given-When-Then form, one criterion per line, labelled `AC1`, `AC2`, and so on.

**Example** (for the story above):

- AC1: Given a registered email address, when I request a reset link, then an email with a single-use link is sent to that address
- AC2: Given an email address that is not registered, when I request a reset link, then the same confirmation message is shown and no email is sent
- AC3: Given a reset link older than 30 minutes, when I open it, then I am told it has expired and offered a new link

---

## 6. Clarifications

**What it is:** the `Clarifications` column holds the questions about a story that still need an answer, as pairs `Q1: <question>` then `A1: <answer>`. A question with an empty answer is open. Open questions block nothing.

**Rules when writing a story:**

- Make the story as complete as the facts allow: every field filled in, the failure path covered.
- A detail the user cannot settle yet (technical detail, ownership, a dependency, scope, an edge case) becomes a question in Clarifications. Do not guess it, and do not bury it in Notes.
- Never invent an answer. Record an answer only when the user states it.
- Ask the user for such unknowns while the story is being discussed, not only when it is written down.
- Notes hold facts and decisions; Clarifications hold what is still unknown.
- When the user answers a question while the story is being shaped, resolve it: the answer goes into Notes as a decision, and the question is removed from Clarifications. Write the decision so it reads on its own (for example "Approvals are owned by Finance"); leave out the question's wording when the answer already carries it. Resolve only an answer the user stated, and never remove a question without recording its decision in Notes.
