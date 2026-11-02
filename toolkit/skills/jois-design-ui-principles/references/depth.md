# Depth

Purpose: how to use light, shadow and overlap so surfaces read as raised, sunken or layered. Paraphrased from *Refactoring UI* (Wathan and Schoger).

## Light comes from above

- Treat the light source as overhead.
- A raised item has a slightly lighter top edge and a small, sharp dark shadow just below it.
  - Make the top edge with an inset top shadow or a top border in a hand-picked lighter colour, not translucent white.
- A sunken item (an input, a well, a checkbox) has a lighter bottom edge and a small dark inset shadow at the top.
- Borrow the cues. Do not chase a realistic render.

## Shadow size is height

- A small, tight shadow means slightly raised, as for a button.
- A medium shadow suits a dropdown or popover.
- A large, soft shadow suits a modal.
- The higher an item sits, the more attention it takes.
- Define about five levels in advance and choose by the item's height above the page, not by look. Starter values are in `tokens.md`, marked as the author's defaults.

## Shadows follow interaction

- Lift on grab or drag: use a larger shadow.
- Press in on click: use a smaller shadow or none.

## Two shadows per level

- One large, soft, offset shadow stands for the direct light.
- One small, tight, darker shadow stands for the dark crease where an item meets the surface.
- Let the tight shadow fade out as elevation rises, because a high item no longer touches the surface.

## Flat designs still have depth

- A surface lighter than its background reads as raised. A darker one reads as sunken.
- A short solid shadow with zero blur gives a raised look without softness.

## Overlap to make layers

- Let a card straddle the edge between two background sections.
- Let an element extend past its container.
- Let carousel controls sit over the edge of the content.
- When two images overlap, add a gap in the background colour around the top one so the two do not clash.
