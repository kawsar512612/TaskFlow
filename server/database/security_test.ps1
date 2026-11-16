$Base = "http://localhost:8000"
$ClientOrigin = "http://localhost:5173"
$Mysql = "C:\xampp\mysql\bin\mysql.exe"
$ServerDir = Split-Path $PSScriptRoot
$script:failed = 0
$script:skipped = 0

# ---------------- helpers ----------------
function ToHash($h) {
    $out = @{}
    if ($null -eq $h) { return $out }
    $keys = if ($h.PSObject.Properties.Name -contains 'AllKeys') { $h.AllKeys } else { $h.Keys }
    foreach ($k in $keys) { $out[([string]$k).ToLower()] = [string]$h[$k] }
    return $out
}

function Call($Session, $Method, $Path, $Body = $null, $Csrf = $null, $Orig = $ClientOrigin, $ContentType = "application/json", $BaseUrl = $Base) {
    $headers = @{}
    if ($Orig) { $headers["Origin"] = $Orig }
    if ($Csrf) { $headers["X-CSRF-Token"] = $Csrf }
    $p = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = $headers; UseBasicParsing = $true }
    if ($Session) { $p.WebSession = $Session }
    if ($null -ne $Body) {
        if ($Body -is [byte[]]) { $p.Body = $Body }
        else {
            $text = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 5 }
            $p.Body = [Text.Encoding]::UTF8.GetBytes($text)
        }
        $p.ContentType = $ContentType
    }
    $hdr = @{}
    try {
        $r = Invoke-WebRequest @p
        $code = [int]$r.StatusCode
        $text = $r.Content
        $hdr = ToHash $r.Headers
    } catch {
        if ($null -eq $_.Exception.Response) { throw }
        $code = [int]$_.Exception.Response.StatusCode
        $text = $_.ErrorDetails.Message
        if (-not $text) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $text = $reader.ReadToEnd()
            } catch {}
        }
        $hdr = ToHash $_.Exception.Response.Headers
    }
    $json = $null
    if ($text) { try { $json = $text | ConvertFrom-Json } catch {} }
    [pscustomobject]@{ Code = $code; Json = $json; Text = [string]$text; Hdr = $hdr }
}

function Check($label, $ok) {
    if ($ok) { Write-Host "[PASS] $label" -ForegroundColor Green }
    else { Write-Host "[FAIL] $label" -ForegroundColor Red; $script:failed++ }
}
function Skip($label) { Write-Host "[SKIP] $label" -ForegroundColor Yellow; $script:skipped++ }
function Section($title) { Write-Host ""; Write-Host "== $title ==" -ForegroundColor Cyan }

function NewSession { New-Object Microsoft.PowerShell.Commands.WebRequestSession }
function SidOf($s) {
    $c = $s.Cookies.GetCookies([uri]$Base) | Where-Object { $_.Name -eq "taskflow_sid" }
    if ($c) { return $c.Value }
    return $null
}
function SetCookie($s, $value) {
    $s.Cookies.Add([uri]$Base, (New-Object System.Net.Cookie("taskflow_sid", $value, "/")))
}

function Db($sql) {
    & $Mysql -u root -D taskflow -e $sql 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Host "WARNING: could not run SQL as root: $sql" -ForegroundColor Yellow }
}

