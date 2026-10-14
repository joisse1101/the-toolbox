# Starts an interactive Claude session that explores new stories and then proposes them, in one conversation.
# Usage: .\ai\launchers\shape-stories.ps1 [backlog file name]   (without a name, Claude lists the backlogs and asks)
# Starts in /explore-stories (discussion only); when you are happy with the drafts, run /propose-stories in the same session.
# Tools are limited to Bash (guarded: only the two scripts, see propose-stories/locked-settings.json), Skill and AskUserQuestion.
# The reader is pre-approved. The writer is not: Claude Code asks you before every write, on top of the skill's yes/no question.
param([string]$Backlog = '')

Set-Location (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) # repo root
$explore = '.claude/skills/explore-stories'
$propose = '.claude/skills/propose-stories'

claude "/explore-stories $Backlog" `
  --tools "Bash,Skill,AskUserQuestion" `
  --allowedTools "Bash(node $explore/read-story-context.mjs:*)" `
  --strict-mcp-config `
  --settings "$propose/locked-settings.json"
