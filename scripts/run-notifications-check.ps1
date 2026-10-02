<#
.SYNOPSIS
    Triggers the IT Asset Manager's daily notification check (warranty_expiring, maintenance_due,
    and the retry of unsent notification emails).

.DESCRIPTION
    A thin trigger only: it POSTs to /api/cron/notifications-check with the shared secret and
    logs the JSON summary. All business logic lives in the Next.js app
    (lib/notifications/triggers.ts); never re-implement any of it here.

    The endpoint is idempotent. Running this twice, or manually after the scheduled run, creates
    no duplicate notifications (see notifications.dedupe_key) and only emails what is still unsent.

    Exit code 0 on success, 1 on any failure, so Task Scheduler's "Last Run Result" reflects it.
    Compatible with Windows PowerShell 5.1 and PowerShell 7+.

.PARAMETER AppUrl
    Base URL of the app, e.g. https://itam.internal.example. Defaults to $env:ITAM_APP_URL.

.PARAMETER SecretFile
    Path to a file whose only content is the app's CRON_SECRET value. Preferred over the
    environment variable because it can be locked down with an ACL (see setup below).
    Defaults to C:\ProgramData\ITAM\cron-secret.txt; if that file doesn't exist, the script falls
    back to $env:ITAM_CRON_SECRET.

.PARAMETER LogPath
    Log file. Defaults to C:\ProgramData\ITAM\logs\notifications-check.log. Rolled over to
    .log.old at 5 MB, so at most ~10 MB is kept.

.EXAMPLE
    .\run-notifications-check.ps1 -AppUrl https://itam.internal.example

.NOTES
    =====================================================================================
    ONE-TIME SETUP ON THE WINDOWS SERVER HOST (run in an elevated PowerShell)
    =====================================================================================

    1. Copy this script to a stable location, e.g. C:\ITAM\scripts\run-notifications-check.ps1
       (outside the app's deploy folder so a redeploy doesn't break the task, or inside it if
       deploys always keep the same path).

    2. Store the secret. It must equal CRON_SECRET in the app's .env. Only SYSTEM and
       Administrators may read the file:

         New-Item -ItemType Directory -Force C:\ProgramData\ITAM\logs | Out-Null
         Set-Content -Path C:\ProgramData\ITAM\cron-secret.txt -Value '<CRON_SECRET value>' -NoNewline -Encoding ascii
         icacls C:\ProgramData\ITAM\cron-secret.txt /inheritance:r /grant:r "SYSTEM:(R)" "Administrators:(F)"

       (Generate a strong value once with a CSPRNG:
         $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
        and put the same value in the app's .env as CRON_SECRET.)

    3. Test it by hand first:

         powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\ITAM\scripts\run-notifications-check.ps1 -AppUrl https://itam.internal.example
         Get-Content C:\ProgramData\ITAM\logs\notifications-check.log -Tail 5

    4. Register the daily task (07:00; warranty/maintenance alerts aren't minute-sensitive):

         $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
             -Argument '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "C:\ITAM\scripts\run-notifications-check.ps1" -AppUrl "https://itam.internal.example"'
         $trigger = New-ScheduledTaskTrigger -Daily -At 07:00
         $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
             -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
             -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 15)
         $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Limited
         Register-ScheduledTask -TaskName 'ITAM Notifications Check' -TaskPath '\ITAM\' `
             -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
             -Description 'Daily warranty/maintenance notification check for the IT Asset Manager (POST /api/cron/notifications-check).'

       -StartWhenAvailable runs a missed 07:00 (server off/rebooting) as soon as possible;
       -RestartCount/-RestartInterval retries if the app was down (the script exits 1).

    5. Verify:

         Start-ScheduledTask -TaskPath '\ITAM\' -TaskName 'ITAM Notifications Check'
         Get-ScheduledTaskInfo -TaskPath '\ITAM\' -TaskName 'ITAM Notifications Check'   # LastTaskResult 0 = success
         Get-Content C:\ProgramData\ITAM\logs\notifications-check.log -Tail 5

    To change the time:  Set-ScheduledTask -TaskPath '\ITAM\' -TaskName 'ITAM Notifications Check' -Trigger (New-ScheduledTaskTrigger -Daily -At 06:30)
    To remove:           Unregister-ScheduledTask -TaskPath '\ITAM\' -TaskName 'ITAM Notifications Check' -Confirm:$false

    HTTPS: if the app uses a certificate from an internal CA, import that CA into the machine's
    Trusted Root store rather than disabling certificate validation in this script.
    Record the deployed schedule (time, host, account) in the ops notes; the phase-7 skill
    documents 07:00 daily as the default.
#>
[CmdletBinding()]
param(
    [string]$AppUrl = $env:ITAM_APP_URL,
    [string]$SecretFile = 'C:\ProgramData\ITAM\cron-secret.txt',
    [string]$LogPath = 'C:\ProgramData\ITAM\logs\notifications-check.log'
)

$ErrorActionPreference = 'Stop'
$MaxLogBytes = 5MB

function Write-Log {
    param([string]$Level, [string]$Message)
    $line = '{0} [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    try {
        $dir = Split-Path -Parent $LogPath
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
        if ((Test-Path $LogPath) -and ((Get-Item $LogPath).Length -gt $MaxLogBytes)) {
            Move-Item -Force -Path $LogPath -Destination "$LogPath.old"
        }
        Add-Content -Path $LogPath -Value $line -Encoding utf8
    } catch {
        # Logging must never be the reason the check fails; fall back to the console.
        Write-Warning "Could not write log file: $($_.Exception.Message)"
    }
    Write-Output $line
}

