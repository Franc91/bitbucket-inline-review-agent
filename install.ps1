param(
    [string]$TargetPath = "",
    [switch]$Global,
    [switch]$Copy,
    [switch]$UpdateAgents,
    [switch]$SkipMcp
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$install = Join-Path $Root "scripts\install.mjs"

$args = @()
if ($Global) { $args += "--global" }
if ($Copy) { $args += "--copy" }
if ($UpdateAgents) { $args += "--update-agents" }
if ($SkipMcp) { $args += "--skip-mcp" }
if ($TargetPath) { $args += "--target", $TargetPath }

& node $install @args
exit $LASTEXITCODE
