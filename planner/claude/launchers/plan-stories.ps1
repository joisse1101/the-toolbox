# Starts an interactive Claude session that plans stories of a backlog into diagrams: a use-case specification, a class diagram and
# sequence diagrams, written to planner/data/diagrams/<backlog>/<slice>/.
# Usage: .\planner\claude\launchers\plan-stories.ps1 [backlog] [scope] [-Repo <path>]
#   backlog  a backlog in planner/data/backlogs/, with or without .csv (data-portal or data-portal.csv); asked for from a numbered list when missing
#   scope    ONE argument: an Epic name, "Epic > Feature", a story ID of the backlog (IAM-0004) or free text; quote it when it has spaces; asked for when missing
#   -Repo    the folder of the existing solution, read-only, to ground the diagrams in; stored in planner/data/diagrams/<backlog>/repo.json
#            (git-ignored) and used again by later sessions that do not pass it. The "exclude" list of that file is yours to edit and is
#            kept. Without a repo the session is still design-level and asks you for the detail.
# It refuses an unknown backlog, an empty scope, a story ID that is not in the backlog and a -Repo that is not a folder before Claude starts.
# Starts in /plan-stories with both filled in. Tools are limited to backlog-tools --read-only (read_context, search_stories, read_file),
# diagram-tools (read_diagrams, check_diagram, write_diagram, and repo_tree, repo_grep, repo_read when a repo is set), Skill and
# AskUserQuestion: no Bash, Read or Grep. The readers are pre-approved. write_diagram is not: Claude Code asks you before every write, on
# top of the skill's yes/no question (--permission-mode default keeps that prompt on, whatever mode your settings use).
param(
  [string]$Backlog = '',
  [string]$Scope = '',
  [string]$Repo = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
Set-Location $root
$skill = '.claude/skills/plan-stories'
. (Join-Path $PSScriptRoot 'backlog-tools-config.ps1')
$dataDir = if ($env:PLANNER_DATA_DIR) { $env:PLANNER_DATA_DIR } elseif ($env:TLT_DATA_DIR) { Write-Host "TLT_DATA_DIR is now PLANNER_DATA_DIR; the old name still works for now." -ForegroundColor Yellow; $env:TLT_DATA_DIR } else { Join-Path $root 'planner/data' }

function Stop-Launcher([string]$Message) {
  Write-Host $Message -ForegroundColor Red
  exit 1
}

$file = Select-Backlog $dataDir $Backlog

if (-not $Scope.Trim()) { $Scope = Read-Host 'What scope? (an Epic name, "Epic > Feature", a story ID like IAM-0004, or describe it)' }
$Scope = $Scope.Trim()
if (-not $Scope) { Stop-Launcher 'No scope given.' }

# A story ID goes in with its Title read from the file, e.g. IAM-0004 titled "Reset password", so the session names the story by Title
# from its first reply. A Title is one line; quotes inside it become apostrophes. Anything else goes in as typed.
if ($Scope -match '^[A-Za-z]+-\d+$') {
  $Scope = $Scope.ToUpper()
  $known = @(Import-Csv -LiteralPath (Join-Path (Join-Path $dataDir 'backlogs') $file) -Encoding UTF8 | Where-Object { $_.ID -eq $Scope })
  if (-not $known.Count) { Stop-Launcher "$Scope is not in planner/data/backlogs/$file." }
  $title = ([string]$known[0].Title -replace '\s+', ' ' -replace '"', "'").Trim()
  if ($title) { $Scope = "$Scope titled `"$title`"" }
}

# -Repo: checked and stored for this backlog. Only "path" is written; "exclude" stays as it is (a new file starts with none).
if ($Repo.Trim()) {
  if (-not (Test-Path -LiteralPath $Repo.Trim() -PathType Container)) { Stop-Launcher "-Repo '$Repo' is not an existing folder." }
  $repoPath = (Resolve-Path -LiteralPath $Repo.Trim()).ProviderPath
  $folder = Join-Path (Join-Path $dataDir 'diagrams') ($file -replace '\.csv$', '')
  $config = Join-Path $folder 'repo.json'
  $exclude = @()
  if (Test-Path -LiteralPath $config) {
    try { $existing = Get-Content -LiteralPath $config -Raw -Encoding UTF8 | ConvertFrom-Json } catch { Stop-Launcher "$config is not valid JSON; fix it or delete it, then run again." }
    if ($existing.PSObject.Properties['exclude']) { $exclude = @($existing.exclude) }
  }
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
  $json = [ordered]@{ path = $repoPath; exclude = $exclude } | ConvertTo-Json
  [IO.File]::WriteAllText($config, $json + "`n", (New-Object Text.UTF8Encoding($false)))
  Write-Host "Repo for $file set to $repoPath" -ForegroundColor Green
}

# Windows PowerShell 5.1 does not escape quotes inside an argument for a native command.
$prompt = "/plan-stories $file $Scope"
if ($PSVersionTable.PSVersion.Major -lt 7) { $prompt = $prompt.Replace('"', '\"') }

$session = New-PlanStoriesConfig $root $file

try {
  claude $prompt `
    --tools "Skill,AskUserQuestion" `
    --mcp-config $session.Path `
    --strict-mcp-config `
    --allowedTools "mcp__backlog-tools__read_context" "mcp__backlog-tools__search_stories" "mcp__backlog-tools__read_file" "mcp__diagram-tools__read_diagrams" "mcp__diagram-tools__check_diagram" "mcp__diagram-tools__repo_tree" "mcp__diagram-tools__repo_grep" "mcp__diagram-tools__repo_read" `
    --permission-mode default `
    --settings "$skill/locked-settings.json"
} finally {
  Remove-Item -LiteralPath (@($session.Path) + $session.ReadyFiles) -Force -ErrorAction SilentlyContinue
}
