# Local Database Backup Script for Windows
# Usage: .\scripts\backup-database.ps1

param(
    [string]$BackupDir = ".\database\backups\local"
)

$ErrorActionPreference = "Stop"

# Configuration
$BackupDate = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "trakr-backup-$BackupDate.sql"

Write-Host "🔄 Starting database backup..." -ForegroundColor Blue

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Check if SUPABASE_DB_URL is set
$DbUrl = $env:SUPABASE_DB_URL
if (-not $DbUrl) {
    Write-Host "❌ Error: SUPABASE_DB_URL environment variable not set" -ForegroundColor Red
    Write-Host "Please set it in your .env file or set the environment variable:"
    Write-Host '  $env:SUPABASE_DB_URL = "postgresql://postgres:[password]@[host]:5432/postgres"'
    exit 1
}

# Check if pg_dump is available
try {
    $null = Get-Command pg_dump -ErrorAction Stop
} catch {
    Write-Host "❌ Error: pg_dump not found" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools:"
    Write-Host "  Download from: https://www.postgresql.org/download/windows/"
    Write-Host "  Or install via: choco install postgresql"
    exit 1
}

# Create full backup
Write-Host "📦 Creating full database backup..." -ForegroundColor Blue
& pg_dump $DbUrl `
    --no-owner `
    --no-privileges `
    --clean `
    --if-exists `
    --file=$BackupFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backup failed!" -ForegroundColor Red
    exit 1
}

# Compress backup
Write-Host "🗜️  Compressing backup..." -ForegroundColor Blue
Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip" -Force
Remove-Item $BackupFile
$BackupFile = "$BackupFile.zip"

# Get file size
$BackupSize = (Get-Item $BackupFile).Length
$BackupSizeStr = if ($BackupSize -gt 1MB) {
    "{0:N2} MB" -f ($BackupSize / 1MB)
} elseif ($BackupSize -gt 1KB) {
    "{0:N2} KB" -f ($BackupSize / 1KB)
} else {
    "$BackupSize bytes"
}

Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
Write-Host "   File: $BackupFile" -ForegroundColor Green
Write-Host "   Size: $BackupSizeStr" -ForegroundColor Green

# Create schema-only backup
$SchemaFile = Join-Path $BackupDir "trakr-schema-$BackupDate.sql"
Write-Host "📋 Creating schema-only backup..." -ForegroundColor Blue
& pg_dump $DbUrl `
    --schema-only `
    --no-owner `
    --no-privileges `
    --file=$SchemaFile

Write-Host "✅ Schema backup created: $SchemaFile" -ForegroundColor Green

# Cleanup old backups (keep last 30)
Write-Host "🧹 Cleaning up old backups (keeping last 30)..." -ForegroundColor Blue
$OldBackups = Get-ChildItem -Path $BackupDir -Filter "trakr-backup-*.sql.zip" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -Skip 30
$OldBackups | Remove-Item -Force

$OldSchemas = Get-ChildItem -Path $BackupDir -Filter "trakr-schema-*.sql" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -Skip 30
$OldSchemas | Remove-Item -Force

Write-Host "✨ All done!" -ForegroundColor Green
Write-Host ""
Write-Host "To restore this backup:"
Write-Host "  Expand-Archive -Path '$BackupFile' -DestinationPath temp"
Write-Host "  psql `$env:SUPABASE_DB_URL -f temp\trakr-backup-$BackupDate.sql"
