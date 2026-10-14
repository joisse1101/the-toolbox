// PreToolUse hook for the locked review session (see locked-settings.json). Denies every Bash command that is not
// exactly one run of read-backlog.mjs or write-review.mjs (optionally with --append), because dontAsk still auto-allows read-only commands
// like cat, ls and grep. Hook input is JSON on stdin; a deny is reported as JSON on stdout.

import fs from 'node:fs';

const SCRIPT = /^node \.claude\/skills\/review-backlog\/(read-backlog|write-review)\.mjs(?: ([^\s;&|<>`$()\\'"*?{}!#~]+))?/;

const ALLOWED = [
  'node .claude/skills/review-backlog/read-backlog.mjs [file]',
  "node .claude/skills/review-backlog/write-review.mjs <file> <<'JSON' ... JSON",
  "node .claude/skills/review-backlog/write-review.mjs <file> --append <<'JSON' ... JSON",
];
const deny = (why) => `${why} Allowed commands: ${ALLOWED.join(' | ')}`;

// Returns an error string, or null when the command is allowed.
export function check(command) {
  if (typeof command !== 'string') return deny('No command given.');
  const [first, ...rest] = command.replace(/\r\n/g, '\n').trimEnd().split('\n');
  const m = SCRIPT.exec(first);
  if (!m) return deny('Only read-backlog.mjs and write-review.mjs may be run.');
  const tail = first.slice(m[0].length);
  if (m[1] === 'write-review') {
    const file = m[2];
    if (!file || file.startsWith('-')) return deny('write-review.mjs needs the backlog file name as its first argument.');
    if (tail !== " <<'JSON'" && tail !== " --append <<'JSON'") return deny('write-review.mjs takes only the file name, optionally --append, then the heredoc.');
    // The heredoc ends at the first line that is exactly JSON; nothing may follow it.
    if (rest.indexOf('JSON') !== rest.length - 1) return deny('Nothing may follow the closing JSON line.');
    return null;
  }
  if (m[2]?.startsWith('-') || tail !== '' || rest.length) return deny('read-backlog.mjs takes at most one file name and no other shell syntax.');
  return null;
}

const isMain = process.argv[1] && process.argv[1].endsWith('guard-bash.mjs');
if (isMain) {
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    // fall through: no command means deny
  }
  const error = check(input?.tool_input?.command);
  if (error) {
    console.log(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: error },
    }));
  }
}
