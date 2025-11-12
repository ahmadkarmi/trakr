# Create GitHub PR using API
$title = "fix: submit_audit RPC returns full audit row and test improvements"
$body = Get-Content -Path "PR_DESCRIPTION_GITHUB.md" -Raw
$base = "main"
$head = "feat/org-scope-surveys"

# GitHub API endpoint
$repo = "ahmadkarmi/trakr"
$apiUrl = "https://api.github.com/repos/$repo/pulls"

# Check if GitHub token is available
$token = $env:GITHUB_TOKEN
if (-not $token) {
    $token = $env:GH_TOKEN
}

if ($token) {
    Write-Host "Creating PR via GitHub API..." -ForegroundColor Green
    
    $headers = @{
        "Accept" = "application/vnd.github+json"
        "Authorization" = "Bearer $token"
        "X-GitHub-Api-Version" = "2022-11-28"
    }
    
    $prData = @{
        title = $title
        body = $body
        base = $base
        head = $head
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $prData -ContentType "application/json"
        $prUrl = $response.html_url
        Write-Host "✅ PR created successfully!" -ForegroundColor Green
        Write-Host "Opening PR: $prUrl" -ForegroundColor Cyan
        Start-Process $prUrl
    }
    catch {
        Write-Host "❌ Failed to create PR via API: $_" -ForegroundColor Red
        Write-Host "Opening GitHub compare page instead..." -ForegroundColor Yellow
        Start-Process "https://github.com/$repo/compare/$base...$head"
    }
}
else {
    Write-Host "⚠️  No GitHub token found (GITHUB_TOKEN or GH_TOKEN)" -ForegroundColor Yellow
    Write-Host "Opening GitHub compare page - you'll need to create the PR manually" -ForegroundColor Yellow
    Start-Process "https://github.com/$repo/compare/$base...$head"
}
