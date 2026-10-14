// PreToolUse hook for the locked review session (see locked-settings.json). Denies every Bash command that is not
// exactly one run of read-backlog.mjs or write-review.mjs, because dontAsk still auto-allows read-only commands
// like cat, ls and grep. Hook input is JSON on stdin; a deny is reported as JSON on stdout.

import fs from 'node:fs';

const SCRIPT = /^node \.claude\/skills\/review-backlog\/(read-backlog|write-review)\.mjs(?: ([^\s;&|<>`$()\\'"*?{}!#~]+))?/;

// Returns an error string, or null when the command is allowed.
export function check(command) {
  if (typeof command !== 'string') return 'No command given.';
  const [first, ...rest] = command.replace(/\r\n/g, '\n').trimEnd().split('\n');
  const m = SCRIPT.exec(first);
  if (!m) return 'Only read-backlog.mjs and write-review.mjs may be run.';
  const tail = first.slice(m[0].length);
  if (m[1] === 'write-review') {
    if (!m[2] || tail !== " <<'JSON'") return "Use: node .claude/skills/review-backlog/write-review.mjs <file> <<'JSON' ... JSON";
    // The heredoc ends at the first line that is exactly JSON; nothing may follow it.
    if (rest.indexOf('JSON') !== rest.length - 1) return 'Nothing may follow the closing JSON line.';
    return null;
  }
  if (tail !== '' || rest.length) return 'read-backlog.mjs takes at most one file name and no other shell syntax.';
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
