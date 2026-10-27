# Starts an interactive Claude session for the explore-stories skill, limited to the backlog-tools readers.
# Usage: .\ai\launchers\explore-stories.ps1 [backlog file name]   (without a name, this script lists the backlogs and asks)
# Tools are limited to the backlog-tools MCP server in --read-only mode (read_context, search_stories and read_file only), Skill and AskUserQuestion: no Bash, Read or Grep.
# The lexicon and proposals files are read with read_file, which opens only those two files of the backlog it is given.
# The session cannot write any file. --permission-mode default keeps the prompts on, whatever mode your settings use.
param([string]$Backlog = '')

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
Set-Location $root
. (Join-Path $PSScriptRoot 'backlog-tools-config.ps1')
$skill = '.claude/skills/explore-stories'
$dataDir = if ($env:PLANNER_DATA_DIR) { $env:PLANNER_DATA_DIR } elseif ($env:TLT_DATA_DIR) { Write-Host "TLT_DATA_DIR is now PLANNER_DATA_DIR; the old name still works for now." -ForegroundColor Yellow; $env:TLT_DATA_DIR } else { Join-Path $root 'planner/data' }

$file = Select-Backlog $dataDir $Backlog

$mcp = New-BacklogToolsConfig $root -ReadOnly

try {
  claude "/explore-stories $file" `
    --tools "Skill,AskUserQuestion" `
    --mcp-config $mcp `
    --strict-mcp-config `
    --allowedTools "mcp__backlog-tools__read_context" "mcp__backlog-tools__search_stories" "mcp__backlog-tools__read_file" `
    --permission-mode default `
    --settings "$skill/locked-settings.json"
} finally {
  Remove-Item -LiteralPath $mcp, $env:PLANNER_MCP_READY_FILE -Force -ErrorAction SilentlyContinue
}
