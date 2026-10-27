// The only way the meeting-minutes skill writes anything. Usage:
//   node .claude/skills/meeting-minutes/write-minutes.mjs "<title>" <YYYY-MM-DD>     (minutes markdown on stdin)
//   node .claude/skills/meeting-minutes/write-minutes.mjs --replace <file name>      (refined minutes on stdin)
//   node .claude/skills/meeting-minutes/write-minutes.mjs --template                 (prints template.md; writes nothing)
// Writes data/meetings/<slug>_<YYYY-MM-DD>.md, where the slug is the title in lowercase kebab-case. An existing file is
// never overwritten: a taken name gets the next free _1, _2, ... after the date. --replace swaps the content of a file
// that already exists (and only then). There is no output path argument: the folder is fixed and the name is built here.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeAtomic } from '../propose-stories/write-proposal.mjs';

const require = createRequire(import.meta.url);
const { DATA_DIR } = require('../../../planner/logic/paths.cjs');

const FILE_NAME = /^[a-z0-9]+(-[a-z0-9]+)*_\d{4}-\d{2}-\d{2}(_\d+)?\.md$/;

// "Sprint Planning!" -> "sprint-planning"; '' when the title has no letter or digit.
export function slugify(title) {
  return String(title ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// True for a real calendar date written YYYY-MM-DD.
export function isRealDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

// Returns { ok: true, file, replaced } or { ok: false, errors: [...] }. Writes nothing unless everything is valid.
export function writeMinutes({ dataDir = DATA_DIR, title, date, text, replace }) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, errors: ['The minutes on stdin are empty.'] };
  const body = text.endsWith('\n') ? text : `${text}\n`;
  const dir = path.join(dataDir, 'meetings');

  if (replace !== undefined) {
    if (!FILE_NAME.test(String(replace))) return { ok: false, errors: [`"${replace}" is not a minutes file name.`] };
    if (!fs.existsSync(path.join(dir, replace))) return { ok: false, errors: [`meetings/${replace} was not found.`] };
    const failed = writeAtomic(dir, replace, body);
    return failed ? { ok: false, errors: [failed] } : { ok: true, file: replace, replaced: true };
  }

  const slug = slugify(title);
  if (!slug) return { ok: false, errors: ['The title needs at least one letter or digit.'] };
  if (!isRealDate(date)) return { ok: false, errors: [`"${date ?? ''}" is not a valid date; use YYYY-MM-DD.`] };

  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `${slug}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(tmp, body, 'utf8');
    // linkSync fails when the name exists, so a file is never overwritten, even by a concurrent run.
    for (let n = 0; ; n++) {
      const file = `${slug}_${date}${n ? `_${n}` : ''}.md`;
      try {
        fs.linkSync(tmp, path.join(dir, file));
        return { ok: true, file, replaced: false };
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
      }
    }
  } catch (err) {
    return { ok: false, errors: [`Could not write meetings/: ${err.message}`] };
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2);
  let input;
  if (args.length === 1 && args[0] === '--template') {
    process.stdout.write(fs.readFileSync(new URL('./template.md', import.meta.url), 'utf8'));
    process.exit(0);
  }
  if (args.length === 2 && args[0] === '--replace') input = { replace: args[1] };
  else if (args.length === 2 && !args[0].startsWith('--')) input = { title: args[0], date: args[1] };
  else {
    console.error('Usage: node write-minutes.mjs "<title>" <YYYY-MM-DD>  |  node write-minutes.mjs --replace <file name>  (minutes on stdin)');
    process.exit(2);
  }
  const result = writeMinutes({ ...input, text: fs.readFileSync(0, 'utf8') });
  if (!result.ok) {
    console.error('Nothing was written:');
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(`${result.replaced ? 'Replaced' : 'Saved'} data/meetings/${result.file}`);
}
