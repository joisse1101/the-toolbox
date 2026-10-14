# Starts an interactive Claude session for the explore-stories skill, limited to its reader script.
# Usage: .\ai\launchers\explore-stories.ps1 [backlog file name]   (without a name, Claude lists the backlogs and asks)
# Tools are limited to Bash (guarded: only the reader, see locked-settings.json), Skill and AskUserQuestion.
# The session cannot write any file.
param([string]$Backlog = '')

Set-Location (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) # repo root
$skill = '.claude/skills/explore-stories'

claude "/explore-stories $Backlog" `
  --tools "Bash,Skill,AskUserQuestion" `
  --allowedTools "Bash(node $skill/read-story-context.mjs:*)" `
  --strict-mcp-config `
  --settings "$skill/locked-settings.json"
