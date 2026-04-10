# DAG Auto - Migrare poze via WinSCP + upload R2
# Necesita WinSCP instalat (detectat automat)
# Click dreapta -> "Run with PowerShell"

$SITE_URL = "https://dagauto.ro"
$TEMP_DIR = "$env:TEMP\dagauto-images"

# Gaseste WinSCP
$winscpPaths = @(
    "C:\Program Files (x86)\WinSCP\WinSCPnet.dll",
    "C:\Program Files\WinSCP\WinSCPnet.dll",
    "$env:LOCALAPPDATA\Programs\WinSCP\WinSCPnet.dll"
)
$winscpDll = $winscpPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $winscpDll) {
    Write-Host "WinSCP nu a fost gasit. Incerc cu FTP nativ..." -ForegroundColor Yellow
    # Fallback: script WinSCP .txt
    $scriptPath = "$env:TEMP\winscp-script.txt"
    if (!(Test-Path $TEMP_DIR)) { New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null }
    @"
option batch abort
option confirm off
open ftp://claude:123Claude456+@dagauto.ro/
lcd "$TEMP_DIR"
cd /wp-content/uploads
get -r * .
close
exit
"@ | Set-Content $scriptPath

    $winscpExe = @(
        "C:\Program Files (x86)\WinSCP\WinSCP.com",
        "C:\Program Files\WinSCP\WinSCP.com"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($winscpExe) {
        Write-Host "Descarc cu WinSCP..." -ForegroundColor Yellow
        & $winscpExe /script=$scriptPath
    } else {
        Write-Host "WinSCP.com nu a fost gasit. Te rog instaleaza WinSCP de la https://winscp.net" -ForegroundColor Red
        Read-Host "Apasa Enter pentru a iesi"
        exit
    }
} else {
    # Foloseste WinSCP .NET assembly
    Add-Type -Path $winscpDll

    Write-Host "=== DAG Auto - Migrare Poze ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Conectare la FTP..." -ForegroundColor Yellow

    $sessionOptions = New-Object WinSCP.SessionOptions -Property @{
        Protocol   = [WinSCP.Protocol]::Ftp
        HostName   = "dagauto.ro"
        UserName   = "claude"
        Password   = "123Claude456+"
        FtpMode    = [WinSCP.FtpMode]::Passive
    }

    $session = New-Object WinSCP.Session
    try {
        $session.Open($sessionOptions)
        Write-Host "Conectat!" -ForegroundColor Green

        if (!(Test-Path $TEMP_DIR)) { New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null }

        Write-Host "Descarc toate imaginile din /wp-content/uploads/..." -ForegroundColor Yellow
        $transferOptions = New-Object WinSCP.TransferOptions
        $transferOptions.TransferMode = [WinSCP.TransferMode]::Binary

        $result = $session.GetFiles("/wp-content/uploads/*", "$TEMP_DIR\*", $false, $transferOptions)
        $result.Check()

        Write-Host "Descarcare completa!" -ForegroundColor Green
    } finally {
        $session.Dispose()
    }
}

# Numara fisierele descarcate
$imageFiles = Get-ChildItem $TEMP_DIR -Recurse -Include "*.jpg","*.jpeg","*.png","*.webp","*.gif"
Write-Host ""
Write-Host "Fisiere descarcate: $($imageFiles.Count)" -ForegroundColor Green
Write-Host ""

if ($imageFiles.Count -eq 0) {
    Write-Host "Nu s-au gasit imagini. Verifica FTP manual." -ForegroundColor Red
    Read-Host "Apasa Enter"
    exit
}

# Upload pe site in batch-uri de 10
Write-Host "Uploadeaza pe dagauto.ro in batches de 10..." -ForegroundColor Yellow
$ok = 0; $noMatch = 0; $errors = 0
$batchSize = 10
$allFiles = @($imageFiles)

Add-Type -AssemblyName System.Net.Http

for ($b = 0; $b -lt $allFiles.Count; $b += $batchSize) {
    $batch = $allFiles[$b..([Math]::Min($b + $batchSize - 1, $allFiles.Count - 1))]
    $pct = [Math]::Round(($b / $allFiles.Count) * 100)
    Write-Progress -Activity "Upload imagini" -Status "$b / $($allFiles.Count) ($pct%)" -PercentComplete $pct

    $httpClient = New-Object System.Net.Http.HttpClient
    $content = New-Object System.Net.Http.MultipartFormDataContent

    foreach ($file in $batch) {
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $fc = New-Object System.Net.Http.ByteArrayContent($bytes)
        $content.Add($fc, "images", $file.Name)
    }

    try {
        $response = $httpClient.PostAsync("$SITE_URL/api/admin-upload-images", $content).Result
        $json = $response.Content.ReadAsStringAsync().Result | ConvertFrom-Json
        $ok       += $json.summary.ok
        $noMatch  += $json.summary.no_match
        $errors   += $json.summary.errors
    } catch {
        $errors += $batch.Count
        Write-Host "  Eroare batch: $_" -ForegroundColor Red
    }
    $httpClient.Dispose()
}

Write-Progress -Activity "Upload imagini" -Completed

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host " REZULTAT FINAL" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host " Migrate:       $ok" -ForegroundColor Green
Write-Host " Fara potrivire: $noMatch" -ForegroundColor Yellow
Write-Host " Erori:         $errors" -ForegroundColor $(if ($errors -eq 0) { "Green" } else { "Red" })
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

if ($ok -gt 0) {
    Write-Host "Pozele apar acum pe dagauto.ro!" -ForegroundColor Green
}

Remove-Item $TEMP_DIR -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Fisiere temporare sterse." -ForegroundColor Gray
Write-Host ""
Read-Host "Apasa Enter pentru a iesi"
