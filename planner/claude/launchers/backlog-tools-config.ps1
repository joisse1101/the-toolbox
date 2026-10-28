# Dot-sourced by the story launchers. Writes the --mcp-config file for the backlog-tools server into the temp folder
# (the repo path is machine specific, so the file is generated at launch, never committed) and returns its path.
# It also sets PLANNER_MCP_READY_FILE (a fresh path, inherited by the server and by the UserPromptSubmit hook that waits for it), so the
# first prompt is held until the server has connected. The launcher deletes both files when the session ends.
function New-BacklogToolsConfig([string]$Root, [switch]$ReadOnly) {
  $script = (Join-Path $Root 'planner/claude/mcp/backlog-tools.mjs').Replace('\', '/')
  $serverArgs = [string[]]@($script)
  if ($ReadOnly) { $serverArgs += '--read-only' }
  $config = @{ mcpServers = @{ 'backlog-tools' = @{ command = 'node'; args = $serverArgs } } }
  $env:PLANNER_MCP_READY_FILE = Join-Path ([IO.Path]::GetTempPath()) ("backlog-tools-{0}.ready" -f $PID)
  Remove-Item -LiteralPath $env:PLANNER_MCP_READY_FILE -Force -ErrorAction SilentlyContinue
  $path = Join-Path ([IO.Path]::GetTempPath()) ("backlog-tools-{0}.mcp.json" -f $PID)
  [IO.File]::WriteAllText($path, ($config | ConvertTo-Json -Depth 5 -Compress), (New-Object Text.UTF8Encoding($false)))
  return $path
}

# The backlog file name for a launcher: the one given (with or without .csv, or its number in the list) or, when none is given, the
# one the user picks from a numbered list of planner/data/backlogs/. Stops the launcher on an unknown backlog.
function Select-Backlog([string]$DataDir, [string]$Backlog) {
  $backlogs = @(Get-ChildItem -LiteralPath (Join-Path $DataDir 'backlogs') -Filter '*.csv' -File -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object { $_.Name })
  if (-not $backlogs.Count) {
    Write-Host 'There are no backlogs in planner/data/backlogs/.' -ForegroundColor Red
    $paths = Join-Path (Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent) 'planner/logic/storage/paths.cjs'
    $hint = & node -e "const h = require(process.argv[1]).legacyDataHint(); if (h) console.log(h)" $paths
    if ($hint) { Write-Host $hint -ForegroundColor Yellow }
    exit 1
  }
  if (-not $Backlog.Trim()) {
    for ($i = 0; $i -lt $backlogs.Count; $i++) { Write-Host ("  {0}. {1}" -f ($i + 1), $backlogs[$i]) }
    $Backlog = Read-Host 'Which backlog? (number or name)'
  }
  $Backlog = $Backlog.Trim()
  if ($Backlog -match '^\d+$' -and [int]$Backlog -ge 1 -and [int]$Backlog -le $backlogs.Count) { $Backlog = $backlogs[[int]$Backlog - 1] }
  if (-not $Backlog.EndsWith('.csv', [StringComparison]::OrdinalIgnoreCase)) { $Backlog = "$Backlog.csv" }
  $file = $backlogs | Where-Object { $_ -ieq $Backlog } | Select-Object -First 1
  if (-not $file) { Write-Host "No backlog '$Backlog' in planner/data/backlogs/. Found: $($backlogs -join ', ')" -ForegroundColor Red; exit 1 }
  return $file
}

# The --mcp-config file for the plan-stories session: backlog-tools --read-only and diagram-tools for one backlog (--backlog lets the
# latter use that backlog's repo.json). Each server gets its own ready file through its env block; PLANNER_MCP_READY_FILES lists them for
# the hook, which waits for all. Returns the config path and the ready files, for the launcher to delete when the session ends.
function New-PlanStoriesConfig([string]$Root, [string]$Backlog) {
  $tools = (Join-Path $Root 'planner/claude/mcp/backlog-tools.mjs').Replace('\', '/')
  $diagrams = (Join-Path $Root 'planner/claude/mcp/diagram-tools.mjs').Replace('\', '/')
  $temp = [IO.Path]::GetTempPath()
  $ready = @{
    'backlog-tools' = Join-Path $temp ("backlog-tools-{0}.ready" -f $PID)
    'diagram-tools' = Join-Path $temp ("diagram-tools-{0}.ready" -f $PID)
  }
  foreach ($file in $ready.Values) { Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue }
  $config = @{ mcpServers = [ordered]@{
    'backlog-tools' = @{ command = 'node'; args = [string[]]@($tools, '--read-only'); env = @{ PLANNER_MCP_READY_FILE = $ready['backlog-tools'] } }
    'diagram-tools' = @{ command = 'node'; args = [string[]]@($diagrams, '--backlog', $Backlog); env = @{ PLANNER_MCP_READY_FILE = $ready['diagram-tools'] } }
  } }
  Remove-Item Env:PLANNER_MCP_READY_FILE -ErrorAction SilentlyContinue
  $env:PLANNER_MCP_READY_FILES = $ready.Values -join [IO.Path]::PathSeparator
  $path = Join-Path $temp ("plan-stories-{0}.mcp.json" -f $PID)
  [IO.File]::WriteAllText($path, ($config | ConvertTo-Json -Depth 5 -Compress), (New-Object Text.UTF8Encoding($false)))
  return [pscustomobject]@{ Path = $path; ReadyFiles = @($ready.Values) }
}
