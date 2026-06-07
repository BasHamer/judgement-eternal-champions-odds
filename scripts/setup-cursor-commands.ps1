# Links .cursor/commands to agent-sops/ via directory junction (no admin required on Windows).
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $repoRoot "agent-sops"
$link = Join-Path $repoRoot ".cursor\commands"

if (-not (Test-Path $target)) {
    Write-Error "agent-sops/ not found. Vendor SOPs before running this script."
}

$cursorDir = Join-Path $repoRoot ".cursor"
if (-not (Test-Path $cursorDir)) {
    New-Item -ItemType Directory -Path $cursorDir | Out-Null
}

if (Test-Path $link) {
    $item = Get-Item $link -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        Remove-Item $link -Force
    } else {
        Write-Error ".cursor/commands exists and is not a junction. Remove it manually first."
    }
}

New-Item -ItemType Junction -Path $link -Target $target | Out-Null
Write-Host "Created junction: .cursor/commands -> agent-sops/"
