# Complete Cache Clearing Script for Trakr

Write-Host "Clearing Trakr Cache and Service Workers..." -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Get the path to the fix-cache.html file
$cacheClearPage = Join-Path $PSScriptRoot "fix-cache.html"

Write-Host "Step 1: Opening cache clearing page..." -ForegroundColor Yellow
Write-Host ""

# Open the cache clearing page in the default browser
Start-Process $cacheClearPage

Write-Host "Step 2: In the opened page:" -ForegroundColor Yellow
Write-Host "  1. Click 'Clear All Cache & Service Workers' button" -ForegroundColor White
Write-Host "  2. Wait for the success message" -ForegroundColor White
Write-Host "  3. Page will automatically redirect to your app" -ForegroundColor White
Write-Host ""
Write-Host "If the automatic clearing doesn't work:" -ForegroundColor Yellow
Write-Host "  Follow the manual steps shown on the page" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter to continue after clearing cache..." -ForegroundColor Green
Read-Host

Write-Host ""
Write-Host "Step 3: Restarting dev server..." -ForegroundColor Yellow

# Kill any running node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "  Stopped existing dev server" -ForegroundColor White

# Start the dev server
Write-Host "  Starting dev server..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev:web"

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host ""
Write-Host "Your app should now load properly at http://localhost:3002" -ForegroundColor Cyan
Write-Host "You should see the space-themed login with role buttons!" -ForegroundColor Cyan
Write-Host ""
