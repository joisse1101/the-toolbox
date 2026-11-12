<#
.SYNOPSIS
Builds the story-to-code mock repo under .scratch\mock-app\ at a chosen stage of the flow. It calls no model.

.DESCRIPTION
Copies the sample (app, wiki, CLAUDE.md) into <repo>\.scratch\mock-app\, makes it its own git repository on the
branch 'sample', installs the toolkit into it at project scope only, and runs `npm ci` there. With -Stage it then
applies the saved results of every stage up to the one named, in order (see README.md).

Everything it writes is under .scratch\mock-app\. It never touches ~\.claude or any global toolkit folder,
and it starts no model session.

.PARAMETER Stage
One of: baseline, proposed, accepted, planned, built, validated, archived. Default: baseline.

.PARAMETER Scope
Only 'project' is accepted. The mock repo never gets a global install.

.PARAMETER Reset
Delete an existing .scratch\mock-app\ first. Without it the script stops when the folder exists.

.PARAMETER NoInstall
Skip the toolkit install and `npm ci` (used by the tests of the sample, which need neither).

.EXAMPLE
.\build-mock-repo.ps1 -Stage planned -Reset
#>
[CmdletBinding()]
param(
    [string]$Stage = 'baseline',
    [string]$Scope = 'project',
    [switch]$Reset,
    [switch]$NoInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Stages = @('baseline', 'proposed', 'accepted', 'planned', 'built', 'validated', 'archived')
$SampleDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $SampleDir '..\..\..')).Path
$Mock = Join-Path $RepoRoot '.scratch\mock-app'
$Branch = 'sample'

function Stop-Script([string]$Message) {
    [Console]::Error.WriteLine($Message)
    exit 1
}

function Invoke-Native([string]$What, [scriptblock]$Command) {
    & $Command
    if ($LASTEXITCODE -ne 0) { Stop-Script "$What failed (exit code $LASTEXITCODE)." }
}

if ($Scope -ne 'project') {
    Stop-Script "The mock repo is installed at project scope only; '-Scope $Scope' is refused."
}
if ($Stages -notcontains $Stage) {
    Stop-Script ("Unknown stage '$Stage'. Valid stages, in order: " + ($Stages -join ', ') + '.')
}
$upTo = [array]::IndexOf($Stages, $Stage)

if (Test-Path -LiteralPath $Mock) {
    if (-not $Reset) {
        Stop-Script "$Mock already exists. Nothing was changed. Pass -Reset to delete it and build again."
    }
    if (-not $Mock.EndsWith('\.scratch\mock-app')) { Stop-Script "Refusing to delete $Mock." }
    Remove-Item -LiteralPath $Mock -Recurse -Force
}

# Copy the sample's own files, never an installed or built folder.
New-Item -ItemType Directory -Path $Mock | Out-Null
Copy-Item -LiteralPath (Join-Path $SampleDir 'CLAUDE.md') -Destination $Mock
Copy-Item -LiteralPath (Join-Path $SampleDir 'wiki') -Destination (Join-Path $Mock 'wiki') -Recurse
New-Item -ItemType Directory -Path (Join-Path $Mock 'app') | Out-Null
Get-ChildItem -LiteralPath (Join-Path $SampleDir 'app') -Force |
    Where-Object { $_.Name -notin @('node_modules', 'dist', 'audio') } |
    ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Mock 'app') -Recurse }
# The data folder and the installed toolkit are local to this machine, so git ignores them.
Set-Content -LiteralPath (Join-Path $Mock '.gitignore') -Value @('.claude/', '.plans/', 'node_modules/') -Encoding ascii

Push-Location $Mock
try {
    Invoke-Native 'git init' { git init -q -b $Branch }
    # Local identity, so the commits of the build do not depend on the machine's git settings.
    Invoke-Native 'git config' { git config user.name 'Sample Builder' }
    Invoke-Native 'git config' { git config user.email 'sample@example.invalid' }
    Invoke-Native 'git add' { git add -A }
    Invoke-Native 'git commit' { git commit -q -m 'chore: add the habit and focus tracker' }

    if (-not $NoInstall) {
        & (Join-Path $RepoRoot 'toolkit\install\Install-Toolkit.ps1') -Scope project -Path $Mock
        if ($LASTEXITCODE -ne 0) { Stop-Script 'The toolkit install failed.' }
        Push-Location (Join-Path $Mock 'app')
        try { Invoke-Native 'npm ci' { npm ci } } finally { Pop-Location }
    }

    for ($i = 1; $i -le $upTo; $i++) {
        $name = $Stages[$i]
        $dir = Join-Path $SampleDir "stages\$name"
        if (-not (Test-Path -LiteralPath $dir)) { Stop-Script "The saved stage '$name' is missing: $dir" }
        $patch = Join-Path $dir 'built.patch'
        if (Test-Path -LiteralPath $patch) {
            Invoke-Native 'git am' { git am --quiet $patch }
        }
        Get-ChildItem -LiteralPath $dir -Force | Where-Object { $_.Name -ne 'built.patch' } |
            ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $Mock -Recurse -Force }
        # Wiki pages are tracked, so the archive stage commits them as the flow would.
        if ($name -eq 'archived') {
            Invoke-Native 'git add' { git add wiki }
            git diff --cached --quiet
            if ($LASTEXITCODE -ne 0) { Invoke-Native 'git commit' { git commit -q -m 'docs(wiki): archive the slice' } }
        }
    }
}
finally {
    Pop-Location
}

Write-Host "Built $Mock at stage '$Stage' on branch '$Branch'."
Write-Host "Start Claude in that folder: cd $Mock; claude"
