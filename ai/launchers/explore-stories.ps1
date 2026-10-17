# Starts an interactive Claude session for the explore-stories skill, limited to the story-tools reader.
# Usage: .\ai\launchers\explore-stories.ps1 [backlog file name]   (without a name, Claude lists the backlogs and asks)
# Tools are limited to the story-tools MCP server in --read-only mode (read_context only), Skill and AskUserQuestion: no Bash.
# The session cannot write any file. --permission-mode default keeps the prompts on, whatever mode your settings use.
param([string]$Backlog = '')

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $root
. (Join-Path $PSScriptRoot 'story-tools-config.ps1')
$skill = '.claude/skills/explore-stories'
$mcp = New-StoryToolsConfig $root -ReadOnly

try {
  claude "/explore-stories $Backlog" `
    --tools "Skill,AskUserQuestion" `
    --mcp-config $mcp `
    --strict-mcp-config `
    --allowedTools "mcp__story-tools__read_context" `
    --permission-mode default `
    --settings "$skill/locked-settings.json"
} finally {
  Remove-Item -LiteralPath $mcp -Force -ErrorAction SilentlyContinue
}
