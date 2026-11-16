$Base = "http://localhost:8000"
$ClientOrigin = "http://localhost:5173"
$Mysql = "C:\xampp\mysql\bin\mysql.exe"
$script:failed = 0

function Call($Session, $Method, $Path, $Body = $null, $Csrf = $null, $Orig = $ClientOrigin, $ContentType = "application/json") {
    $headers = @{}
    if ($Orig) { $headers["Origin"] = $Orig }
    if ($Csrf) { $headers["X-CSRF-Token"] = $Csrf }
    $p = @{ Uri = "$Base$Path"; Method = $Method; Headers = $headers; WebSession = $Session; UseBasicParsing = $true }
    if ($null -ne $Body) {
        $p.Body = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 5 }
        $p.ContentType = $ContentType
    }
    $setCookie = ""
    try {
        $r = Invoke-WebRequest @p
        $code = [int]$r.StatusCode
        $text = $r.Content
        try { $setCookie = [string]$r.Headers["Set-Cookie"] } catch {}
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
        try { $setCookie = [string]$_.Exception.Response.Headers["Set-Cookie"] } catch {}
    }
    $json = $null
    if ($text) { try { $json = $text | ConvertFrom-Json } catch {} }
    [pscustomobject]@{ Code = $code; Json = $json; Text = [string]$text; SetCookie = $setCookie }
}

function Check($label, $ok) {
    if ($ok) { Write-Host "[PASS] $label" -ForegroundColor Green }
    else { Write-Host "[FAIL] $label" -ForegroundColor Red; $script:failed++ }
}

function NewSession { New-Object Microsoft.PowerShell.Commands.WebRequestSession }

function SidOf($s) {
    $c = $s.Cookies.GetCookies([uri]$Base) | Where-Object { $_.Name -eq "taskflow_sid" }
    if ($c) { return $c.Value }
    return $null
}

function Db($sql) {
    & $Mysql -u root -D taskflow -e $sql 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Host "WARNING: could not run SQL as root: $sql" -ForegroundColor Yellow }
}

Db "DELETE FROM rate_limits; DELETE FROM users WHERE email LIKE 'authtest_%@example.test';"

$sfx = Get-Random
$emailA = "authtest_a_$sfx@example.test"
$emailB = "authtest_b_$sfx@example.test"
$pw = "Str0ng-Passw0rd!"

# ---------- Anonymous ----------
$anon = NewSession
$r = Call $anon GET "/api/tasks"
Check "Anonymous cannot list tasks (401)" ($r.Code -eq 401)
$r = Call $anon GET "/api/auth/me"
Check "Anonymous /me gives 401" ($r.Code -eq 401)
$r = Call $anon POST "/api/tasks" @{ title = "x" }
Check "POST without CSRF token rejected (403)" ($r.Code -eq 403)

$r = Call $anon GET "/api/auth/csrf"
$tokAnon = $r.Json.csrfToken
Check "CSRF endpoint returns a token" ($r.Code -eq 200 -and $tokAnon.Length -eq 64)

$body = @{ name = "Auth Test"; email = "authtest_x_$sfx@example.test"; password = $pw }
$r = Call $anon POST "/api/auth/register" $body "wrong-token"
Check "Register with wrong CSRF token rejected (403)" ($r.Code -eq 403)
$r = Call $anon POST "/api/auth/register" $body $tokAnon "http://evil.example"
Check "Register from foreign Origin rejected (403)" ($r.Code -eq 403)

# ---------- Register A ----------
$A = NewSession
$r = Call $A GET "/api/auth/csrf"
$csrfA0 = $r.Json.csrfToken
$sidBefore = SidOf $A

$r = Call $A POST "/api/auth/register" @{ name = "Auth Test A"; email = $emailA; password = $pw } $csrfA0
Check "Register returns 201" ($r.Code -eq 201 -and $r.Json.user.email -eq $emailA)
Check "Response has no password data" ($r.Text -notmatch "password")
Check "Session cookie is HttpOnly and has SameSite" ($r.SetCookie -match "HttpOnly" -and $r.SetCookie -match "SameSite")
$idA = $r.Json.user.id
$tokA = $r.Json.csrfToken
$sidAfter = SidOf $A
Check "Session ID changed after login (fixation protection)" ($sidBefore -and $sidAfter -and ($sidBefore -ne $sidAfter))
Check "CSRF token rotated after login" ($tokA -and $tokA -ne $csrfA0)

# ---------- Register validation ----------
$r = Call $A POST "/api/auth/register" @{ name = "Short"; email = "authtest_s_$sfx@example.test"; password = "short" } $tokA
Check "Short password rejected (422)" ($r.Code -eq 422)
$r = Call $A POST "/api/auth/register" @{ name = "Bad Email"; email = "not-an-email"; password = $pw } $tokA
Check "Bad email rejected (422)" ($r.Code -eq 422)
$r = Call $A POST "/api/auth/register" @{ name = "Long Pw"; email = "authtest_l_$sfx@example.test"; password = ("a" * 73) } $tokA
Check "73-byte password rejected (422)" ($r.Code -eq 422)
$r = Call $A POST "/api/auth/register" @{ name = @("x"); email = "authtest_n_$sfx@example.test"; password = $pw } $tokA
Check "Non-text name rejected (422, no crash)" ($r.Code -eq 422)
$r = Call $A POST "/api/auth/register" @{ name = "Dup"; email = $emailA; password = $pw } $tokA
Check "Duplicate email rejected (409)" ($r.Code -eq 409)

