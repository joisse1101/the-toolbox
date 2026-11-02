---
name: jois-design-ui-principles
description: Visual-design and code-structure rules for a user interface. Use when designing, building, styling, reviewing or polishing a page, component, form, dashboard, card, table or layout, including writing its HTML, CSS or React code, or when asked to "make it look better" or to critique a screenshot. Do not use for behaviour-only changes, command-line tools, backend code or any code with no visual output.
metadata:
  version: "1.0.0"
  last_updated: "2026-11-02"
---
# UI design principles

Purpose: make an interface look designed and keep its frontend code grouped and easy to work with. Apply the rules while building, then run the checklist at the end.

## Source

- The visual rules are a paraphrased condensation of *Refactoring UI* by Adam Wathan and Steve Schoger.
- The structure rules (section 5) and every size limit are **not from the book**. They are this toolkit's own defaults.
- React mechanics (types, hooks, tokens, styles, breakpoints) live in the toolkit rule `jois-code-typescript-react`. This skill does not restate them.

## Three principles

1. **Hierarchy beats decoration.** Decide what matters most and make everything else quieter.
2. **Systems beat taste.** Choose from fixed scales (spacing, type, colour, shadow, radius), never from free values.
3. **Judge the real thing.** Build the actual UI and fix it there, not in a sketch.

## Step 1: use the project's tokens first

- A design token is a named value, such as a colour or a spacing step, kept in one place (CSS custom properties, a theme file or a Tailwind config).
- Look for the project's tokens before choosing any value.
- Use the project's tokens where they exist.
- Fill only the gaps from `references/tokens.md`, and tell the user those values are defaults.
- Add no new colour, size or shadow outside the scales.

## Step 2: choose a personality

- **Font:** serif is classic, rounded sans is playful, neutral sans is plain.
- **Colour:** blue is safe, gold is premium, pink is relaxed.
- **Radius:** none is formal, small is neutral, large is playful. Never mix square and rounded corners.
- **Copy tone:** impersonal reads official, casual reads friendly.

## Visual rules by topic

Each line is a summary. Read the named reference when the task touches that topic.

### Hierarchy

- Show importance with weight and colour, not size alone.
- Use two or three text colour roles and two font weights.
- Never use a weight below 400 in UI text.
- Quiet the competitors of the main element instead of enlarging it.
- Show a label only when the value does not explain itself, and then make it secondary.
- Style headings by importance, not by tag level.
- One primary action per view; secondary is quiet, tertiary looks like a link.
- Style a destructive action by its rank, and make it bold and red only in the confirmation step.

### Spacing and layout

- Start with too much space, then remove.
- Space between groups must be clearly larger than space inside a group.
- Take every size from a non-linear scale (see `references/tokens.md`).
- Make content only as wide as it needs; give cards a `max-width`.
- Scale large type down faster than small type on narrow screens.

### Typography

- Font sizes come from the type scale, in `px` or `rem`, never `em` (nested `em` values compound).
- Keep a paragraph 45 to 75 characters wide, set with `max-width` in `ch`.
- Line height falls as font size grows and rises as lines get longer.
- Align mixed sizes on one line by baseline.
- Left-align text, right-align table numbers, and widen the letter spacing of all-caps text.

### Colour (read `references/color.md`)

- Plan 8 to 10 greys, 5 to 10 shades of the primary hue, and a few accent hues.
- Define every shade up front; do not lighten or darken on the fly.
- Meet 4.5:1 contrast for small text and 3:1 for large text.
- Never use grey text on a coloured background; use a tint of that background's hue.
- Never carry meaning by colour alone.

### Depth (read `references/depth.md`)

- Light comes from above; raised items get a small shadow below.
- Shadow size encodes elevation: small for buttons, medium for menus, large for modals.
- Pick from about five shadow levels.

### Images and finishing touches (read `references/images-and-polish.md`)

- Keep text on images readable with an overlay or a lowered image contrast.
- Use icons and screenshots near their intended size.
- Crop user images to a fixed aspect ratio.
- Design empty states, and replace a border with space, a shadow or a background change where you can.

## Structure rules (not from the book)

Read `references/structure.md` when writing or changing markup or components. One line each:

- Put related elements in one named container; build a page from a few named sections, not a flat list of siblings.
- Put `gap`, flex or grid on the container, not margins on each child, and never position items absolutely to line them up.
- Use semantic elements (`section`, `header`, `nav`, `ul`, `form` with `label` and `fieldset`, `button`); use a `div` only when none fits.
- Make one component per visual unit, named by its role.
- Split a component that mixes layout, data and styling, or that passes about 100 lines or about 4 levels of JSX nesting (defaults, cues to split, not hard limits).
- Use a small layout helper (stack, row, grid taking the spacing token) instead of repeating flex rules.
- Keep code nesting in line with the screen: page, section, card, element.

## Reference files

| File | Read it when |
| --- | --- |
| `references/tokens.md` | The project lacks spacing, type, radius or shadow tokens, or you need the starter values. |
| `references/color.md` | You choose or build a palette, shades or text colours. |
| `references/depth.md` | You add shadows, raised or inset surfaces, or overlapping layers. |
| `references/images-and-polish.md` | The UI has images, icons, empty states or needs finishing touches. |
| `references/structure.md` | You write or restructure markup or components. |

## Review checklist

**Hierarchy**
- [ ] The most important element and action are obvious.
- [ ] Secondary information is quieted by colour or weight, not tiny size.
- [ ] One primary button per view.
- [ ] Destructive actions are ranked by importance.

**Systems**
- [ ] Spacing, sizes, colours, shadows and radius come from the scales or the project's tokens.
- [ ] Font sizes are in `px` or `rem`.
- [ ] No weight below 400 and no mixed corner styles.

**Layout and text**
- [ ] More space between groups than inside them.
- [ ] Paragraphs are 45 to 75 `ch` wide; nothing is stretched to fill.
- [ ] Mixed sizes are baseline-aligned; table numbers are right-aligned.

**Colour and accessibility**
- [ ] Text meets 4.5:1 (small) or 3:1 (large).
- [ ] No grey text on colour; meaning never rests on colour alone.

**Depth, images and polish**
- [ ] Shadows match elevation.
- [ ] Text over images stays readable; user images have a fixed aspect ratio.
- [ ] Empty states are designed.

**Structure**
- [ ] Related elements sit in one container that sets the gap.
- [ ] Semantic tags are used; no run of stacked `div`s.
- [ ] No component is far past about 100 lines or about 4 JSX levels.
- [ ] Repeated flex rules became one layout helper.
