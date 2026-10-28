// UserPromptSubmit hook for the launcher sessions: holds the prompt until the MCP servers have finished connecting, so
// the first prompt never reaches Claude before read_context exists. The launcher sets PLANNER_MCP_READY_FILE (one server) or
// PLANNER_MCP_READY_FILES (several, separated by the platform's path delimiter; the plan-stories session has two servers); each
// server writes its file once it has sent the client its tool list (see backlog-tools.mjs). The hook waits for every file listed.
// Without either variable (a session not started by a launcher) the hook does nothing. On a timeout it tells Claude, so the user
// hears it instead of a silent "tool not found".
import fs from 'node:fs';
import path from 'node:path';

const readyFiles = [process.env.PLANNER_MCP_READY_FILE, ...(process.env.PLANNER_MCP_READY_FILES ?? '').split(path.delimiter)].filter(Boolean);
const GRACE_MS = 300;
const timeoutMs = Number(process.env.PLANNER_MCP_WAIT_MS) || 30000;
const allReady = () => readyFiles.every((f) => fs.existsSync(f));

if (readyFiles.length) {
  const deadline = Date.now() + timeoutMs;
  while (!allReady() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  if (allReady()) {
    // The reply is sent, but Claude Code still has to register the tools from it.
    await new Promise((r) => setTimeout(r, GRACE_MS));
  } else {
    const missing = readyFiles.filter((f) => !fs.existsSync(f)).length;
    console.log(`${readyFiles.length === 1 ? 'The MCP server' : `${missing} of the ${readyFiles.length} MCP servers`} did not finish connecting within ${timeoutMs / 1000} seconds. Tell the user, and do not guess at the backlog or the diagrams.`);
  }
}
