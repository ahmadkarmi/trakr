# Trakr Environment Setup Script
# This script helps you securely configure your Supabase connection

Write-Host "Trakr Secure Environment Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env files already exist
$webEnvExists = Test-Path "apps\web\.env"
$rootEnvExists = Test-Path ".env"

if ($webEnvExists -or $rootEnvExists) {
    Write-Host "WARNING: Environment files already exist!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite them? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Setup cancelled." -ForegroundColor Red
        exit
    }
}

# Get Supabase credentials
Write-Host "Please enter your Supabase credentials" -ForegroundColor Green
Write-Host "You can find these in your Supabase project dashboard > Settings > API" -ForegroundColor Gray
Write-Host ""

$supabaseUrl = Read-Host "Enter your Supabase Project URL (https://xxx.supabase.co)"
$supabaseAnonKey = Read-Host "Enter your Supabase Anon Key"
$supabaseServiceKey = Read-Host "Enter your Supabase Service Role Key (for seeding)"

# Validate inputs
if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or 
    [string]::IsNullOrWhiteSpace($supabaseAnonKey)) {
    Write-Host "ERROR: URL and Anon Key are required!" -ForegroundColor Red
    exit 1
}

# Create web app .env file
Write-Host ""
Write-Host "Creating apps/web/.env..." -ForegroundColor Green

$webEnvContent = @"
# Trakr Web App Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

VITE_BACKEND=supabase
VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_ANON_KEY=$supabaseAnonKey
"@

New-Item -Path "apps\web" -ItemType Directory -Force | Out-Null
$webEnvContent | Out-File -FilePath "apps\web\.env" -Encoding UTF8 -Force

Write-Host "SUCCESS: Created apps/web/.env" -ForegroundColor Green

# Create root .env file for seeding (if service key provided)
if (-not [string]::IsNullOrWhiteSpace($supabaseServiceKey)) {
    Write-Host "Creating .env for database seeding..." -ForegroundColor Green
    
    $rootEnvContent = @"
# Trakr Database Seeding Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

SUPABASE_URL=$supabaseUrl
SUPABASE_SERVICE_KEY=$supabaseServiceKey
"@
    
    $rootEnvContent | Out-File -FilePath ".env" -Encoding UTF8 -Force
    Write-Host "SUCCESS: Created .env for seeding" -ForegroundColor Green
}

# Verify files were created
Write-Host ""
Write-Host "Verifying setup..." -ForegroundColor Cyan

if (Test-Path "apps\web\.env") {
    Write-Host "VERIFIED: apps/web/.env exists" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to create apps/web/.env" -ForegroundColor Red
}

if (-not [string]::IsNullOrWhiteSpace($supabaseServiceKey)) {
    if (Test-Path ".env") {
        Write-Host "VERIFIED: .env exists (for seeding)" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to create .env" -ForegroundColor Red
    }
}

# Show next steps
Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Restart your dev server: npm run dev:web" -ForegroundColor White
Write-Host "2. Open http://localhost:3002 in your browser" -ForegroundColor White
Write-Host "3. You should now see the space-themed login with role buttons" -ForegroundColor White
Write-Host ""
Write-Host "Optional - Seed your database:" -ForegroundColor Cyan
Write-Host "   npm run seed:db" -ForegroundColor White
Write-Host ""
Write-Host "Security Note:" -ForegroundColor Yellow
Write-Host "   Your .env files are gitignored and will NOT be committed to version control." -ForegroundColor Gray
Write-Host ""
