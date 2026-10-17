// UserPromptSubmit hook for the story sessions: holds the prompt until the story-tools server has finished connecting, so
// the first prompt never reaches Claude before read_context exists. The launcher sets TLT_MCP_READY_FILE; the server writes it
// when the client completes the handshake (see story-tools.mjs). Without the variable (a session not started by a launcher)
// the hook does nothing. On a timeout it tells Claude, so the user hears it instead of a silent "tool not found".
import fs from 'node:fs';

const readyFile = process.env.TLT_MCP_READY_FILE;
const timeoutMs = Number(process.env.TLT_MCP_WAIT_MS) || 30000;

if (readyFile) {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(readyFile) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  if (!fs.existsSync(readyFile)) {
    console.log(`The story-tools server did not finish connecting within ${timeoutMs / 1000} seconds. Tell the user, and do not guess at the backlog.`);
  }
}
