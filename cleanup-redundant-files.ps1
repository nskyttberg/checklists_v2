param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$root = $PWD

if (-not (Test-Path (Join-Path $root "package.json"))) {
    Write-Error "Run this script from the checklist_2 project root."
    exit 1
}

$redundantFiles = @(
    "admin-nav-context.tsx",
    "primitives.tsx",
    "use-sidebar.ts",
    "lib\hooks\use-sidebar.ts",
    "app\(admin)\app-shell.tsx",
    "app\(admin)\page.tsx"
)

$deleted = 0
$missing = 0

Write-Host ""
if ($DryRun) {
    Write-Host "DRY RUN - no files will be deleted." -ForegroundColor Yellow
} else {
    Write-Host "Deleting redundant files..." -ForegroundColor Cyan
}
Write-Host ""

foreach ($rel in $redundantFiles) {
    $full = Join-Path $root $rel
    if (Test-Path $full) {
        if ($DryRun) {
            Write-Host "  [would delete] $rel" -ForegroundColor DarkYellow
        } else {
            Remove-Item $full -Force
            Write-Host "  [deleted] $rel" -ForegroundColor Green
        }
        $deleted++
    } else {
        Write-Host "  [not found]  $rel" -ForegroundColor DarkGray
        $missing++
    }
}

Write-Host ""
if ($DryRun) {
    Write-Host "Dry run complete. $deleted file(s) would be deleted, $missing already absent." -ForegroundColor Yellow
} else {
    Write-Host "Done. $deleted file(s) deleted, $missing already absent." -ForegroundColor Cyan
}
Write-Host ""