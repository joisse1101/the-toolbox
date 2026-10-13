Here is a complete summary, rule set, and example for each element in the core Agile hierarchy, moving from high-level vision down to specific verification criteria.

---

### 1. Epic

**What it is:**

A large strategic goal or major initiative that brings significant business value but is too large to complete in a single sprint. It serves as an umbrella for multiple related features.

**Rules:**

* Focuses on strategic outcomes, business capabilities, or major system overhauls.
* Takes multiple sprints or quarters to complete.
* Must be broken down into individual features before development begins.

**Example:**

> **Epic:** Streamline E-Commerce Checkout Experience

---

### 2. Feature

**What it is:**

A distinct functional component or service that delivers specific value to stakeholders or end users. It breaks down an Epic into manageable releases or increments.

**Rules:**

* Focuses on system-level functionality and benefits.
* Typically fits within a single release cycle or increment (usually 1–3 sprints).
* Must be sliced into multiple user stories to be built by the team.

**Example:**

> **Feature:** One-Click Guest Checkout via Digital Wallets

---

### 3. User Story

**What it is:**

A small, actionable piece of work written from the end-user’s perspective. It describes a specific interaction, who needs it, and what value it provides.

**Rules:**

* Follows the standard structure: *"As a [user role], I want [action], so that [value/benefit]."*
* Follows the **INVEST** principles (Independent, Negotiable, Valuable, Estimable, Small, Testable).
* Must be small enough to complete within a single sprint (ideally 1–3 days of effort).
* Multiple user stories belong to a single feature.

• I — Independent: The story should stand on its own as much as possible, avoiding heavy coupling or dependency domino effects so it can be prioritized, scheduled, and built flexibly.
• N — Negotiable: A user story is an invitation to a conversation, not a rigid, binding contract for features. Details can be adjusted and co-designed with developers and product owners.
• V — Valuable: It must deliver a clear, tangible benefit or value to the end user or customer (the "so that" part of the story).
• E — Estimable: The team must understand it well enough to size the relative effort required (using methods like t-shirt sizing or planning poker).
• S — Small: It should be concise and small enough to be planned, built, and completed comfortably within a single sprint or iteration (typically a few days of work).
• T — Testable: It must include clear acceptance criteria or conditions of satisfaction so everyone knows how to verify and test when the work is "done".

**Example:**

> **User Story:** As a return customer, I want to pay using Apple Pay on the product page, so that I can buy items immediately without going through the full cart flow.

---

### 4. User Acceptance Criteria (AC)

**What it is:**

A set of explicit, testable conditions attached to a specific User Story. It defines the boundaries of the work and determines when the story is officially "Done."

**Rules:**

* Must be unambiguous, objective, and testable (pass or fail).
* Focuses on *what* the system must do to satisfy the user, not *how* to code it technically.
* Written before development starts so the developer and tester share the exact same definition of success.
* Often written as bullet points or in Given-When-Then (Gherkin) format.

**Example:**

> **Acceptance Criteria (for the User Story above):**
> * **Scenario 1: Successful Apple Pay Checkout**
> * **Given** a user is logged in on an iOS device with a valid Apple Pay card configured,
> * **When** they tap the "Buy with Apple Pay" button on a product page,
> * **Then** the native Apple Pay sheet opens displaying the item cost, shipping fee, and total amount.
> 
> 
> * **Scenario 2: Out of Stock Item**
> * **Given** an item's stock is zero,
> * **When** the product page renders,
> * **Then** the "Buy with Apple Pay" button is disabled.
> 
> 
> 
> 

---

### Visual Hierarchy

$$\text{Epic} \xrightarrow{\text{contains many}} \text{Features} \xrightarrow{\text{contains many}} \text{User Stories} \xrightarrow{\text{validated by many}} \text{Acceptance Criteria}$$