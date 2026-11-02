# Colour

Purpose: how to build a palette and choose text colours that look designed and stay readable. Paraphrased from *Refactoring UI* (Wathan and Schoger).

## Describe colour as HSL

- HSL means hue, saturation, lightness, the model CSS uses.
- Hue is the position on the colour wheel: 0 degrees is red, 120 green, 240 blue.
- Saturation 0% is grey. Lightness 0% is black, 50% is the pure colour, 100% is white.
- Design tools often show HSB instead. It is a different model, so convert before copying numbers into CSS.

## Plan more colours than five

- **Greys:** 8 to 10 shades. Most of an interface is grey. Start from a very dark grey, not pure black.
- **Primary:** 1 or 2 hues, 5 to 10 shades each. Light shades tint backgrounds, dark ones colour text.
- **Accents:** red for errors and destructive actions, yellow for warnings, green for success, plus a few highlight hues. Use each sparingly, with several shades.
- Charts, tags and calendars that show categories may need more hues.

## Define every shade up front

- Do not compute shades on the fly with a lighten or darken function.
- Build the scale in this order:
  1. Pick the base shade (500), one that works as a button background.
  2. Pick the darkest (900), for text, and the lightest (100), for tinted backgrounds. An alert box is a good place to tune both.
  3. Fill the middle (700 and 300), then 800, 600, 400 and 200.
  4. Build the greys the same way: darkest text colour first, then a faint off-white background.
- Adjust by eye once in use. Add a new shade only when the scale truly lacks one.

## Keep light and dark shades vivid

- Raising or lowering lightness alone drains colour.
- Raise saturation as a shade moves away from 50% lightness.

## Brightness differs by hue

- Yellow (60), cyan (180) and magenta (300) look bright. Red (0), green (120) and blue (240) look dark.
- To lighten a shade without washing it out, turn its hue a little toward the nearest bright hue.
- To darken one, turn it toward the nearest dark hue.
- Turn by no more than about 20 to 30 degrees.
- Example: a darker yellow moved toward orange stays warm instead of turning brown.

## Tint the greys

- A grey may lean cool with a touch of blue, or warm with yellow or orange.
- Raise saturation at the light and dark ends so the lean looks the same across the scale.

## Text contrast

- Small text needs at least 4.5:1 against its background. Large text needs at least 3:1.
- Measure with the WCAG formula, ratio = (L1 + 0.05) / (L2 + 0.05), where L is relative luminance. Do not judge by eye.
- Text colour roles are primary, secondary and tertiary. Only greys that pass 4.5:1 on the background may be text. See `tokens.md`.

## Readable without looking heavy

- White text on a mid-tone colour often fails, and the fix of a very dark background draws too much attention.
- Flip it: dark text of the colour's hue on a light tint of that hue.
- On a dark coloured panel, a coloured secondary text can gain contrast by turning its hue toward a brighter one, instead of going near white.

## Grey text on a coloured background

- Quieting text means lowering its contrast with the background.
- On a coloured surface, choose a colour of the same hue as the surface and adjust its saturation and lightness.
- Do not use grey, and do not use white at reduced opacity. Both look faded or disabled, and the second lets the background show through.

## Never rely on colour alone

- Pair colour with an icon, text or shape. Example: an up or down arrow next to a rising or falling number.
- In a chart with several series, vary lightness as well as hue so the series stay apart for colour-blind readers.
