$root = Split-Path (Split-Path $PSScriptRoot)
$script:failed = 0

function Check($label, $ok) {
    if ($ok) { Write-Host "[PASS] $label" -ForegroundColor Green }
    else { Write-Host "[FAIL] $label" -ForegroundColor Red; $script:failed++ }
}
function Info($text) { Write-Host "[INFO] $text" -ForegroundColor Yellow }
function Found($pattern, $items) { @($items | Select-String -Pattern $pattern).Count -gt 0 }

# ---------- Client code ----------
$clientSrc = Join-Path $root "client\src"
$js = Get-ChildItem $clientSrc -Recurse -Include *.js, *.jsx -File

Check "React code never uses dangerouslySetInnerHTML" (-not (Found 'dangerouslySetInnerHTML' $js))
Check "No innerHTML, eval or new Function in client code" (-not (Found 'innerHTML|\beval\(|new Function\(' $js))
Check "No console.log left in client code" (-not (Found 'console\.log' $js))
Check "No secret-looking names in client code" (-not (Found 'DB_PASS|DB_USER|JWT_SECRET|PRIVATE_KEY|SECRET_KEY|api[_-]?key' $js))

$storage = @($js | Select-String -Pattern 'localStorage|sessionStorage|indexedDB')
$badStorage = @($storage | Where-Object { $_.Path -notmatch 'ThemeContext\.jsx$' })
Check "Browser storage is used only by ThemeContext (theme choice)" ($badStorage.Count -eq 0)
foreach ($s in $badStorage) { Info "Storage use: $($s.Filename):$($s.LineNumber)" }

$viteVars = @($js | Select-String -Pattern 'import\.meta\.env')
foreach ($v in $viteVars) { Info "Env variable used in client: $($v.Filename):$($v.LineNumber) (anything VITE_ is public)" }

$clientEnv = Get-ChildItem (Join-Path $root "client") -Filter ".env*" -Force -File -ErrorAction SilentlyContinue
foreach ($f in $clientEnv) { Info "Client env file found: $($f.Name). It must contain no secrets." }

$dist = Join-Path $root "client\dist"
if (Test-Path $dist) {
    $built = Get-ChildItem $dist -Recurse -File
    Check "Built client bundle contains no DB credentials" (-not (Found 'DB_PASS|taskflow_user' $built))
} else {
    Info "client\dist not found. Run 'npm run build' in client and run this script again."
}

# ---------- PHP code ----------
$php = Get-ChildItem (Join-Path $root "server\src"), (Join-Path $root "server\public") -Recurse -Include *.php -File

Check "No debug output (var_dump, print_r, phpinfo) in PHP code" (-not (Found '\b(var_dump|print_r|phpinfo|var_export)\s*\(' $php))
Check "No development login shortcut left" (-not (Found 'X-DEV-USER|HTTP_X_DEV_USER|dev@taskflow' $php))
Check "display_errors is never turned on" (-not (Found "display_errors',\s*'1'" $php))
Check "No wildcard CORS header" (-not (Found 'Allow-Origin:\s*\*' $php))
Check "No md5 or sha1 used" (-not (Found '\b(md5|sha1)\s*\(' $php))
Check "No direct use of GET, POST, REQUEST or COOKIE superglobals" (-not (Found '\$_(GET|POST|REQUEST|COOKIE)\b' $php))
Check "No password or token passed to error_log" (-not (Found 'error_log\(.*(password|token|\$_SESSION)' $php))

Info "Review these lines by hand. Each must contain fixed text only, never user input:"
foreach ($l in @($php | Select-String -Pattern '->(query|exec)\(')) {
    Info "  $($l.Filename):$($l.LineNumber)  $($l.Line.Trim())"
}

# ---------- Secrets and git ----------
$giPath = Join-Path $root ".gitignore"
if (Test-Path $giPath) {
    $gi = Get-Content $giPath | ForEach-Object { $_.Trim() }
    foreach ($entry in @(".env", ".env.*", "!.env.example", "node_modules/", "vendor/", "server/database/setup.sql")) {
        Check ".gitignore contains '$entry'" ($gi -contains $entry)
    }
} else {
    Check ".gitignore exists" $false
}

$example = Join-Path $root "server\.env.example"
if (Test-Path $example) {
    Check ".env.example holds only the placeholder password" ((Get-Content $example -Raw) -match 'DB_PASS=change_me')
}

$envFile = Join-Path $root "server\.env"
if (Test-Path $envFile) {
    $appEnv = (Get-Content $envFile | Where-Object { $_ -match '^APP_ENV=' }) -join ""
    Info "Your local server\.env has $appEnv. It must be APP_ENV=production on a live server."
}

$git = Get-Command git -ErrorAction SilentlyContinue
if ($git -and (Test-Path (Join-Path $root ".git"))) {
    $tracked = @(git -C $root ls-files)
    $trackedSecrets = @($tracked | Where-Object { $_ -match '(^|/)\.env' -and $_ -notmatch '\.example$' })
    Check "No real .env file is tracked by git" ($trackedSecrets.Count -eq 0)
    Check "setup.sql (has the DB password) is not tracked by git" (@($tracked | Where-Object { $_ -match 'setup\.sql$' }).Count -eq 0)
    Check "node_modules and vendor are not tracked by git" (@($tracked | Where-Object { $_ -match '(^|/)(node_modules|vendor)/' }).Count -eq 0)

    $past = @(git -C $root log --all --pretty=format:%h -- server/.env server/database/setup.sql)
    Check "Secret files were never committed in the past" ($past.Count -eq 0)
    if ($past.Count -gt 0) { Info "They were committed earlier. Change those passwords now; deleting the file is not enough." }
} else {
    Info "Not a git repository (or git is missing): the git checks were skipped."
}

Write-Host ""
if ($script:failed -eq 0) { Write-Host "All checks passed." -ForegroundColor Green }
else { Write-Host "$($script:failed) check(s) FAILED." -ForegroundColor Red }