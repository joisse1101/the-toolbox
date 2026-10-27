// UserPromptSubmit hook for the story sessions: holds the prompt until the story-tools server has finished connecting, so
// the first prompt never reaches Claude before read_context exists. The launcher sets PLANNER_MCP_READY_FILE; the server writes it
// once it has sent the client its tool list (see story-tools.mjs). Without the variable (a session not started by a launcher)
// the hook does nothing. On a timeout it tells Claude, so the user hears it instead of a silent "tool not found".
import fs from 'node:fs';

const readyFile = process.env.PLANNER_MCP_READY_FILE;
const GRACE_MS = 300;
const timeoutMs = Number(process.env.PLANNER_MCP_WAIT_MS) || 30000;

if (readyFile) {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(readyFile) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  if (fs.existsSync(readyFile)) {
    // The reply is sent, but Claude Code still has to register the tools from it.
    await new Promise((r) => setTimeout(r, GRACE_MS));
  } else {
    console.log(`The story-tools server did not finish connecting within ${timeoutMs / 1000} seconds. Tell the user, and do not guess at the backlog.`);
  }
}
