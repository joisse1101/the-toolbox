# Starts an interactive Claude session for the review-backlog skill, limited to the skill's two scripts.
# Usage: .\ai\launchers\review-backlog.ps1 [backlog file name]   (without a name, Claude lists the backlogs and asks)
# Tools are limited to Bash (guarded: only the two scripts, see locked-settings.json), Skill and AskUserQuestion.
# The two scripts are pre-approved; anything else asks you first (or is blocked by the guard).
param([string]$Backlog = '')

Set-Location (Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent) # repo root
$skill = '.claude/skills/review-backlog'

claude "/review-backlog $Backlog" `
  --tools "Bash,Skill,AskUserQuestion" `
  --allowedTools "Bash(node $skill/read-backlog.mjs:*)" "Bash(node $skill/write-review.mjs:*)" `
  --strict-mcp-config `
  --settings "$skill/locked-settings.json"
