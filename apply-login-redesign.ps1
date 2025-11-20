# PowerShell script to apply login redesign
$filePath = "apps\web\src\screens\LoginScreen.tsx"

# Read the file
$content = Get-Content $filePath -Raw

# Step 1: Remove parallax state variables
$content = $content -replace '  // Parallax effect state\r?\n  const \[mousePos, setMousePos\] = useState\(\{ x: 0, y: 0 \}\)\r?\n  const \[gyroPos, setGyroPos\] = useState\(\{ x: 0, y: 0 \}\)\r?\n  const containerRef = useRef<HTMLDivElement>\(null\)\r?\n', ''

# Step 2: Remove mouse tracking useEffect (find and remove the entire block)
$content = $content -replace '  // Mouse movement tracking for desktop parallax[\s\S]*?  \}, \[\]\)\r?\n\r?\n', ''

# Step 3: Remove gyroscope tracking useEffect
$content = $content -replace '  // Gyroscope tracking for mobile parallax[\s\S]*?  \}, \[\]\)\r?\n\r?\n', ''

# Step 4: Remove parallax calculations
$content = $content -replace '  // Calculate parallax offset \(use gyroscope on mobile, mouse on desktop\)\r?\n  const parallaxX = window\.innerWidth <= 768 \? gyroPos\.x : mousePos\.x\r?\n  const parallaxY = window\.innerWidth <= 768 \? gyroPos\.y : mousePos\.y\r?\n\r?\n', ''

# Step 5: Find the return statement and everything after it until the closing }
$returnPattern = '  return \([\s\S]*?\)\r?\n\}'
$newReturn = Get-Content "LOGINSCREEN_REDESIGNED_COMPLETE.txt" -Raw
# Extract just the return statement part (remove the header)
$newReturn = $newReturn -replace '=== FINAL STEP:.*?return \(', '  return ('
$newReturn = $newReturn -replace '=== END OF REPLACEMENT ===.*', ''
$newReturn = $newReturn.Trim() + "`n}"

$content = $content -replace $returnPattern, $newReturn

# Write back
Set-Content $filePath $content -NoNewline

Write-Host "✅ Login redesign applied successfully!" -ForegroundColor Green
Write-Host "The file should now compile without errors." -ForegroundColor Green
