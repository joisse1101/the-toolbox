# Starts an interactive Claude session for the propose-stories skill, limited to its reader and writer scripts.
# Usage: .\propose-stories.ps1 [backlog file name]   (without a name, Claude lists the backlogs and asks)
# Tools are limited to Bash (guarded: only the two scripts, see locked-settings.json), Skill and AskUserQuestion.
# The reader is pre-approved. The writer is not: Claude Code asks you before every write, on top of the skill's yes/no question.
param([string]$Backlog = '')

Set-Location $PSScriptRoot
$explore = '.claude/skills/explore-stories'
$skill = '.claude/skills/propose-stories'

claude "/propose-stories $Backlog" `
  --tools "Bash,Skill,AskUserQuestion" `
  --allowedTools "Bash(node $explore/read-story-context.mjs:*)" `
  --strict-mcp-config `
  --settings "$skill/locked-settings.json"
