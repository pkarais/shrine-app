$icsUrl = "https://calendar.google.com/calendar/ical/polichronis369%40gmail.com/private-c86ce8ecd1880ea5b27d5c31a51e22f3/basic.ics"
$supabaseUrl = "https://eqgikumohnvgdkwlzkus.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZ2lrdW1vaG52Z2Rrd2x6a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2OTM3MCwiZXhwIjoyMDkwNjQ1MzcwfQ.3AqxcWNrCmQtTsnp_p3DGE0WfiiGSMIWTdc5LT05wAk"

$r = Invoke-WebRequest -Uri $icsUrl -UseBasicParsing
$ics = $r.Content
$lines = $ics -split "`n"

# Parse VEVENT blocks
$events = @()
$current = $null
foreach ($line in $lines) {
    $t = $line.Trim()
    if ($t -eq "BEGIN:VEVENT") { $current = @{}; continue }
    if ($t -eq "END:VEVENT") { if ($current -and $current.summary) { $events += $current }; $current = $null; continue }
    if (-not $current) { continue }
    
    if ($t -match "^DTSTART(?:;.*?)?:(.+)") { $current.start = $matches[1] }
    elseif ($t -match "^DTSTART;VALUE=DATE:(.+)") { $current.start = $matches[1]; $current.allday = $true }
    elseif ($t -match "^DTEND(?:;.*?)?:(.+)") { $current.end = $matches[1] }
    elseif ($t -match "^DTEND;VALUE=DATE:(.+)") { $current.end = $matches[1] }
    elseif ($t -match "^SUMMARY(?:;.*?)?:(.*)") { $current.summary = $matches[1].Replace('\,' , ',').Replace('\n', ' ').Replace('\;', ';') }
    elseif ($t -match "^UID(?:;.*?)?:(.+)") { $current.uid = $matches[1] }
    elseif ($t -match "^DESCRIPTION(?:;.*?)?:(.*)") { if ($current.desc) { $current.desc += "`n" + $matches[1] } else { $current.desc = $matches[1] } }
}

function Convert-IcsDate($val, $isAllday) {
    if (-not $val) { return $null }
    if ($isAllday) {
        if ($val -match "^(\d{4})(\d{2})(\d{2})$") { return [DateTime]::ParseExact($val, "yyyyMMdd", $null).ToString("yyyy-MM-ddTHH:mm:ssZ") }
    }
    if ($val -match "^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$") {
        return [DateTime]::ParseExact($val, "yyyyMMddTHHmmssZ", $null).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    # Handle TZID format: 20260520T183000
    if ($val -match "^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$") {
        return [DateTime]::ParseExact($val, "yyyyMMddTHHmmss", $null).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    return $val
}

Write-Host "Parsed $($events.Count) total events"

$headers = @{
    "apikey" = "sb_publishable_J6EGd-VCo21aHPJvnkFiHA_mGzjNLmN"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZ2lrdW1vaG52Z2Rrd2x6a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2OTM3MCwiZXhwIjoyMDkwNjQ1MzcwfQ.3AqxcWNrCmQtTsnp_p3DGE0WfiiGSMIWTdc5LT05wAk"
    "Content-Type" = "application/json"
}

$now = (Get-Date).ToString("yyyy-MM-dd")
$upcoming = $events | Where-Object { $_.start -and ($_.start -ge "2026-05-23" -or $_.start.Length -ge 8 -and [DateTime]::ParseExact($_.start.Substring(0,8), "yyyyMMdd", $null) -ge [DateTime]::ParseExact($now.Replace("-",""), "yyyyMMdd", $null)) }
Write-Host "Upcoming events: $($upcoming.Count)"

$synced = 0; $errors = 0; $skipped = 0
foreach ($ev in $upcoming) {
    $startIso = Convert-IcsDate $ev.start $ev.allday
    $endIso = Convert-IcsDate $ev.end $ev.allday
    
    if (-not $startIso) { $skipped++; continue }
    
    $body = @{
        title = $ev.summary.Substring(0, [Math]::Min(255, $ev.summary.Length))
        description = $ev.desc
        start_time = $startIso
        end_time = $endIso
        google_event_id = $ev.uid
        category = "standard"
        required_ops = 2
        required_security = 1
        required_greeter = 1
        director_mandatory = $false
    } | ConvertTo-Json -Compress -Depth 3
    
    try {
        $res = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/events" -Headers $headers -Body $body -UseBasicParsing -Method Post -ErrorAction Stop
        Write-Host "✓ $($ev.summary.Substring(0, [Math]::Min(60, $ev.summary.Length)))" -ForegroundColor Green
        $synced++
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 409) {
            Write-Host "↻ $($ev.summary.Substring(0, [Math]::Min(60, $ev.summary.Length))) (already exists)" -ForegroundColor Yellow
            $synced++
        } else {
            Write-Host "✗ $($ev.summary.Substring(0, [Math]::Min(60, $ev.summary.Length))): $($_.Exception.Message.Substring(0, [Math]::Min(80, $_.Exception.Message.Length)))" -ForegroundColor Red
            $errors++
        }
    }
}

Write-Host "`nDone: $synced imported, $errors errors, $skipped skipped" -ForegroundColor Cyan
