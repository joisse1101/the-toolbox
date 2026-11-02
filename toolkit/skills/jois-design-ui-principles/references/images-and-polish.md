# Images and finishing touches

Purpose: how to handle images, icons and the small details that lift a plain design. Paraphrased from *Refactoring UI* (Wathan and Schoger).

## Images

- Use good photos. Do not design around a placeholder and expect to swap in a poor snapshot later.

### Text on an image

- The image must give the text steady contrast across its whole area. Combine these as needed:
  - Lay a semi-transparent overlay over it: dark under light text, light under dark text.
  - Lower the image's contrast, and adjust its brightness to match.
  - Tint it: lower contrast, remove colour, then fill with a brand colour using a `multiply` blend.
  - Add a soft glow behind the text: a text shadow with a large blur and no offset.

### Use things near their intended size

- Do not scale a small icon (about 16 to 24px) far up. It looks chunky. Place it inside a coloured shape instead.
- Do not shrink a full screenshot until its text cannot be read. Capture a smaller window, crop to part of it, or draw a simplified interface.
- Do not shrink large artwork down to icon size. Redraw a simpler version at that size.

### User-uploaded images

- Fix the aspect ratio and crop to fill: `object-fit: cover` or `background-size: cover`.
- Stop an image from bleeding into a matching background with a faint inner shadow or a semi-transparent inner border. A solid border tends to clash.

## Finishing touches

### Upgrade the defaults

- Replace list bullets with icons, such as checkmarks or arrows, or icons that fit the content.
- Make quotation marks in a testimonial larger and coloured.
- Give links their own weight or colour, or a thick underline set off from the text.
- Use the brand colour for the selected state of checkboxes and radio buttons.

### Accent borders

- A coloured strip is cheap decoration. Put one:
  - on top of a card,
  - beside an alert,
  - under the active navigation item,
  - under a heading,
  - across the top of the whole layout.

### Decorate backgrounds

- Keep the contrast low so content stays readable.
- Change the background colour of a section or panel.
- Use a gradient of two hues no more than about 30 degrees apart.
- Use a faint repeating pattern, over the whole area or along one edge.
- Place a few simple shapes or pattern fragments on purpose.

### Design empty states

- An empty state is a feature's first impression.
- Show an image or illustration and one clear, emphasised call to action.
- Hide tabs, filters and other controls that do nothing until content exists.

### Use fewer borders

- Replace a border with one of these:
  - a box shadow,
  - a slight change of background colour (drop the border when the backgrounds already differ),
  - more space.

### Components are not fixed shapes

- A dropdown can have sections, columns, icons and supporting text.
- Table columns that need no sorting can merge into one cell with its own internal hierarchy. Add images, badges and colour to cells.
- An important radio choice can become a set of selectable cards.
