// PreToolUse hook for the story sessions (see the skills' locked-settings.json), matcher Read|Grep.
// Allows a Read or Grep only on the files the launcher listed in TLT_READ_ALLOW (the backlog's lexicon and proposals files,
// absolute paths separated by the platform's path delimiter) and denies everything else. The list comes from the launcher's
// environment, never from the tool input, so the agent cannot widen it. It fails closed: no list, no path or unreadable input
// all deny. Hook input is JSON on stdin; a deny is reported as JSON on stdout.
import fs from 'node:fs';
import path from 'node:path';

// Resolves to a comparable form: absolute, `..` folded away, case-insensitive on Windows.
const normal = (p) => {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

export function allowedFiles(list = process.env.TLT_READ_ALLOW) {
  return String(list || '').split(path.delimiter).filter(Boolean);
}

// Returns an error string, or null when the call is allowed. `toolInput` is the hook's tool_input.
export function check(toolName, toolInput, allowed = allowedFiles()) {
  const named = allowed.length ? `Allowed files: ${allowed.join(', ')}` : 'No files are allowed in this session.';
  const target = toolName === 'Read' ? toolInput?.file_path : toolName === 'Grep' ? toolInput?.path : undefined;
  if (toolName !== 'Read' && toolName !== 'Grep') return `Only Read and Grep are guarded here. ${named}`;
  if (typeof target !== 'string' || !target.trim()) return `${toolName} needs the path of one allowed file. ${named}`;
  if (!allowed.some((a) => normal(a) === normal(target))) return `${target} is not readable in this session. ${named}`;
  return null;
}

const isMain = process.argv[1] && process.argv[1].endsWith('guard-read.mjs');
if (isMain) {
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    // fall through: no tool name means deny
  }
  const error = check(input?.tool_name, input?.tool_input);
  if (error) {
    console.log(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: error },
    }));
  }
}
