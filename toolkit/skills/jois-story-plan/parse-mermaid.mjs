// Mermaid's own parser, for the slice and context map writers: a diagram that cannot render is refused before the user sees it.
// Mermaid needs a DOM even to parse, so a jsdom window is installed once, before mermaid is loaded. Both packages are installed
// in this skill's own folder (package.json and package-lock.json beside this file; the installer runs `npm ci` there).
// When they are missing, mermaidMissing() says so, naming the folder and the command, and the writers refuse: the check is never skipped.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKILL_DIR = path.dirname(fileURLToPath(import.meta.url));
const fromSkill = createRequire(path.join(SKILL_DIR, 'package.json'));
let mermaidPromise;

// null when jsdom and mermaid can be loaded from the skill folder, else the message a writer refuses with.
export function mermaidMissing() {
  try {
    fromSkill.resolve('jsdom');
    fromSkill.resolve('mermaid');
    return null;
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err;
    return `The packages that check Mermaid diagrams (mermaid, jsdom) are not installed. Run \`npm ci\` in ${SKILL_DIR} and run this again; the diagrams are never written unchecked.`;
  }
}

async function loadMermaid() {
  const { JSDOM } = fromSkill('jsdom');
  const { window } = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.window = window;
  globalThis.document = window.document;
  const { default: mermaid } = await import(pathToFileURL(fromSkill.resolve('mermaid')).href);
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
