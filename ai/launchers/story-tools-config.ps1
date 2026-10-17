# Dot-sourced by the story launchers. Writes the --mcp-config file for the story-tools server into the temp folder
# (the repo path is machine specific, so the file is generated at launch, never committed) and returns its path.
function New-StoryToolsConfig([string]$Root, [switch]$ReadOnly) {
  $script = (Join-Path $Root 'ai/mcp/story-tools.mjs').Replace('\', '/')
  $serverArgs = [string[]]@($script)
  if ($ReadOnly) { $serverArgs += '--read-only' }
  $config = @{ mcpServers = @{ 'story-tools' = @{ command = 'node'; args = $serverArgs } } }
  $path = Join-Path ([IO.Path]::GetTempPath()) ("story-tools-{0}.mcp.json" -f $PID)
  [IO.File]::WriteAllText($path, ($config | ConvertTo-Json -Depth 5 -Compress), (New-Object Text.UTF8Encoding($false)))
  return $path
}
