# Dot-sourced by the story launchers. Writes the --mcp-config file for the story-tools server into the temp folder
# (the repo path is machine specific, so the file is generated at launch, never committed) and returns its path.
# It also sets TLT_MCP_READY_FILE (a fresh path, inherited by the server and by the UserPromptSubmit hook that waits for it), so the
# first prompt is held until the server has connected. The launcher deletes both files when the session ends.
function New-StoryToolsConfig([string]$Root, [switch]$ReadOnly) {
  $script = (Join-Path $Root 'ai/mcp/story-tools.mjs').Replace('\', '/')
  $serverArgs = [string[]]@($script)
  if ($ReadOnly) { $serverArgs += '--read-only' }
  $config = @{ mcpServers = @{ 'story-tools' = @{ command = 'node'; args = $serverArgs } } }
  $env:TLT_MCP_READY_FILE = Join-Path ([IO.Path]::GetTempPath()) ("story-tools-{0}.ready" -f $PID)
  Remove-Item -LiteralPath $env:TLT_MCP_READY_FILE -Force -ErrorAction SilentlyContinue
  $path = Join-Path ([IO.Path]::GetTempPath()) ("story-tools-{0}.mcp.json" -f $PID)
  [IO.File]::WriteAllText($path, ($config | ConvertTo-Json -Depth 5 -Compress), (New-Object Text.UTF8Encoding($false)))
  return $path
}
