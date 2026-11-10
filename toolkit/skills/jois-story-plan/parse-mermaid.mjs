// Mermaid's own parser, for the slice and context map writers: a diagram that cannot render is refused before the user sees it.
// Mermaid needs a DOM even to parse, so a jsdom window is installed once, before mermaid is loaded. Both packages are installed
// in this skill's own folder (package.json and package-lock.json beside this file; the installer runs `npm ci` there).
// When they are missing, mermaidMissing() says so, naming the folder and the command, and the writers refuse: the check is never skipped.
import fs from 'node:fs';
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

// The mermaid fences of a markdown text (``` or ~~~, indented or not, even empty) -> [{ text, line }], `line` being the
// line of the first diagram line. An indented fence has its indent taken off its lines.
export function mermaidBlocks(markdown) {
  const text = markdown.replace(/\r\n/g, '\n');
  return [...text.matchAll(/^([ \t]*)(```|~~~)mermaid[ \t]*\n([\s\S]*?)^[ \t]*\2[ \t]*$/gm)].map((m) => ({
    text: m[3]
      .replace(/\n$/, '')
      .split('\n')
      .map((l) => (l.startsWith(m[1]) ? l.slice(m[1].length) : l))
      .join('\n'),
    line: text.slice(0, m.index).split('\n').length + 1,
  }));
}

// Command line, so a command can check a diagram it is about to write:
//   node parse-mermaid.mjs [--bare] <file | ->      `-` reads standard input
// Every mermaid fence of the input is parsed (one left open, or with text after `mermaid`, counts as a failure), and input
// with no fence is "0 diagrams, 0 failed". With --bare the whole
// input is one diagram (a .mmd file). Prints one line per diagram and exits 0 when all parse, 1 when one fails, 2 when the
// input cannot be read or the packages are missing.
async function main(args) {
  const bare = args.includes('--bare');
  const arg = args.find((a) => a !== '--bare');
  if (!arg) {
    console.error('Usage: node parse-mermaid.mjs [--bare] <file | ->');
    return 2;
  }
  const missing = mermaidMissing();
  if (missing) {
    console.error(missing);
    return 2;
  }
  let input;
  try {
    input = fs.readFileSync(arg === '-' ? 0 : arg, 'utf8');
  } catch (err) {
    console.error(`Cannot read ${arg}: ${err.message}`);
    return 2;
  }
  const blocks = mermaidBlocks(input);
  const diagrams = bare ? [{ text: input.replace(/\r\n/g, '\n'), line: 1 }] : blocks;
  let failed = 0;
  // A fence that opens with ```mermaid but never closes, or has text after `mermaid`, is not a block above, so it would pass
  // unparsed. Count the openings and fail when some were not found.
  const opened = (input.match(/^[ \t]*(?:```|~~~)mermaid/gm) ?? []).length;
  if (!bare && opened > blocks.length) {
    failed += opened - blocks.length;
    console.log(`${opened - blocks.length} mermaid fence${opened - blocks.length === 1 ? '' : 's'} not parsed: FAILED (no closing fence, or text after the word mermaid)`);
  }
  for (const [i, d] of diagrams.entries()) {
    const r = await parseMermaid(d.text);
    if (r.ok) {
      console.log(`diagram ${i + 1} (from line ${d.line}): ok`);
    } else {
      failed += 1;
      console.log(`diagram ${i + 1} (from line ${d.line}): FAILED${r.line ? ` on its line ${r.line}` : ''}`);
      console.log(r.message.split('\n').map((l) => `  ${l}`).join('\n'));
    }
  }
  console.log(`${diagrams.length} diagram${diagrams.length === 1 ? '' : 's'}, ${failed} failed`);
  return failed ? 1 : 0;
}

// True when this file is the script node was started with. Real paths are compared, because a drive letter in another case,
// a short name or a link would make the plain URLs differ and the command would end silently with exit 0.
function runAsCommand() {
  if (!process.argv[1]) return false;
  try {
    const real = (u) => fs.realpathSync.native(u);
    const a = real(process.argv[1]);
    const b = real(fileURLToPath(import.meta.url));
    return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
  } catch {
    return pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
  }
}

if (runAsCommand()) {
  process.exitCode = await main(process.argv.slice(2));
}
