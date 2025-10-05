# Clear Service Worker and Browser Cache Script

Write-Host "Clearing Service Worker and Cache..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Instructions to clear cache:" -ForegroundColor Yellow
Write-Host "1. Open your browser at http://localhost:3002" -ForegroundColor White
Write-Host "2. Press F12 to open Developer Tools" -ForegroundColor White
Write-Host "3. Go to 'Application' tab (or 'Storage' tab)" -ForegroundColor White
Write-Host "4. In left sidebar:" -ForegroundColor White
Write-Host "   - Click 'Service Workers'" -ForegroundColor White
Write-Host "   - Click 'Unregister' for any active workers" -ForegroundColor White
Write-Host "5. Still in Application tab:" -ForegroundColor White
Write-Host "   - Click 'Clear storage'" -ForegroundColor White
Write-Host "   - Click 'Clear site data' button" -ForegroundColor White
Write-Host "6. Close Developer Tools" -ForegroundColor White
Write-Host "7. Refresh the page normally (F5)" -ForegroundColor White
Write-Host ""
Write-Host "Service Worker is now DISABLED in development mode!" -ForegroundColor Green
Write-Host "You won't need to hard refresh anymore after this one-time cleanup." -ForegroundColor Green
Write-Host ""
