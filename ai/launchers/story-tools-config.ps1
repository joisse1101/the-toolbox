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

# The backlog file name for a launcher: the one given (with or without .csv, or its number in the list) or, when none is given, the
# one the user picks from a numbered list of data/user-stories/. Stops the launcher on an unknown backlog.
function Select-Backlog([string]$DataDir, [string]$Backlog) {
  $backlogs = @(Get-ChildItem -LiteralPath (Join-Path $DataDir 'user-stories') -Filter '*.csv' -File -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object { $_.Name })
  if (-not $backlogs.Count) { Write-Host 'There are no backlogs in data/user-stories/.' -ForegroundColor Red; exit 1 }
  if (-not $Backlog.Trim()) {
    for ($i = 0; $i -lt $backlogs.Count; $i++) { Write-Host ("  {0}. {1}" -f ($i + 1), $backlogs[$i]) }
    $Backlog = Read-Host 'Which backlog? (number or name)'
  }
  $Backlog = $Backlog.Trim()
  if ($Backlog -match '^\d+$' -and [int]$Backlog -ge 1 -and [int]$Backlog -le $backlogs.Count) { $Backlog = $backlogs[[int]$Backlog - 1] }
  if (-not $Backlog.EndsWith('.csv', [StringComparison]::OrdinalIgnoreCase)) { $Backlog = "$Backlog.csv" }
  $file = $backlogs | Where-Object { $_ -ieq $Backlog } | Select-Object -First 1
  if (-not $file) { Write-Host "No backlog '$Backlog' in data/user-stories/. Found: $($backlogs -join ', ')" -ForegroundColor Red; exit 1 }
  return $file
}
