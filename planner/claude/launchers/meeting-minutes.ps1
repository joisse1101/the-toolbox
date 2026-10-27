# Starts an interactive Claude session for the meeting-minutes skill, limited to its writer script.
# Usage: .\ai\launchers\meeting-minutes.ps1 ["notes"]
#   notes  the meeting notes as ONE argument (quote it). Without it, this script asks: paste the notes, then type END on a line of its own.
# Tools are limited to Bash (guarded: only write-minutes.mjs, see locked-settings.json), Skill and AskUserQuestion.
# The session cannot read or edit any file; it can only save minutes to data/meetings/ through the writer.
# The writer is not pre-approved by this script: Claude Code asks you before every save, on top of the skill's own confirmation.
param([string]$Notes = '')

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location (Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent) # repo root
$skill = '.claude/skills/meeting-minutes'

if (-not $Notes.Trim()) {
  Write-Host 'Paste the meeting notes, then type END on a line of its own:'
  $lines = @()
  while ($true) {
    $line = Read-Host
    if ($line.Trim() -ceq 'END') { break }
    $lines += $line
  }
  $Notes = $lines -join "`n"
}
$Notes = $Notes.Trim()
if (-not $Notes) {
  Write-Host 'No notes given.' -ForegroundColor Red
  exit 1
}

# Windows PowerShell 5.1 does not escape quotes inside an argument for a native command.
$prompt = "/meeting-minutes`n`n$Notes"
if ($PSVersionTable.PSVersion.Major -lt 7) { $prompt = $prompt.Replace('"', '\"') }

claude $prompt `
  --tools "Bash,Skill,AskUserQuestion" `
  --strict-mcp-config `
  --settings "$skill/locked-settings.json"