function StartServer($port, $envVars) {
    $saved = @{}
    foreach ($k in $envVars.Keys) {
        $saved[$k] = [Environment]::GetEnvironmentVariable($k, "Process")
        [Environment]::SetEnvironmentVariable($k, [string]$envVars[$k], "Process")
    }
    try {
        $proc = Start-Process -FilePath "php" -ArgumentList @("-S", "localhost:$port", "-t", "public", "public/index.php") `
            -WorkingDirectory $ServerDir -WindowStyle Hidden -PassThru
    } finally {
        foreach ($k in $saved.Keys) { [Environment]::SetEnvironmentVariable($k, $saved[$k], "Process") }
    }
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 250
        try {
            Invoke-WebRequest "http://localhost:$port/api/health" -UseBasicParsing | Out-Null
            return $proc
        } catch {
            if ($null -ne $_.Exception.Response) { return $proc }   # any HTTP answer means it is up
        }
    }
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    return $null
}

$sfx = Get-Random
$pw = "Str0ng-Passw0rd!"

function NewUser($label) {
    $s = NewSession
    $t = (Call $s GET "/api/auth/csrf").Json.csrfToken
    $email = "sectest_${label}_$sfx@example.test"
    $r = Call $s POST "/api/auth/register" @{ name = "Sec $label"; email = $email; password = $pw } $t
    [pscustomobject]@{ S = $s; Token = $r.Json.csrfToken; Id = $r.Json.user.id; Email = $email; Code = $r.Code }
}

function LoginOn($url, $email) {
    $s = NewSession
    $t = (Call -Session $s -Method GET -Path "/api/auth/csrf" -BaseUrl $url).Json.csrfToken
    $r = Call -Session $s -Method POST -Path "/api/auth/login" -Body @{ email = $email; password = $pw } -Csrf $t -BaseUrl $url
    [pscustomobject]@{ S = $s; Token = $r.Json.csrfToken; Code = $r.Code }
}

Db "DELETE FROM rate_limits; DELETE FROM users WHERE email LIKE 'sectest_%@example.test';"

# ---------------- 1. Headers and CORS ----------------
Section "1. Security headers and CORS"
$anon = NewSession
$r = Call $anon GET "/api/health"
Check "X-Content-Type-Options is nosniff" ($r.Hdr["x-content-type-options"] -eq "nosniff")
Check "X-Frame-Options is DENY" ($r.Hdr["x-frame-options"] -eq "DENY")
Check "Referrer-Policy is no-referrer" ($r.Hdr["referrer-policy"] -eq "no-referrer")
Check "CSP blocks everything by default" ($r.Hdr["content-security-policy"] -match "default-src 'none'")
Check "Permissions-Policy is set" ($r.Hdr["permissions-policy"] -match "camera=\(\)")
Check "Responses are not cacheable (no-store)" ($r.Hdr["cache-control"] -match "no-store")
Check "X-Powered-By is not sent" (-not $r.Hdr.ContainsKey("x-powered-by"))
Check "Responses are JSON" ($r.Hdr["content-type"] -match "application/json")

$r = Call $anon GET "/api/health" $null $null "http://evil.example"
Check "Foreign origin gets no CORS permission" (-not $r.Hdr.ContainsKey("access-control-allow-origin"))
$r = Call $anon GET "/api/health"
Check "Our frontend origin is allowed, exactly (not wildcard)" ($r.Hdr["access-control-allow-origin"] -eq $ClientOrigin)
Check "Credentials allowed only for our origin" ($r.Hdr["access-control-allow-credentials"] -eq "true")
$r = Call $anon OPTIONS "/api/tasks" $null $null "http://evil.example"
Check "Preflight from foreign origin is rejected (403)" ($r.Code -eq 403)
$r = Call $anon OPTIONS "/api/tasks"
Check "Preflight from our origin is accepted (204) and allows the CSRF header" ($r.Code -eq 204 -and $r.Hdr["access-control-allow-headers"] -match "X-CSRF-Token")

# ---------------- 2. Unauthorized access ----------------
Section "2. Unauthorized access"
$targets = @(
    @("GET", "/api/tasks"), @("GET", "/api/tasks/1"), @("GET", "/api/categories"),
    @("GET", "/api/stats"), @("GET", "/api/auth/me")
)
foreach ($t in $targets) {
    $r = Call $anon $t[0] $t[1]
    Check "Anonymous $($t[0]) $($t[1]) gives 401" ($r.Code -eq 401)
}
$tAnon = (Call $anon GET "/api/auth/csrf").Json.csrfToken
$unsafe = @(
    @{ M = "POST";   P = "/api/tasks";        B = @{ title = "x" } },
    @{ M = "PUT";    P = "/api/tasks/1";      B = @{ title = "x" } },
    @{ M = "PATCH";  P = "/api/tasks/1";      B = @{ title = "x" } },
    @{ M = "DELETE"; P = "/api/tasks/1";      B = $null },
    @{ M = "POST";   P = "/api/categories";   B = @{ name = "x" } },
    @{ M = "DELETE"; P = "/api/categories/1"; B = $null }
)
foreach ($u in $unsafe) {
    $r = Call $anon $u.M $u.P $u.B $tAnon
    Check "Anonymous $($u.M) $($u.P) with a valid CSRF token still gives 401" ($r.Code -eq 401)
}

# ---------------- users ----------------
$A = NewUser "a"
$B = NewUser "b"
Check "Test users A and B registered" ($A.Code -eq 201 -and $B.Code -eq 201)

$r = Call $A.S POST "/api/tasks" @{ title = "A secret task" } $A.Token
$taskId = $r.Json.task.id
$r = Call $A.S POST "/api/categories" @{ name = "A-cat"; color = "#112233" } $A.Token
$catId = $r.Json.category.id
$r = Call $B.S POST "/api/tasks" @{ title = "B own task" } $B.Token
$bTaskId = $r.Json.task.id

# ---------------- 3. IDOR and authorization ----------------
Section "3. Access to other users' data (IDOR) and mass assignment"
$r = Call $B.S GET "/api/tasks/$taskId"
Check "B cannot read A's task (404)" ($r.Code -eq 404)
$r = Call $B.S PUT "/api/tasks/$taskId" @{ title = "hacked" } $B.Token
Check "B cannot update A's task (404)" ($r.Code -eq 404)
$r = Call $B.S PATCH "/api/tasks/$taskId" @{ status = "completed" } $B.Token
Check "B cannot patch A's task (404)" ($r.Code -eq 404)
$r = Call $B.S DELETE "/api/tasks/$taskId" $null $B.Token
Check "B cannot delete A's task (404)" ($r.Code -eq 404)
$r = Call $A.S GET "/api/tasks/$taskId"
Check "A's task is unchanged after B's attacks" ($r.Code -eq 200 -and $r.Json.task.title -eq "A secret task" -and $r.Json.task.status -eq "todo")

$r = Call $B.S GET "/api/tasks"
Check "B's task list never contains A's task" (@($r.Json.tasks | Where-Object { $_.id -eq $taskId }).Count -eq 0)
$r = Call $B.S GET "/api/categories"
Check "B's category list never contains A's category" (@($r.Json.categories | Where-Object { $_.id -eq $catId }).Count -eq 0)
$r = Call $B.S GET "/api/stats"
Check "B's statistics count only B's own tasks" ($r.Code -eq 200 -and $r.Json.stats.totals.total -eq 1)

$r = Call $B.S PATCH "/api/categories/$catId" @{ name = "hacked" } $B.Token
Check "B cannot rename A's category (404)" ($r.Code -eq 404)
$r = Call $B.S DELETE "/api/categories/$catId" $null $B.Token
Check "B cannot delete A's category (404)" ($r.Code -eq 404)
$r = Call $A.S GET "/api/categories"
Check "A's category is unchanged" (@($r.Json.categories | Where-Object { $_.id -eq $catId -and $_.name -eq "A-cat" }).Count -eq 1)

$r = Call $B.S POST "/api/tasks" @{ title = "steal"; categoryId = $catId } $B.Token
Check "B cannot create a task in A's category (422)" ($r.Code -eq 422)
$r = Call $B.S PATCH "/api/tasks/$bTaskId" @{ categoryId = $catId } $B.Token
Check "B cannot move own task into A's category (422)" ($r.Code -eq 422)

foreach ($bad in @("0", "-1", "99999999999", "1%20OR%201%3D1", "1;DROP%20TABLE%20tasks", "%27%20OR%20%271%27%3D%271", "$taskId.0", "$taskId%00")) {
    $r = Call $B.S GET "/api/tasks/$bad"
    Check "Odd task id '$bad' gives 404" ($r.Code -eq 404)
}

$r = Call $A.S POST "/api/tasks" @{ title = "mass"; userId = $B.Id; user_id = $B.Id; id = 999999; createdAt = "2000-01-01" } $A.Token
$massId = $r.Json.task.id
Check "Mass assignment: userId, id and createdAt in the body are ignored" ($r.Code -eq 201 -and $r.Json.task.id -ne 999999 -and $r.Json.task.createdAt -notmatch "^2000")
$r = Call $B.S GET "/api/tasks"
Check "Task created with userId=B is NOT visible to B" (@($r.Json.tasks | Where-Object { $_.id -eq $massId }).Count -eq 0)
$r = Call $A.S GET "/api/tasks/$massId"
Check "Task stays owned by A" ($r.Code -eq 200)
$r = Call $A.S PATCH "/api/categories/$catId" @{ name = "A-cat2"; userId = $B.Id } $A.Token
Check "Category update ignores userId" ($r.Code -eq 200)
$r = Call $B.S GET "/api/categories"
Check "Category is still invisible to B after that" (@($r.Json.categories | Where-Object { $_.id -eq $catId }).Count -eq 0)

$s = NewSession
$t = (Call $s GET "/api/auth/csrf").Json.csrfToken
$r = Call $s POST "/api/auth/register" @{ name = "Sec Mass"; email = "sectest_m_$sfx@example.test"; password = $pw; role = "admin"; isAdmin = $true } $t
$names = @($r.Json.user.PSObject.Properties.Name)
Check "Registration ignores role and isAdmin, and returns no password data" ($r.Code -eq 201 -and ($names -notcontains "role") -and ($names -notcontains "isAdmin") -and ($r.Text -notmatch "password"))

# ---------------- 4. Injection ----------------
Section "4. SQL / NoSQL-style injection"
$s = NewSession
$t = (Call $s GET "/api/auth/csrf").Json.csrfToken
$r = Call $s POST "/api/auth/login" '{"email":{"$ne":null},"password":{"$ne":null}}' $t
Check "Login with operator objects is rejected (422)" ($r.Code -eq 422)
$r = Call $s GET "/api/auth/me"
Check "...and does not log anyone in" ($r.Code -eq 401)
$r = Call $s POST "/api/auth/login" @{ email = "' OR '1'='1"; password = "' OR '1'='1" } $t
Check "Classic SQL injection in login gives 401, not a login" ($r.Code -eq 401)

$r = Call $A.S POST "/api/tasks" '{"title":{"$gt":""}}' $A.Token
Check "Operator object as title rejected (422)" ($r.Code -eq 422)
$r = Call $A.S POST "/api/tasks" '{"title":"x","priority":["high"]}' $A.Token
Check "Array as priority rejected (422)" ($r.Code -eq 422)
$r = Call $A.S POST "/api/tasks" '{"title":"x","categoryId":"1 OR 1=1"}' $A.Token
Check "SQL text as categoryId rejected (422)" ($r.Code -eq 422)
$r = Call $A.S POST "/api/tasks" '{"title":"x","tags":{"a":"b"}}' $A.Token
Check "Object as tags rejected (422)" ($r.Code -eq 422)
$r = Call $A.S POST "/api/tasks" '{"title":"x","dueDate":"2026-01-01'' OR ''1''=''1"}' $A.Token
Check "SQL text as date rejected (422)" ($r.Code -eq 422)

$evil = "x'; DROP TABLE tasks; --"
$r = Call $A.S POST "/api/tasks" @{ title = $evil } $A.Token
Check "SQL-looking title is stored as plain text" ($r.Code -eq 201 -and $r.Json.task.title -eq $evil)
$r = Call $A.S GET "/api/tasks"
Check "The tasks table still exists and works" ($r.Code -eq 200 -and @($r.Json.tasks).Count -ge 1)

# ---------------- 5. XSS ----------------
Section "5. Cross-site scripting"
$xss = "<img src=x onerror=alert(1)>"
$r = Call $A.S POST "/api/tasks" @{ title = $xss; description = "<script>alert(1)</script>" } $A.Token
Check "HTML is stored as text, not altered or run" ($r.Code -eq 201 -and $r.Json.task.title -eq $xss)
$r = Call $A.S GET "/api/tasks"
Check "API serves it as JSON with nosniff, so a browser cannot treat it as a page" ($r.Hdr["content-type"] -match "application/json" -and $r.Hdr["x-content-type-options"] -eq "nosniff")
Write-Host "   (Browser part is manual: see 'Manual checks', item 1)" -ForegroundColor DarkGray

# ---------------- 6. CSRF ----------------
Section "6. CSRF"
$r = Call $A.S POST "/api/tasks" @{ title = "csrf" }
Check "POST without CSRF token rejected (403)" ($r.Code -eq 403)
$r = Call $A.S POST "/api/tasks" @{ title = "csrf" } "wrong-token"
Check "POST with a wrong token rejected (403)" ($r.Code -eq 403)
$r = Call $A.S POST "/api/tasks" @{ title = "csrf" } $B.Token
Check "Another user's token does not work in my session (403)" ($r.Code -eq 403)
$r = Call $A.S POST "/api/tasks" @{ title = "csrf" } $A.Token "http://evil.example"
Check "Valid token from a foreign Origin rejected (403)" ($r.Code -eq 403)
$t = (Call $anon GET "/api/auth/csrf").Json.csrfToken
$r = Call $anon POST "/api/auth/login" @{ email = $A.Email; password = $pw } $t "null"
Check "Origin 'null' (sandboxed pages) rejected (403)" ($r.Code -eq 403)
$r = Call $A.S PATCH "/api/tasks/$taskId" @{ title = "csrf" }
Check "PATCH without token rejected (403)" ($r.Code -eq 403)
$r = Call $A.S DELETE "/api/tasks/$taskId"
Check "DELETE without token rejected (403)" ($r.Code -eq 403)
$r = Call $A.S GET "/api/tasks/$taskId"
Check "...and the task still exists unchanged" ($r.Code -eq 200 -and $r.Json.task.title -eq "A secret task")
$r = Call $A.S POST "/api/auth/logout"
Check "Logout without token rejected (403)" ($r.Code -eq 403)
$r = Call $A.S GET "/api/auth/me"
Check "...so the user is still logged in" ($r.Code -eq 200)
$r = Call $A.S POST "/api/tasks" @{ title = "ok" } $A.Token
Check "Valid token and our origin: accepted (201)" ($r.Code -eq 201)
$r = Call $A.S GET "/api/tasks"
Check "GET needs no token" ($r.Code -eq 200)

$A2 = LoginOn $Base $A.Email
$oldSid = SidOf $A2.S
$r = Call $A2.S POST "/api/auth/logout" $null $A2.Token
Check "Logout with a valid token works" ($r.Code -eq 200)
$r = Call $A2.S POST "/api/tasks" @{ title = "after logout" } $A2.Token
Check "Old token and cookie are useless after logout (401 or 403)" ($r.Code -eq 401 -or $r.Code -eq 403)

# ---------------- 7. Sessions ----------------
Section "7. Invalid sessions and session fixation"
foreach ($val in @("forged-session-id", ("a" * 300), "../../etc/passwd")) {
    $f = NewSession
    try {
        SetCookie $f $val
        $r = Call $f GET "/api/auth/me"
        Check "Forged cookie '$($val.Substring(0, [Math]::Min(18, $val.Length)))...' gives 401, no crash" ($r.Code -eq 401)
    } catch {
        Skip "Could not create test cookie '$val'"
    }
}

$chosen = "attackerchosensessionid0123456789"
$fx = NewSession
SetCookie $fx $chosen
$t = (Call $fx GET "/api/auth/csrf").Json.csrfToken
$r = Call $fx POST "/api/auth/login" @{ email = $A.Email; password = $pw } $t
Check "Login works from a session the attacker prepared" ($r.Code -eq 200)
Check "Server never keeps the session ID the attacker chose" ((SidOf $fx) -ne $chosen)
$atk = NewSession
SetCookie $atk $chosen
$r = Call $atk GET "/api/auth/me"
Check "Attacker's chosen session ID is not logged in (401)" ($r.Code -eq 401)

# ---------------- 8. Malicious input ----------------
Section "8. Malicious or unexpected input"
$deep = '{"title":"x","tags":' + ('[' * 20) + (']' * 20) + '}'
$r = Call $A.S POST "/api/tasks" $deep $A.Token
Check "Deeply nested JSON rejected (400)" ($r.Code -eq 400)
$r = Call $A.S POST "/api/tasks" ([byte[]](0x7B, 0x22, 0xFF, 0xFE, 0x22, 0x7D)) $A.Token
Check "Invalid UTF-8 bytes rejected (400)" ($r.Code -eq 400)
$r = Call $A.S POST "/api/tasks" "" $A.Token
Check "Empty body rejected (400 or 415)" ($r.Code -eq 400 -or $r.Code -eq 415)
foreach ($body in @("null", '"just a string"', "123", "[1,2,3]")) {
    $r = Call $A.S POST "/api/tasks" $body $A.Token
    Check "Non-object JSON '$body' rejected (400)" ($r.Code -eq 400)
}
$r = Call $A.S POST "/api/tasks" '{"title":123}' $A.Token
Check "Number as title rejected (422)" ($r.Code -eq 422)
$r = Call $A.S POST "/api/tasks" @{ title = "   " } $A.Token
Check "Whitespace-only title rejected (422)" ($r.Code -eq 422)
$r = Call $A.S POST "/api/tasks" @{ title = ("a" * 101) } $A.Token
Check "101-character title rejected (422)" ($r.Code -eq 422)
$r = Call $A.S POST "/api/tasks" '{"title":"x","categoryId":99999999999999999999}' $A.Token
Check "Huge number as categoryId rejected (422)" ($r.Code -eq 422)
$r = Call $A.S POST "/api/tasks" '{"title":"x","categoryId":-5}' $A.Token
Check "Negative categoryId rejected (422)" ($r.Code -eq 422)
$r = Call $A.S POST "/api/tasks" '{"title":"x","dueDate":"0000-00-00"}' $A.Token
Check "Date 0000-00-00 rejected (422)" ($r.Code -eq 422)
$r = Call $A.S POST "/api/tasks" '{"title":"x","dueDate":20261201}' $A.Token
Check "Number as date rejected (422)" ($r.Code -eq 422)

$emoji = [char]::ConvertFromUtf32(0x1F600)
$bn = -join @([char]0x0995, [char]0x09BE, [char]0x099C)
$uni = "Test $emoji $bn"
$r = Call $A.S POST "/api/tasks" @{ title = $uni } $A.Token
Check "Emoji and Bengali text are stored and returned correctly" ($r.Code -eq 201 -and $r.Json.task.title -eq $uni)

# ---------------- 9. Information disclosure ----------------
Section "9. Exposed files and error details"
foreach ($path in @("/.env", "/composer.json", "/composer.lock", "/src/Config/Env.php", "/vendor/autoload.php", "/database/schema.sql", "/database/setup.sql", "/public/index.php", "/.git/config")) {
    $r = Call $anon GET $path
    Check "$path is not exposed" ($r.Code -eq 404 -and $r.Text -notmatch 'DB_PASS|<\?php|CREATE TABLE|IDENTIFIED BY|\[core\]')
}
$r = Call $anon GET "/api/does-not-exist"
Check "Error responses do not leak file paths or stack traces" ($r.Code -eq 404 -and $r.Text -notmatch 'Stack trace|\.php|vendor|E:\\')
$r = Call $anon PUT "/api/tasks"
Check "Wrong method gives 405 without details" ($r.Code -eq 405 -and $r.Text -notmatch 'Stack trace|\.php')

# ---------------- 10. Registration flood ----------------
Section "10. Brute-force protection on registration"
$fl = NewSession
$tf = (Call $fl GET "/api/auth/csrf").Json.csrfToken
$flood = @()
$last = $null
foreach ($i in 1..14) {
    $last = Call $fl POST "/api/auth/register" @{ name = "x"; email = "bad"; password = "short" } $tf
    $flood += $last.Code
}
Check "First attempts are processed normally (422)" ($flood[0] -eq 422)
Check "Registration flood is blocked (429)" ($flood -contains 429)
Check "Blocked response tells the client when to retry" ($last.Code -eq 429 -and $last.Hdr.ContainsKey("retry-after"))
Write-Host "   (Login brute force is covered by auth_test.ps1)" -ForegroundColor DarkGray

# ---------------- 11. Extra servers ----------------
Section "11. Session expiry, limits, production behavior (temporary servers on ports 8001 to 8003)"

# --- 8001: development with short timeouts and tiny limits
$B1 = "http://localhost:8001"
$p1 = StartServer 8001 @{ SESSION_IDLE_TIMEOUT = "5"; SESSION_ABSOLUTE_TIMEOUT = "14"; MAX_TASKS_PER_USER = "3"; MAX_CATEGORIES_PER_USER = "3" }
if ($null -eq $p1) {
    Skip "Could not start the test server on port 8001 (port busy or php not in PATH). Limits and session expiry NOT verified."
} else {
    try {
        $L = LoginOn $B1 $A.Email
        Check "Login works on the test server" ($L.Code -eq 200)

        $have = @((Call -Session $L.S -Method GET -Path "/api/tasks" -BaseUrl $B1).Json.tasks).Count
        for ($i = $have; $i -lt 3; $i++) {
            Call -Session $L.S -Method POST -Path "/api/tasks" -Body @{ title = "fill $i" } -Csrf $L.Token -BaseUrl $B1 | Out-Null
        }
        $r = Call -Session $L.S -Method POST -Path "/api/tasks" -Body @{ title = "over the limit" } -Csrf $L.Token -BaseUrl $B1
        Check "Task limit enforced (403 with a clear message)" ($r.Code -eq 403 -and $r.Json.message -match "limit")

        $haveC = @((Call -Session $L.S -Method GET -Path "/api/categories" -BaseUrl $B1).Json.categories).Count
        for ($i = $haveC; $i -lt 3; $i++) {
            Call -Session $L.S -Method POST -Path "/api/categories" -Body @{ name = "fill-$i-$sfx" } -Csrf $L.Token -BaseUrl $B1 | Out-Null
        }
        $r = Call -Session $L.S -Method POST -Path "/api/categories" -Body @{ name = "over-$sfx" } -Csrf $L.Token -BaseUrl $B1
        Check "Category limit enforced (403 with a clear message)" ($r.Code -eq 403 -and $r.Json.message -match "limit")

        # absolute timeout: active every 4s (idle limit 5s), but the session must still end at 14s
        $T = LoginOn $B1 $A.Email
        $codes = @()
        foreach ($i in 1..3) {
            Start-Sleep -Seconds 4
            $codes += (Call -Session $T.S -Method GET -Path "/api/tasks/$taskId" -BaseUrl $B1).Code
        }
        Check "Activity keeps a session alive (3 requests 4s apart, idle limit 5s)" (@($codes | Where-Object { $_ -ne 200 }).Count -eq 0)
        Start-Sleep -Seconds 4
        $r = Call -Session $T.S -Method GET -Path "/api/tasks/$taskId" -BaseUrl $B1
        Check "Session ends at the absolute limit even though it was active 4s ago (401)" ($r.Code -eq 401)

        # idle timeout
        $I = LoginOn $B1 $A.Email
        Start-Sleep -Seconds 6
        $r = Call -Session $I.S -Method GET -Path "/api/tasks/$taskId" -BaseUrl $B1
        Check "Idle session expires after the idle limit (401)" ($r.Code -eq 401)
    } finally {
        Stop-Process -Id $p1.Id -Force -ErrorAction SilentlyContinue
    }
}

# --- 8002: production with a wrong database password
$B2 = "http://localhost:8002"
$p2 = StartServer 8002 @{ APP_ENV = "production"; DB_PASS = "definitely-wrong-password" }
if ($null -eq $p2) {
    Skip "Could not start the test server on port 8002. Production error hiding NOT verified."
} else {
    try {
        $r = Call -Session $null -Method GET -Path "/api/health" -BaseUrl $B2
        Check "Database failure gives a plain 500 in production" ($r.Code -eq 500 -and $r.Json.message -eq "Something went wrong")
        Check "...without database, file path or credential details" ($r.Text -notmatch 'SQLSTATE|Access denied|Database|taskflow|password|\.php|E:\\|vendor')
        Check "Production sends the HSTS header" ($r.Hdr["strict-transport-security"] -match "max-age")
    } finally {
        Stop-Process -Id $p2.Id -Force -ErrorAction SilentlyContinue
    }
}

# --- 8003: production with a tiny API rate limit
$B3 = "http://localhost:8003"
Db "DELETE FROM rate_limits;"
$p3 = StartServer 8003 @{ APP_ENV = "production"; API_RATE_LIMIT = "20" }
if ($null -eq $p3) {
    Skip "Could not start the test server on port 8003. General API rate limit NOT verified."
} else {
    try {
        $r = Call -Session $null -Method GET -Path "/api/auth/csrf" -BaseUrl $B3
        $cookie = $r.Hdr["set-cookie"]
        Check "Production session cookie is Secure, HttpOnly and SameSite" ($cookie -match "Secure" -and $cookie -match "HttpOnly" -and $cookie -match "SameSite")

        $codes = @()
        $lastRl = $null
        foreach ($i in 1..30) {
            $lastRl = Call -Session $null -Method GET -Path "/api/health" -BaseUrl $B3
            $codes += $lastRl.Code
        }
        $idx = [array]::IndexOf($codes, 429)
        Check "General API rate limit starts blocking after about 20 requests" ($idx -ge 15 -and $idx -le 20)
        Check "...and keeps blocking afterwards" ($idx -ge 0 -and @($codes[$idx..($codes.Count - 1)] | Where-Object { $_ -ne 429 }).Count -eq 0)
        Check "Blocked responses include Retry-After" ($lastRl.Code -eq 429 -and $lastRl.Hdr.ContainsKey("retry-after"))
    } finally {
        Stop-Process -Id $p3.Id -Force -ErrorAction SilentlyContinue
    }
}

# ---------------- cleanup ----------------
Db "DELETE FROM rate_limits; DELETE FROM users WHERE email LIKE 'sectest_%@example.test';"

Write-Host ""
if ($script:skipped -gt 0) {
    Write-Host "$($script:skipped) group(s) were SKIPPED. Skipped means NOT verified." -ForegroundColor Yellow
}
if ($script:failed -eq 0) { Write-Host "All checks passed." -ForegroundColor Green }
else { Write-Host "$($script:failed) check(s) FAILED." -ForegroundColor Red }