try {
    if ([string]::IsNullOrWhiteSpace($AppUrl)) {
        throw 'No app URL: pass -AppUrl or set the ITAM_APP_URL environment variable.'
    }

    $secret = $null
    if ($SecretFile -and (Test-Path $SecretFile)) {
        $secret = (Get-Content -Path $SecretFile -Raw).Trim()
    } elseif ($env:ITAM_CRON_SECRET) {
        $secret = $env:ITAM_CRON_SECRET.Trim()
    }
    if ([string]::IsNullOrWhiteSpace($secret)) {
        throw "No cron secret: create $SecretFile or set the ITAM_CRON_SECRET environment variable."
    }

    # Windows PowerShell 5.1 may default to TLS 1.0/1.1, which modern servers refuse.
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

    $uri = '{0}/api/cron/notifications-check' -f $AppUrl.TrimEnd('/')
    Write-Log 'INFO' "POST $uri"

    $response = Invoke-RestMethod -Uri $uri -Method Post `
        -Headers @{ Authorization = "Bearer $secret" } `
        -ContentType 'application/json' -TimeoutSec 300

    $w = $response.warrantyExpiring
    $m = $response.maintenanceDue
    $e = $response.email
    Write-Log 'INFO' ("OK in {0} ms: warranty {1} matched / {2} new; maintenance {3} matched / {4} new; email configured={5}, sent to {6} of {7} recipient(s), {8} failed" -f `
        $response.durationMs, $w.matched, $w.created, $m.matched, $m.created, $e.configured, $e.sent, $e.recipients, $e.failed)
    if ($e.failed -gt 0) {
        Write-Log 'WARN' 'Some emails failed; they stay unsent and are retried on the next run. See the app server log for the Graph error.'
    }
    exit 0
} catch {
    $detail = $_.Exception.Message
    $webResponse = $_.Exception.Response
    if ($webResponse) {
        $status = [int]$webResponse.StatusCode
        $detail = "HTTP $status - $detail"
        if ($status -eq 401) { $detail += ' (secret does not match the app''s CRON_SECRET)' }
        if ($status -eq 503) { $detail += ' (CRON_SECRET is not set in the app''s environment)' }
    }
    Write-Log 'ERROR' $detail
    exit 1
}
