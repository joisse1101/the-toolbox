# Starts an interactive Claude session that explores new stories and then proposes them, in one conversation.
# Usage: .\ai\launchers\shape-stories.ps1 [backlog] [story]
#   backlog  a backlog in planner/data/backlogs/, with or without .csv (data-portal or data-portal.csv)
#   story    ONE argument: a proposed story of that backlog (NEW-57), a story already in the backlog (IAM-0004) or free text
#            ("a new keyboard"; quote it when it has spaces)
# Whatever is missing, this script asks for (a numbered list of the backlogs, then the story), so Claude does not have to.
# It refuses an unknown backlog, an empty story, a NEW-<n> that is not in planner/data/proposals/<backlog>.csv and a backlog ID
# (letters, a dash, digits) that is not in planner/data/backlogs/<backlog>.csv before Claude starts.
# A NEW-<n> or backlog ID goes into the opening prompt with the story's Title (NEW-57 titled "Reset password"); free text as typed.
# Starts in /explore-stories (discussion only) with both already filled in; when you are happy with the drafts, run
# /propose-stories in the same session (it asks yes/no first), or /story:propose to write the drafts straight away. Both write
# new stories to the proposals and changes to backlog stories as suggestions in the story editor.
# /story:re-read re-reads the files after you changed them yourself; /story:review audits what is under discussion and lists what is left.
# Tools are limited to the backlog-tools MCP server (read_context, search_stories, read_file, check_drafts, write_proposals, write_lexicon, suggest_lexicon_change, write_review), Skill
# and AskUserQuestion: no Bash, Read or Grep. The lexicon and proposals files are read with read_file, which opens only those two files of the backlog.
# The readers are pre-approved. The writers are not: Claude Code asks you before every write, on top
# of the skill's yes/no question (--permission-mode default keeps that prompt on, whatever mode your settings use).
param(
  [string]$Backlog = '',
  [string]$Story = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
Set-Location $root
$propose = '.claude/skills/propose-stories'
. (Join-Path $PSScriptRoot 'backlog-tools-config.ps1')
$dataDir = if ($env:PLANNER_DATA_DIR) { $env:PLANNER_DATA_DIR } elseif ($env:TLT_DATA_DIR) { Write-Host "TLT_DATA_DIR is now PLANNER_DATA_DIR; the old name still works for now." -ForegroundColor Yellow; $env:TLT_DATA_DIR } else { Join-Path $root 'planner/data' }

function Stop-Launcher([string]$Message) {
  Write-Host $Message -ForegroundColor Red
  exit 1
}

$file = Select-Backlog $dataDir $Backlog

if (-not $Story.Trim()) { $Story = Read-Host 'What story? (a proposed ID like NEW-57, a backlog ID like IAM-0004, or describe it)' }
$Story = $Story.Trim()
if (-not $Story) { Stop-Launcher 'No story given.' }

# The ID with the Title read from the file, e.g. NEW-57 titled "Reset password", so the session names the story by Title from its
# first reply. A Title is one line; quotes inside it become apostrophes; the ID alone is kept when the Title is empty.
function Add-Title([string]$Id, $Row) {
  $title = ([string]$Row.Title -replace '\s+', ' ' -replace '"', "'").Trim()
  if ($title) { return "$Id titled `"$title`"" }
  return $Id
}

if ($Story -match '^NEW-\d+$') {
  $Story = $Story.ToUpper()
  $proposals = Join-Path (Join-Path $dataDir 'proposals') $file
  $known = @()
  if (Test-Path -LiteralPath $proposals) { $known = @(Import-Csv -LiteralPath $proposals -Encoding UTF8 | Where-Object { $_.ID -eq $Story }) }
  if (-not $known.Count) { Stop-Launcher "$Story is not in planner/data/proposals/$file." }
  $Story = Add-Title $Story $known[0]
} elseif ($Story -match '^[A-Za-z]+-\d+$') {
  $Story = $Story.ToUpper()
  $known = @(Import-Csv -LiteralPath (Join-Path (Join-Path $dataDir 'backlogs') $file) -Encoding UTF8 | Where-Object { $_.ID -eq $Story })
  if (-not $known.Count) { Stop-Launcher "$Story is not in planner/data/backlogs/$file." }
  $Story = Add-Title $Story $known[0]
}

# Windows PowerShell 5.1 does not escape quotes inside an argument for a native command.
$prompt = "/explore-stories $file $Story"
if ($PSVersionTable.PSVersion.Major -lt 7) { $prompt = $prompt.Replace('"', '\"') }


$mcp = New-BacklogToolsConfig $root

try {
  claude $prompt `
    --tools "Skill,AskUserQuestion" `
    --mcp-config $mcp `
    --strict-mcp-config `
    --allowedTools "mcp__backlog-tools__read_context" "mcp__backlog-tools__search_stories" "mcp__backlog-tools__read_file" "mcp__backlog-tools__check_drafts" `
    --permission-mode "auto" `
    --settings "$propose/locked-settings.json"
} finally {
  Remove-Item -LiteralPath $mcp, $env:PLANNER_MCP_READY_FILE -Force -ErrorAction SilentlyContinue
}