# ---------- Me ----------
$r = Call $A GET "/api/auth/me"
Check "/me returns my user" ($r.Code -eq 200 -and $r.Json.user.email -eq $emailA)

# ---------- Task as A ----------
$r = Call $A POST "/api/tasks" @{ title = "A private task" } $tokA
Check "Logged-in user can create a task (201)" ($r.Code -eq 201)
$taskId = $r.Json.task.id

# ---------- Register B and IDOR ----------
$B = NewSession
$r = Call $B GET "/api/auth/csrf"
$csrfB0 = $r.Json.csrfToken
$r = Call $B POST "/api/auth/register" @{ name = "Auth Test B"; email = $emailB; password = $pw } $csrfB0
Check "Second user registered" ($r.Code -eq 201)
$idB = $r.Json.user.id
$tokB = $r.Json.csrfToken

$r = Call $B GET "/api/tasks/$taskId"
Check "User B CANNOT read A's task (404)" ($r.Code -eq 404)
$r = Call $B GET "/api/tasks"
Check "User B's list does not contain A's task" ($r.Code -eq 200 -and (@($r.Json.tasks | Where-Object { $_.id -eq $taskId }).Count -eq 0))
$r = Call $B PUT "/api/tasks/$taskId" @{ title = "hacked" } $tokB
Check "User B CANNOT update A's task (404)" ($r.Code -eq 404)
$r = Call $B DELETE "/api/tasks/$taskId" $null $tokB
Check "User B CANNOT delete A's task (404)" ($r.Code -eq 404)
$r = Call $A PUT "/api/tasks/$taskId" @{ status = "completed"; userId = $idB } $tokA
Check "A updates own task; userId in body ignored" ($r.Code -eq 200 -and $r.Json.task.status -eq "completed")
$r = Call $B GET "/api/tasks/$taskId"
Check "Task still invisible to B after mass-assignment attempt" ($r.Code -eq 404)
$r = Call $A GET "/api/tasks/$taskId"
Check "A still owns the task" ($r.Code -eq 200 -and $r.Json.task.title -eq "A private task")

# ---------- Login ----------
$C = NewSession
$r = Call $C GET "/api/auth/csrf"
$tokC = $r.Json.csrfToken

$r = Call $C POST "/api/auth/login" @{ email = $emailA; password = "wrong-password" } $tokC
Check "Wrong password gives 401" ($r.Code -eq 401)
$msgWrong = $r.Json.message
$r = Call $C POST "/api/auth/login" @{ email = "authtest_nobody_$sfx@example.test"; password = "whatever123" } $tokC
Check "Unknown email gives 401" ($r.Code -eq 401)
Check "Same message for wrong password and unknown email" ($msgWrong -and $r.Json.message -eq $msgWrong)
$r = Call $C POST "/api/auth/login" @{ email = @("x"); password = "whatever123" } $tokC
Check "Non-text login input rejected (422, no crash)" ($r.Code -eq 422)

$r = Call $C POST "/api/auth/login" @{ email = $emailA.ToUpper(); password = $pw } $tokC
Check "Correct login works (email case-insensitive)" ($r.Code -eq 200 -and $r.Json.user.id -eq $idA)
$r = Call $C GET "/api/tasks/$taskId"
Check "Second session of A can read A's task" ($r.Code -eq 200)

# ---------- Logout and server-side invalidation ----------
$oldSid = SidOf $A
$r = Call $A POST "/api/auth/logout" $null $tokA
Check "Logout returns 200" ($r.Code -eq 200)
$r = Call $A GET "/api/tasks"
Check "After logout the session is rejected (401)" ($r.Code -eq 401)

$replay = NewSession
$replay.Cookies.Add([uri]$Base, (New-Object System.Net.Cookie("taskflow_sid", $oldSid, "/")))
$r = Call $replay GET "/api/auth/me"
Check "Replaying the old cookie after logout fails (401)" ($r.Code -eq 401)

$forged = NewSession
$forged.Cookies.Add([uri]$Base, (New-Object System.Net.Cookie("taskflow_sid", "forgedsessionid1234567890", "/")))
$r = Call $forged GET "/api/tasks"
Check "Forged session cookie rejected (401)" ($r.Code -eq 401)

$r = Call $B GET "/api/auth/me"
Check "Other users stay logged in after A logs out" ($r.Code -eq 200)

# ---------- Brute force ----------
$D = NewSession
$r = Call $D GET "/api/auth/csrf"
$tokD = $r.Json.csrfToken
$codes = @()
1..6 | ForEach-Object {
    $x = Call $D POST "/api/auth/login" @{ email = $emailA; password = "guess-$_" } $tokD
    $codes += $x.Code
}
Check "First 5 wrong guesses give 401" (($codes[0..4] | Where-Object { $_ -ne 401 }).Count -eq 0)
Check "6th guess is blocked (429)" ($codes[5] -eq 429)
$r = Call $D POST "/api/auth/login" @{ email = $emailA; password = $pw } $tokD
Check "Even the correct password is blocked while locked (429)" ($r.Code -eq 429)

# ---------- Cleanup ----------
Db "DELETE FROM rate_limits; DELETE FROM users WHERE email LIKE 'authtest_%@example.test';"

Write-Host ""
if ($script:failed -eq 0) { Write-Host "All checks passed." -ForegroundColor Green }
else { Write-Host "$($script:failed) check(s) FAILED." -ForegroundColor Red }