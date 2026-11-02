# Structure rules

Purpose: how to group markup and split components so frontend code is easy to read and change.

## Source and status

- **Not from the book.** These rules, and every size limit in them, are this toolkit's own defaults.
- Size limits are cues to look for a split. They are not hard failures.
- React mechanics (types, hooks, tokens, styles, breakpoints) are in the toolkit rule `jois-code-typescript-react`. This file does not repeat them. Apply that rule alongside this one.
- The rules also fit plain HTML and CSS.

## Group related elements

- Put related elements in one named container.
- Build a page from a few named sections, such as `header`, `main` with sections, and a footer. Avoid one long flat list of siblings.
- Keep the code's nesting in line with the screen: page, section, card, element. Someone reading the code should see the same levels as someone reading the screen.

## Containers set the spacing

- Set `gap`, flex or grid on the container. Do not put a margin on each child.
- Why: one value on the parent moves every child together, and a new child needs no spacing rule.
- Never position items absolutely just to line them up. Use the container's flex or grid.
- Space between groups must be larger than space inside a group, so give each group its own container and its own gap. See the spacing rules in `SKILL.md`.
- Take the gap from the spacing scale (`tokens.md` when the project has none).

## Semantic elements

- Use the element that names the job. A `div` is for when none fits.

| Job | Element |
| --- | --- |
| A titled block of the page | `section` with a heading |
| Top of a page or card | `header` |
| A menu of links | `nav` containing a `ul` of links |
| A list of like items | `ul` or `ol` |
| Input fields | `form`, each field with a `label`; related fields in a `fieldset` with a `legend` |
| Anything clicked to act | `button` |
| Anything clicked to go elsewhere | `a` |

- Style by importance, not by tag. A heading's level is for the outline, and its size is a design choice.

## One component per visual unit

- Give each visual unit its own component, named by its role: `PriceCard`, not `Box2`.
- Split by role, not by size alone. Many tiny components with no meaning of their own is the opposite problem.
- Split a component that mixes layout, data and styling. Keep each job in its own part.
- Look for a split when a component passes **about 100 lines** or **about 4 levels of JSX nesting** (defaults).

## Layout helpers

- A layout helper is a small component or class that holds one layout rule, taking the spacing token as its input.
- Common ones: a stack (children in a column), a row (children in a line), a grid (children in columns).
- Use one when the same flex and gap rule would appear a third time.
- A helper lays out and nothing else. It holds no data and no styling beyond spacing.

```tsx
type StackProps = { gap?: string; children: React.ReactNode };

function Stack({ gap = "var(--ui-space-4)", children }: StackProps) {
  return <div style={{ display: "flex", flexDirection: "column", gap }}>{children}</div>;
}
```

- Prefer the project's own way of styling (see `jois-code-typescript-react`). The inline style above is only to keep the example short.

## Example: a card

- The card is one container with a gap. Its title, body and actions are children, and no child carries a margin.
- The actions are a row, with their own gap.

```tsx
function InviteCard({ title, body, onAccept, onDecline }: InviteCardProps) {
  return (
    <article className={styles.card}>
      <h3>{title}</h3>
      <p>{body}</p>
      <div className={styles.actions}>
        <button type="button" onClick={onDecline}>Decline</button>
        <button type="button" onClick={onAccept}>Accept</button>
      </div>
    </article>
  );
}
```

```css
.card {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-3);
  max-width: 32rem;
}

.actions {
  display: flex;
  gap: var(--ui-space-2);
}
```

- A row of such cards shares one parent that sets the gap between them, for example a `ul` with `display: grid` and `gap`.
- The same card using the helpers would be a `Stack` holding the heading, the paragraph and a row.
