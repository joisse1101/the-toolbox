// Mermaid's own parser, for check_diagram and write_diagram: a diagram that cannot render is refused before the user sees it.
// Mermaid needs a DOM even to parse, so a jsdom window is installed once, before mermaid is loaded. This lives on the skill side
// because planner/logic/ is pure and planner/portal/ must not bundle mermaid or jsdom. The packages are resolved from planner/,
// which holds node_modules; this folder has none above it.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const fromPlanner = createRequire(new URL('../../../planner/package.json', import.meta.url));
let mermaidPromise;

async function loadMermaid() {
  const { JSDOM } = fromPlanner('jsdom');
  const { window } = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.window = window;
  globalThis.document = window.document;
  const { default: mermaid } = await import(pathToFileURL(fromPlanner.resolve('mermaid')).href);
  mermaid.initialize({ startOnLoad: false });
  return mermaid;
}

// text -> { ok: true } | { ok: false, message, line } (line within the text, when the parser names one)
export async function parseMermaid(text) {
  mermaidPromise ??= loadMermaid();
  const mermaid = await mermaidPromise;
  try {
    await mermaid.parse(text);
    return { ok: true };
  } catch (err) {
    const message = String(err?.message ?? err);
    const line = /error on line (\d+)/i.exec(message)?.[1];
    return { ok: false, message, ...(line ? { line: Number(line) } : {}) };
  }
}
