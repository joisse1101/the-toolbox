# Starts an interactive Claude session for the explore-stories skill, limited to the story-tools reader.
# Usage: .\ai\launchers\explore-stories.ps1 [backlog file name]   (without a name, this script lists the backlogs and asks)
# Tools are limited to the story-tools MCP server in --read-only mode (read_context and search_stories only), Skill, AskUserQuestion, Read and Grep: no Bash.
# Read and Grep may open only the backlog's lexicon and proposals files (the hook ai/mcp/guard-read.mjs refuses everything else); the script
# prints those two paths and waits for Enter before it starts Claude.
# The session cannot write any file. --permission-mode default keeps the prompts on, whatever mode your settings use.
param([string]$Backlog = '')

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $root
. (Join-Path $PSScriptRoot 'story-tools-config.ps1')
$skill = '.claude/skills/explore-stories'
$dataDir = if ($env:TLT_DATA_DIR) { $env:TLT_DATA_DIR } else { Join-Path $root 'data' }

$file = Select-Backlog $dataDir $Backlog
$readFiles = Get-ReadFiles $dataDir $file
if (-not (Confirm-ReadLimit $readFiles 'Skill, AskUserQuestion, Read, Grep, story-tools (read_context, search_stories; read-only)')) {
  Write-Host 'Cancelled; nothing was started.' -ForegroundColor Red
  exit 1
}
if (-not (Test-ReadGuard $readFiles)) {
  Write-Host 'The read guard (ai/mcp/guard-read.mjs) did not behave as expected; nothing was started.' -ForegroundColor Red
  exit 1
}
$readNote = "The backlog's lexicon file is $($readFiles.Lexicon) and its proposals file is $($readFiles.Proposals). Read them only with Read and Grep (Grep for a term, Read with offset and limit for a part); no other file can be read."

$mcp = New-StoryToolsConfig $root -ReadOnly

try {
  claude "/explore-stories $file" `
    --tools "Skill,AskUserQuestion,Read,Grep" `
    --mcp-config $mcp `
    --strict-mcp-config `
    --allowedTools "mcp__story-tools__read_context" "mcp__story-tools__search_stories" "Read" "Grep" `
    --append-system-prompt $readNote `
    --permission-mode default `
    --settings "$skill/locked-settings.json"
} finally {
  Remove-Item -LiteralPath $mcp, $env:TLT_MCP_READY_FILE -Force -ErrorAction SilentlyContinue
  Remove-Item Env:\TLT_READ_ALLOW -ErrorAction SilentlyContinue
}
