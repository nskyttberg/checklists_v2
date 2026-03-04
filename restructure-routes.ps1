$ErrorActionPreference = "Stop"
$root = "C:\Users\Niclas\Desktop\Checklistor_POC_2\checklist_2"

Write-Host ""
Write-Host "=== Route Group Restructure ===" -ForegroundColor Cyan

if (-not (Test-Path "$root\app\app-shell.tsx")) {
    Write-Host "ERROR: app-shell.tsx not found." -ForegroundColor Red
    exit 1
}

$backup = "$root\_backup_before_restructure"
if (-not (Test-Path $backup)) {
    Write-Host "Creating backup..." -ForegroundColor Yellow
    Copy-Item -Path "$root\app" -Destination "$backup\app" -Recurse
    Write-Host "  Backup saved." -ForegroundColor Green
}

Write-Host "Creating directories..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "$root\app\(admin)" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\app\(employee)\my\components" | Out-Null

Write-Host "Moving admin content..." -ForegroundColor Cyan
Move-Item -Force "$root\app\app-shell.tsx" "$root\app\(admin)\app-shell.tsx"
Move-Item -Force "$root\app\page.tsx" "$root\app\(admin)\page.tsx"
if (Test-Path "$root\app\admin") {
    Move-Item -Force "$root\app\admin" "$root\app\(admin)\admin"
}
Write-Host "  Done." -ForegroundColor Green

Write-Host "Creating (admin)/layout.tsx..." -ForegroundColor Cyan
$adminLayout = @"
import AppShell from "./app-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
"@
Set-Content -Path "$root\app\(admin)\layout.tsx" -Value $adminLayout -Encoding UTF8

Write-Host "Creating (employee)/my/layout.tsx..." -ForegroundColor Cyan
$myLayout = @"
`"use client`";

import { UserProvider } from `"@/lib/user-context`";

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <UserProvider>{children}</UserProvider>;
}
"@
Set-Content -Path "$root\app\(employee)\my\layout.tsx" -Value $myLayout -Encoding UTF8

Write-Host "Moving existing /my/ content..." -ForegroundColor Cyan
if (Test-Path "$root\app\my") {
    Get-ChildItem "$root\app\my" | ForEach-Object {
        if ($_.Name -ne "layout.tsx") {
            Move-Item -Force $_.FullName "$root\app\(employee)\my\$($_.Name)"
            Write-Host "  Moved $($_.Name)" -ForegroundColor Green
        }
    }
    Remove-Item -Force -Recurse "$root\app\my" -ErrorAction SilentlyContinue
}

Write-Host "Updating root layout.tsx..." -ForegroundColor Cyan
$rootLayout = @"
import type { Metadata } from `"next`";
import `"./globals.css`";

export const metadata: Metadata = {
  title: `"Aleris Checklistor`",
  description: `"Checklistesystem for Aleris Klinisk Fysiologi`",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang=`"sv`">
      <body className=`"bg-sand min-h-screen`" style={{ fontFamily: `"Arial, system-ui, sans-serif`" }}>
        {children}
      </body>
    </html>
  );
}
"@
Set-Content -Path "$root\app\layout.tsx" -Value $rootLayout -Encoding UTF8

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host "Run: npm run dev" -ForegroundColor Yellow
Write-Host "Test: / and /admin show admin header, /my does NOT" -ForegroundColor Yellow
Write-Host ""
