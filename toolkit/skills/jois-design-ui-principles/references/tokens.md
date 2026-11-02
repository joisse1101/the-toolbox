# Starter tokens

Purpose: give Claude fallback values for a project that lacks spacing, type, radius, grey or shadow tokens. Use the project's own tokens first.

## How to use

- A design token is a named value, such as a colour or a spacing step, kept in one place.
- Use a starter value only where the project has no token for it.
- Tell the user the values are defaults.
- Map the `--ui-` names to the project's own names when copying. The prefix keeps the template from overriding a project's `--text` or `--radius`.

## Marks used in this file

- **Book:** the idea comes from *Refactoring UI*, with the numbers stated here in our own words.
- **Default:** a value the toolkit's author chose. Tune it.
- **Measured:** a contrast ratio computed with the WCAG formula (see Contrast below).

## Spacing scale (book idea, default values)

- Use one non-linear scale for padding, margin, gap, width, height and icon size.
- Neighbouring steps differ by about a quarter or more, so a choice is obvious.
- Need more space: take the next step up.
- Values in `px`: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Larger steps for widths: 192, 256, 384, 512, 640, 768.

## Type scale (book idea, default values)

- Hand-pick sizes. A mathematical ratio gives fractional sizes and too few useful ones.
- Values in `px`: 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72.
- Define font sizes in `px` or `rem`, never `em`.
  - Reason: nested `em` values compound. 14px inside 14px gives 12.25px, which is off the scale.
  - The ban covers font sizes only.
- Weights: 400 for normal, 600 for emphasis. Never below 400.
- Line height: 1.25 for large headings, 1.5 for body, 1.75 for small or wide text.

## Line length

- Keep a paragraph 45 to 75 characters wide.
- Set it with `max-width` in `ch`, for example `max-width: 65ch`.
- Use `ch`, not `em`, because the rule is counted in characters.

## Radius (default values)

- Pick one personality and keep it: none, small or large. Never mix square and rounded corners.
- Starter values: 4px, 8px and a full pill of 9999px.

## Starter CSS

```css
:root {
  /* spacing */
  --ui-space-1: 4px;  --ui-space-2: 8px;  --ui-space-3: 12px;
  --ui-space-4: 16px; --ui-space-5: 24px; --ui-space-6: 32px;
  --ui-space-7: 48px; --ui-space-8: 64px; --ui-space-9: 96px;
  --ui-space-10: 128px;

  /* type sizes */
  --ui-text-xs: 12px;  --ui-text-sm: 14px;  --ui-text-base: 16px;
  --ui-text-lg: 18px;  --ui-text-xl: 20px;  --ui-text-2xl: 24px;
  --ui-text-3xl: 30px; --ui-text-4xl: 36px; --ui-text-5xl: 48px;
  --ui-text-6xl: 60px; --ui-text-7xl: 72px;
  --ui-weight-normal: 400; --ui-weight-bold: 600;
  --ui-leading-tight: 1.25; --ui-leading-normal: 1.5; --ui-leading-loose: 1.75;

  /* radius: pick one personality */
  --ui-radius-sm: 4px; --ui-radius-md: 8px; --ui-radius-full: 9999px;

  /* greys, cool-tinted (default values) */
  --ui-grey-100: #f5f7fa;
  --ui-grey-200: #e5e8eb;
  --ui-grey-300: #cad1d8;
  --ui-grey-400: #9aa5b1;
  --ui-grey-500: #7b8793;
  --ui-grey-600: #606d7b;
  --ui-grey-700: #3d4852;
  --ui-grey-800: #1f2933;
  --ui-grey-900: #121a21;

  /* backgrounds */
  --ui-bg: #ffffff;
  --ui-bg-subtle: var(--ui-grey-100);

  /* text roles: only these greys may colour text */
  --ui-text-primary: var(--ui-grey-900);
  --ui-text-secondary: var(--ui-grey-700);
  --ui-text-tertiary: var(--ui-grey-600);
}

p { max-width: 65ch; }
```

## Greys: where each may be used

- Text roles use `--ui-grey-900`, `--ui-grey-700` and `--ui-grey-600` only.
- `--ui-grey-100` to `--ui-grey-500` are for borders, dividers and backgrounds only.
- Do not use `--ui-grey-400` or `--ui-grey-500` for text. They fail 4.5:1 on white.
- The grey values are the author's defaults, not the book's.

## Contrast (measured)

Ratios use the WCAG relative-luminance formula, ratio = (L1 + 0.05) / (L2 + 0.05), on the hex values above.

| Text role | Colour | On `--ui-bg` (#ffffff) | On `--ui-bg-subtle` (#f5f7fa) |
| --- | --- | --- | --- |
| Primary | `--ui-grey-900` | 17.57:1 | 16.37:1 |
| Secondary | `--ui-grey-700` | 9.34:1 | 8.71:1 |
| Tertiary | `--ui-grey-600` | 5.29:1 | 4.93:1 |

- Every text role is at least 4.5:1 on both starter backgrounds.
- Re-measure after changing any grey or background.
- For reference, `--ui-grey-400` measures 2.50:1 and `--ui-grey-500` 3.67:1 on white, which is why they are not text colours.

## Shadow levels (author's defaults, tune to taste)

- Five levels, from small to large. Choose by where the item sits above the page, not by look.
- Each level has a tight, darker shadow and a large, soft one. The tight one fades as elevation rises.
- The values are not from the book.

```css
:root {
  --ui-shadow-1: 0 1px 3px hsl(210 30% 10% / .12), 0 1px 2px hsl(210 30% 10% / .24);
  --ui-shadow-2: 0 3px 6px hsl(210 30% 10% / .15), 0 2px 4px hsl(210 30% 10% / .12);
  --ui-shadow-3: 0 10px 20px hsl(210 30% 10% / .15), 0 3px 6px hsl(210 30% 10% / .10);
  --ui-shadow-4: 0 15px 25px hsl(210 30% 10% / .15), 0 5px 10px hsl(210 30% 10% / .05);
  --ui-shadow-5: 0 20px 40px hsl(210 30% 10% / .20);
}
```

- Level 1 suits buttons, 2 and 3 suit menus and popovers, 4 and 5 suit modals.
- See `depth.md` for how shadows respond to interaction.
