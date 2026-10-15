# Starts an interactive Claude session that explores new stories and then proposes them, in one conversation.
# Usage: .\ai\launchers\shape-stories.ps1 [backlog] [story]
#   backlog  a backlog in data/user-stories/, with or without .csv (data-portal or data-portal.csv)
#   story    ONE argument: a proposed story of that backlog (NEW-57) or free text ("a new keyboard"; quote it when it has spaces)
# Whatever is missing, this script asks for (a numbered list of the backlogs, then the story), so Claude does not have to.
# It refuses an unknown backlog, an empty story, and a NEW-<n> that is not in data/proposals/<backlog>.csv before Claude starts.
# Starts in /explore-stories (discussion only) with both already filled in; when you are happy with the drafts, run
# /propose-stories in the same session.
# Tools are limited to Bash (guarded: only the two scripts, see propose-stories/locked-settings.json), Skill and AskUserQuestion.
# The reader is pre-approved. The writer is not: Claude Code asks you before every write, on top of the skill's yes/no question.
param(
  [string]$Backlog = '',
  [string]$Story = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $root
$explore = '.claude/skills/explore-stories'
$propose = '.claude/skills/propose-stories'
$dataDir = if ($env:TLT_DATA_DIR) { $env:TLT_DATA_DIR } else { Join-Path $root 'data' }

function Stop-Launcher([string]$Message) {
  Write-Host $Message -ForegroundColor Red
  exit 1
}

$backlogs = @(Get-ChildItem -LiteralPath (Join-Path $dataDir 'user-stories') -Filter '*.csv' -File -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object { $_.Name })
if (-not $backlogs.Count) { Stop-Launcher 'There are no backlogs in data/user-stories/.' }

if (-not $Backlog.Trim()) {
  for ($i = 0; $i -lt $backlogs.Count; $i++) { Write-Host ("  {0}. {1}" -f ($i + 1), $backlogs[$i]) }
  $Backlog = Read-Host 'Which backlog? (number or name)'
}
$Backlog = $Backlog.Trim()
if ($Backlog -match '^\d+$' -and [int]$Backlog -ge 1 -and [int]$Backlog -le $backlogs.Count) { $Backlog = $backlogs[[int]$Backlog - 1] }
if (-not $Backlog.EndsWith('.csv', [StringComparison]::OrdinalIgnoreCase)) { $Backlog = "$Backlog.csv" }
$file = $backlogs | Where-Object { $_ -ieq $Backlog } | Select-Object -First 1
if (-not $file) { Stop-Launcher "No backlog '$Backlog' in data/user-stories/. Found: $($backlogs -join ', ')" }

if (-not $Story.Trim()) { $Story = Read-Host 'What story? (a proposed ID like NEW-57, or describe it)' }
$Story = $Story.Trim()
if (-not $Story) { Stop-Launcher 'No story given.' }

if ($Story -match '^NEW-\d+$') {
  $Story = $Story.ToUpper()
  $proposals = Join-Path (Join-Path $dataDir 'proposals') $file
  $known = @()
  if (Test-Path -LiteralPath $proposals) { $known = @(Import-Csv -LiteralPath $proposals -Encoding UTF8 | Where-Object { $_.ID -eq $Story }) }
  if (-not $known.Count) { Stop-Launcher "$Story is not in data/proposals/$file." }
}

# Windows PowerShell 5.1 does not escape quotes inside an argument for a native command.
$prompt = "/explore-stories $file $Story"
if ($PSVersionTable.PSVersion.Major -lt 7) { $prompt = $prompt.Replace('"', '\"') }

claude $prompt `
  --tools "Bash,Skill,AskUserQuestion" `
  --allowedTools "Bash(node $explore/read-story-context.mjs:*)" `
  --strict-mcp-config `
  --settings "$propose/locked-settings.json"
