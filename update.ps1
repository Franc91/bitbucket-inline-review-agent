param(
    [string]$TargetPath = "",
    [switch]$Global,
    [switch]$Copy,
    [switch]$UpdateAgents,
    [switch]$SkipMcp,
    [switch]$PullOnly
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

Write-Host "Updating bitbucket-inline-review-agent..."
if (Test-Path (Join-Path $Root ".git")) {
    git -C $Root pull --ff-only
    if ($LASTEXITCODE -ne 0) {
        Write-Error "git pull failed. Resolve manually, then rerun .\update.ps1"
    }
} else {
    Write-Host "Not a git repo — skipping pull."
}

if ($PullOnly) {
    Write-Host "Pull only (-PullOnly). Skipping install into product workspace."
    exit 0
}

$configPath = Join-Path $Root "install.config.json"
$shouldInstall = $Global -or $TargetPath -or (Test-Path $configPath)

if (-not $shouldInstall) {
    Write-Host ""
    Write-Host "Kit updated on disk. No install.config.json — skipped reinstall into product repo."
    Write-Host "To refresh a project, either:"
    Write-Host "  .\install.ps1 -TargetPath `"C:\path\to\product\code`""
    Write-Host "  or copy install.config.example.json -> install.config.json and rerun .\update.ps1"
    exit 0
}

& (Join-Path $Root "install.ps1") -TargetPath $TargetPath -Global:$Global -Copy:$Copy -UpdateAgents:$UpdateAgents -SkipMcp:$SkipMcp
exit $LASTEXITCODE
