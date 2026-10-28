<#
.SYNOPSIS
Installs the OpenSpec /opsx:* commands with our changes applied, in every project at once.

.DESCRIPTION
OpenSpec overwrites its generated commands on every `init` and `update`, so edits to them are lost.
This script keeps the changes as data instead (patches.psd1) and applies them to a fresh generation:

  1. Check the installed `openspec` is the version pinned in patches.psd1.
  2. Generate the commands in a scratch folder, with a scratch OpenSpec config (your machine config
     is not read), so the result does not depend on this machine's settings.
  3. Add `disable-model-invocation: true` to every file and apply each patch. A patch whose text is
     not found exactly once stops the run and names the file and the patch.
  4. Check the patched files still contain every string in `Expect`.
  5. Copy the files to ~/.claude/commands/opsx and set the machine delivery (`openspec config set
     delivery commands`, skipped with -SkipDelivery) so a later `openspec init` in a project does not
     list each workflow twice.

Nothing outside the scratch folder is touched until every patch and check has passed.

The commit hard stop itself is not only prompt text: also gate `git commit` in Claude Code
(`Bash(git commit:*)` in the `ask` list of ~/.claude/settings.json, or a PreToolUse hook).

.PARAMETER Check
Generate, patch and verify only; install nothing and change no config.

.PARAMETER Dest
Folder that receives the commands. Default: ~/.claude/commands/opsx.

.PARAMETER SkipDelivery
Install the commands but leave the machine OpenSpec delivery setting alone.

.PARAMETER Help
Show this help.

.EXAMPLE
.\Install-Opsx.ps1 -Check
Show that every patch still applies to the pinned OpenSpec version.

.EXAMPLE
.\Install-Opsx.ps1
Install the patched commands globally.
#>

[CmdletBinding()]
param(
    [switch]$Check,
    [string]$Dest = (Join-Path $HOME '.claude\commands\opsx'),
    [switch]$SkipDelivery,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($Help) {
    Get-Help $PSCommandPath -Detailed
    return
}

$config = Import-PowerShellDataFile -LiteralPath (Join-Path $PSScriptRoot 'patches.psd1')

function Read-Lf([string]$FilePath) {
    return (Get-Content -LiteralPath $FilePath -Raw -Encoding UTF8) -replace "`r`n", "`n"
}

function Write-Lf([string]$FilePath, [string]$Text) {
    [System.IO.File]::WriteAllText($FilePath, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

function Add-FrontmatterFlag([string]$Text, [string]$Flag, [string]$Name) {
    if ($Text -notmatch '(?s)\A---\n(.*?\n)---\n') { throw "${Name}: no frontmatter found" }
    if ($Matches[1] -match "(?m)^$([regex]::Escape($Flag))\s*$") {
        throw "${Name}: already has '$Flag'; the flag step is no longer needed"
    }
    return $Text.Insert($Matches[0].Length - 4, "$Flag`n")
}

function Invoke-Patch([string]$Text, [hashtable]$Patch) {
    $find = $Patch.Find -replace "`r`n", "`n"
    $replace = $Patch.Replace -replace "`r`n", "`n"
    $count = ([regex]::Matches($Text, [regex]::Escape($find))).Count
    if ($count -ne 1) {
        throw "$($Patch.File): patch '$($Patch.Name)' found its anchor $count times (need exactly 1). Upstream changed this section; update patches.psd1."
    }
    return $Text.Replace($find, $replace)
}

if (-not (Get-Command openspec -ErrorAction SilentlyContinue)) {
    throw "openspec not found. Install the pinned version: npm install -g @fission-ai/openspec@$($config.OpenSpecVersion)"
}
$version = (& openspec --version | Select-Object -Last 1).Trim()
if ($version -ne $config.OpenSpecVersion) {
    throw "openspec is $version but patches.psd1 pins $($config.OpenSpecVersion). Install it (npm install -g @fission-ai/openspec@$($config.OpenSpecVersion)) or bump the pin on a branch and rerun."
}

$scratch = Join-Path ([System.IO.Path]::GetTempPath()) ("opsx-" + [guid]::NewGuid().ToString('N'))
$saved = @{}
foreach ($name in 'APPDATA', 'XDG_CONFIG_HOME', 'OPENSPEC_TELEMETRY') { $saved[$name] = [Environment]::GetEnvironmentVariable($name) }

try {
    $configHome = Join-Path $scratch 'config'
    $project = Join-Path $scratch 'project'
    New-Item -ItemType Directory -Force -Path (Join-Path $configHome 'openspec'), $project | Out-Null

    $scratchConfig = [ordered]@{ profile = 'custom'; delivery = $config.Delivery; workflows = $config.Workflows }
    Write-Lf (Join-Path $configHome 'openspec\config.json') ($scratchConfig | ConvertTo-Json)

    $env:APPDATA = $configHome
    $env:XDG_CONFIG_HOME = $configHome
    $env:OPENSPEC_TELEMETRY = '0'
    & openspec init $project --tools claude --no-animation | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "openspec init failed (exit $LASTEXITCODE)" }
}
finally {
    foreach ($name in $saved.Keys) { [Environment]::SetEnvironmentVariable($name, $saved[$name]) }
}

try {
    $generated = Join-Path $project '.claude\commands\opsx'
    $files = @(Get-ChildItem -LiteralPath $generated -Filter '*.md')
    if ($files.Count -ne $config.Workflows.Count) {
        throw "Expected $($config.Workflows.Count) generated commands, found $($files.Count) in $generated"
    }

    $text = @{}
    foreach ($file in $files) {
        $text[$file.Name] = Add-FrontmatterFlag (Read-Lf $file.FullName) $config.FrontmatterFlag $file.Name
    }
    foreach ($patch in $config.Patches) {
        if (-not $text.ContainsKey($patch.File)) { throw "Patch '$($patch.Name)' names $($patch.File), which was not generated" }
        $text[$patch.File] = Invoke-Patch $text[$patch.File] $patch
    }
    foreach ($expect in $config.Expect) {
        if (-not $text.ContainsKey($expect.File) -or -not $text[$expect.File].Contains($expect.Text)) {
            throw "$($expect.File): expected text missing after patching: $($expect.Text)"
        }
    }
    Write-Host "OpenSpec ${version}: $($config.Patches.Count) patches applied, $($config.Expect.Count) checks passed."

    if ($Check) { return }

    New-Item -ItemType Directory -Force -Path $Dest | Out-Null
    foreach ($name in $text.Keys) { Write-Lf (Join-Path $Dest $name) $text[$name] }
    Write-Host "Installed $($text.Count) commands to $Dest"

    if ($SkipDelivery) { return }
    $delivery = (& openspec config get delivery | Select-Object -Last 1).Trim()
    if ($delivery -ne $config.Delivery) {
        & openspec config set delivery $config.Delivery | Out-Null
        Write-Host "Set machine OpenSpec delivery: $delivery -> $($config.Delivery)"
    }
}
finally {
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($scratch.StartsWith($tempRoot) -and (Test-Path -LiteralPath $scratch)) {
        Remove-Item -LiteralPath $scratch -Recurse -Force
    }
}
