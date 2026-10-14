// PreToolUse hook for the locked explore-stories and propose-stories sessions (see their locked-settings.json).
// Denies every Bash command that is not exactly one run of read-story-context.mjs or, with --read-write, one run of
// write-proposal.mjs, because dontAsk still auto-allows read-only commands like cat, ls and grep. Hook input is JSON
// on stdin; a deny is reported as JSON on stdout. Mode: --read-only (explore) or --read-write (propose).

import fs from 'node:fs';

const NAME = "[^\\s;&|<>`$()\\\\'\"*?{}!#~]+";
const SCRIPT = new RegExp(`^node \\.claude/skills/(?:explore-stories/(read-story-context)|propose-stories/(write-proposal))\\.mjs(?: (${NAME}))?`);

const READER = 'node .claude/skills/explore-stories/read-story-context.mjs [file]';
const WRITER = "node .claude/skills/propose-stories/write-proposal.mjs <file> <<'JSON' ... JSON";
const deny = (why, allowWrite) => `${why} Allowed commands: ${(allowWrite ? [READER, WRITER] : [READER]).join(' | ')}`;

// Returns an error string, or null when the command is allowed.
export function check(command, { allowWrite = false } = {}) {
  if (typeof command !== 'string') return deny('No command given.', allowWrite);
  const [first, ...rest] = command.replace(/\r\n/g, '\n').trimEnd().split('\n');
  const m = SCRIPT.exec(first);
  if (!m) return deny(allowWrite ? 'Only read-story-context.mjs and write-proposal.mjs may be run.' : 'Only read-story-context.mjs may be run.', allowWrite);
  const tail = first.slice(m[0].length);
  const file = m[3];
  if (m[2]) {
    if (!allowWrite) return deny('This session may only read: write-proposal.mjs is not allowed here.', allowWrite);
    if (!file || file.startsWith('-')) return deny('write-proposal.mjs needs the backlog file name as its first argument.', allowWrite);
    if (tail !== " <<'JSON'") return deny('write-proposal.mjs takes only the file name, then the heredoc.', allowWrite);
    // The heredoc ends at the first line that is exactly JSON; nothing may follow it.
    if (!rest.length || rest.indexOf('JSON') !== rest.length - 1) return deny('Nothing may follow the closing JSON line.', allowWrite);
    return null;
  }
  if (file?.startsWith('-') || tail !== '' || rest.length) return deny('read-story-context.mjs takes at most one file name and no other shell syntax.', allowWrite);
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
