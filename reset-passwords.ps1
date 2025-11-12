# Reset All User Passwords to Password@123
# Loads environment variables from .env and runs the password reset script

Write-Host "🔐 Resetting All User Passwords" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please ensure you have a .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Required variables:" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_URL (or VITE_SUPABASE_URL)" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_SERVICE_KEY" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Loading environment variables from .env..." -ForegroundColor Green

# Load .env file
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        # Remove quotes if present
        $value = $value -replace '^["'']|["'']$', ''
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        
        # Show loaded variables (mask sensitive ones)
        if ($name -like "*KEY*" -or $name -like "*SECRET*" -or $name -like "*PASSWORD*") {
            Write-Host "  ✓ $name = [HIDDEN]" -ForegroundColor DarkGray
        } else {
            Write-Host "  ✓ $name = $value" -ForegroundColor DarkGray
        }
    }
}

Write-Host ""
Write-Host "🚀 Running password reset script..." -ForegroundColor Green
Write-Host ""

# Run the improved Node.js password reset script
node scripts/reset-all-passwords.js

Write-Host ""
Write-Host "✅ Password reset complete!" -ForegroundColor Green
Write-Host ""
Write-Host "All users can now login with:" -ForegroundColor Cyan
Write-Host "   Email: [their email address]" -ForegroundColor White
Write-Host "   Password: Password@123" -ForegroundColor White
Write-Host ""
