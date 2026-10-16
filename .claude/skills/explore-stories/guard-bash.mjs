// PreToolUse hook for the locked explore-stories and propose-stories sessions (see their locked-settings.json).
// Denies every Bash command that is not exactly one run of read-story-context.mjs (a file name and a story ID at most) or, with --read-write, one run of
// write-proposal.mjs, one run of write-lexicon.mjs or one run of write-review.mjs with --append, because dontAsk still auto-allows read-only commands
// like cat, ls and grep. Hook input is JSON on stdin; a deny is reported as JSON on stdout. Mode: --read-only
// (explore) or --read-write (propose). The review writer is allowed only with --append: without it the run would
// replace the whole review, including the audit's suggestions.

import fs from 'node:fs';

const NAME = "[^\\s;&|<>`$()\\\\'\"*?{}!#~]+";
const ID = '[A-Za-z0-9][A-Za-z0-9-]*';
const SCRIPT =new RegExp(`^node \\.claude/skills/(?:explore-stories/(read-story-context)|propose-stories/(write-proposal)|propose-stories/(write-lexicon)|review-backlog/(write-review))\\.mjs(?: (${NAME})(?: (${ID}))?)?`);

const READER = 'node .claude/skills/explore-stories/read-story-context.mjs [file [ID]]';
const WRITER = "node .claude/skills/propose-stories/write-proposal.mjs <file> <<'JSON' ... JSON";
const LEXICON_WRITER = "node .claude/skills/propose-stories/write-lexicon.mjs <file> <<'JSON' ... JSON";
const REVIEW_WRITER = "node .claude/skills/review-backlog/write-review.mjs <file> --append <<'JSON' ... JSON";
const deny = (why, allowWrite) => `${why} Allowed commands: ${(allowWrite ? [READER, WRITER, LEXICON_WRITER, REVIEW_WRITER] : [READER]).join(' | ')}`;

// Returns an error string, or null when the command is allowed.
export function check(command, { allowWrite = false } = {}) {
  if (typeof command !== 'string') return deny('No command given.', allowWrite);
  const [first, ...rest] = command.replace(/\r\n/g, '\n').trimEnd().split('\n');
  const m = SCRIPT.exec(first);
  if (!m) return deny(allowWrite ? 'Only read-story-context.mjs, write-proposal.mjs, write-lexicon.mjs and write-review.mjs may be run.' : 'Only read-story-context.mjs may be run.', allowWrite);
  const tail = first.slice(m[0].length);
  const file = m[5];
  const writer = m[2] ? 'write-proposal.mjs' : m[3] ? 'write-lexicon.mjs' : m[4] ? 'write-review.mjs' : null;
  if (writer) {
    if (!allowWrite) return deny(`This session may only read: ${writer} is not allowed here.`, allowWrite);
    if (!file || file.startsWith('-')) return deny(`${writer} needs the backlog file name as its first argument.`, allowWrite);
    if (m[6]) return deny(`${writer} takes only the file name${m[4] ? ', --append' : ''} and then the heredoc.`, allowWrite);
    const heredoc = m[4] ? " --append <<'JSON'" : " <<'JSON'";
    if (tail !== heredoc) return deny(m[4] ? 'write-review.mjs takes only the file name, --append, then the heredoc.' : `${writer} takes only the file name, then the heredoc.`, allowWrite);
    // The heredoc ends at the first line that is exactly JSON; nothing may follow it.
    if (!rest.length || rest.indexOf('JSON') !== rest.length - 1) return deny('Nothing may follow the closing JSON line.', allowWrite);
    return null;
  }
  if (file?.startsWith('-') || tail !== '' || rest.length) return deny('read-story-context.mjs takes at most one file name and one story ID, and no other shell syntax.', allowWrite);
  return null;
}

const isMain = process.argv[1] && process.argv[1].endsWith('guard-bash.mjs');
if (isMain) {
  const allowWrite = process.argv.includes('--read-write');
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    // fall through: no command means deny
  }
  const error = check(input?.tool_input?.command, { allowWrite });
  if (error) {
    console.log(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: error },
    }));
  }
}
