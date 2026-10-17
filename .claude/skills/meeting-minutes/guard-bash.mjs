// PreToolUse hook for the locked meeting-minutes session (see locked-settings.json).
// Denies every Bash command that is not exactly one run of write-minutes.mjs in one of its forms, because dontAsk
// still auto-allows read-only commands like cat, ls and grep. Hook input is JSON on stdin; a deny is reported as JSON on stdout.
//   node .claude/skills/meeting-minutes/write-minutes.mjs --template   (prints the template; the session has no file reader)
//   node .claude/skills/meeting-minutes/write-minutes.mjs "<title>" <YYYY-MM-DD> <<'MINUTES' ... MINUTES
//   node .claude/skills/meeting-minutes/write-minutes.mjs --replace <file name> <<'MINUTES' ... MINUTES

import fs from 'node:fs';

const SCRIPT = 'node .claude/skills/meeting-minutes/write-minutes.mjs';
// Inside double quotes the shell still expands $ and backticks, so the title may not contain them (or quotes, backslashes).
const NEW_FILE = new RegExp(`^${SCRIPT} "[\\p{L}\\p{N} .,&'()-]+" \\d{4}-\\d{2}-\\d{2} <<'MINUTES'$`, 'u');
const REPLACE = new RegExp(`^${SCRIPT} --replace [a-z0-9][a-z0-9._-]*\\.md <<'MINUTES'$`);

const USAGE = `${SCRIPT} "<title>" <YYYY-MM-DD> <<'MINUTES' ... MINUTES | ${SCRIPT} --replace <file name> <<'MINUTES' ... MINUTES | ${SCRIPT} --template`;
const deny = (why) => `${why} Allowed commands: ${USAGE}`;

// Returns an error string, or null when the command is allowed.
export function check(command) {
  if (typeof command !== 'string') return deny('No command given.');
  const [first, ...rest] = command.replace(/\r\n/g, '\n').trimEnd().split('\n');
  if (!rest.length && first === `${SCRIPT} --template`) return null;
  if (!NEW_FILE.test(first) && !REPLACE.test(first)) return deny('Only write-minutes.mjs may be run, in one of its two forms, with the minutes as a MINUTES heredoc.');
  // The heredoc ends at the first line that is exactly MINUTES; nothing may follow it.
  if (!rest.length || rest.indexOf('MINUTES') !== rest.length - 1) return deny('Nothing may follow the closing MINUTES line.');
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
