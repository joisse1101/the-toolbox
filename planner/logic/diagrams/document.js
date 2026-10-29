// Reads a slice's document (UC-<slice>.md) into its diagrams: each fenced `mermaid` block with the heading it sits under.
// A diagram is named by its heading (`## Class diagram`, `### Sequence: <flow>`), so a block under another heading, a
// diagram heading with no block or with two, and a repeated heading are problems. Pure: the caller passes the text.

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const HEADING = /^(#{1,6})\s+(.*?)\s*$/;
const CLASS_HEADING = '## Class diagram';
const SEQUENCE_HEADING = new RegExp(`^### Sequence: (${SLUG})$`);
const FENCE_OPEN = /^\s*```+\s*([\w-]*)/;
const FENCE_CLOSE = /^\s*```+\s*$/;

// Which diagram a heading names: { kind: 'class' } | { kind: 'sequence', flow } | null.
function diagramOf(heading) {
  if (heading === CLASS_HEADING) return { kind: 'class' };
  const sequence = SEQUENCE_HEADING.exec(heading);
  return sequence ? { kind: 'sequence', flow: sequence[1] } : null;
}

// markdown -> { diagrams: [{ kind, flow?, heading, line, text }], problems: [{ message, line? }] }
// `line` is the line of the opening fence, `text` the block's content (the parser's line n is document line `line` + n).
export function readDocument(markdown) {
  const diagrams = [];
  const problems = [];
  const headings = new Map(); // diagram heading -> { line, blocks }
  let heading = null;
  let fence = null; // { lang, line, body }

  String(markdown ?? '').split(/\r?\n/).forEach((raw, i) => {
    const n = i + 1;
    if (fence) {
      if (!FENCE_CLOSE.test(raw)) {
        fence.body.push(raw);
        return;
      }
      if (fence.lang === 'mermaid') {
        const named = heading && diagramOf(heading);
        if (!named) problems.push({ line: fence.line, message: `the mermaid block is not under "${CLASS_HEADING}" or a "### Sequence: <flow>" heading` });
        else {
          headings.get(heading).blocks += 1;
          diagrams.push({ ...named, heading, line: fence.line, text: fence.body.join('\n') });
        }
      }
      fence = null;
      return;
    }
    const open = FENCE_OPEN.exec(raw);
    if (open) {
      fence = { lang: open[1].toLowerCase(), line: n, body: [] };
      return;
    }
    const h = HEADING.exec(raw);
    if (!h) return;
    heading = `${h[1]} ${h[2]}`;
    if (!diagramOf(heading)) return;
    if (headings.has(heading)) problems.push({ line: n, message: `the heading "${heading}" appears twice` });
    else headings.set(heading, { line: n, blocks: 0 });
  });
  if (fence?.lang === 'mermaid') problems.push({ line: fence.line, message: 'the mermaid block is never closed' });

  for (const [name, { line, blocks }] of headings) {
    if (blocks !== 1) problems.push({ line, message: `the heading "${name}" must have exactly one mermaid block (found ${blocks})` });
  }
  return { diagrams, problems };
}
