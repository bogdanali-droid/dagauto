# DAG Auto - Migrare poze FTP -> R2
# Rulare: click dreapta -> "Run with PowerShell"

$FTP_HOST = "dagauto.ro"
$FTP_USER = "claude"
$FTP_PASS = "123Claude456+"
$SITE_URL = "https://dagauto.ro"
$TEMP_DIR = "$env:TEMP\dagauto-images"

Write-Host "=== DAG Auto - Migrare Poze ===" -ForegroundColor Cyan
Write-Host ""

# Creeaza folder temporar
if (!(Test-Path $TEMP_DIR)) {
    New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null
}

# Functie pentru listare FTP
function Get-FtpListing {
    param([string]$ftpPath)
    $request = [System.Net.FtpWebRequest]::Create("ftp://$FTP_HOST$ftpPath")
    $request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    $request.Credentials = New-Object System.Net.NetworkCredential($FTP_USER, $FTP_PASS)
    $request.UsePassive = $true
    $request.UseBinary = $true
    $request.KeepAlive = $false
    try {
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $listing = $reader.ReadToEnd()
        $reader.Close()
        $response.Close()
        return $listing -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }
    } catch {
        return @()
    }
}

# Functie pentru download FTP
function Download-FtpFile {
    param([string]$ftpPath, [string]$localPath)
    $request = [System.Net.FtpWebRequest]::Create("ftp://$FTP_HOST$ftpPath")
    $request.Method = [System.Net.WebRequestMethods+Ftp]::DownloadFile
    $request.Credentials = New-Object System.Net.NetworkCredential($FTP_USER, $FTP_PASS)
    $request.UsePassive = $true
    $request.UseBinary = $true
    $request.KeepAlive = $false
    try {
        $response = $request.GetResponse()
        $stream = $response.GetResponseStream()
        $fileStream = [System.IO.File]::Create($localPath)
        $stream.CopyTo($fileStream)
        $fileStream.Close()
        $stream.Close()
        $response.Close()
        return $true
    } catch {
        return $false
    }
}

# Gaseste toate imaginile din uploads
Write-Host "Caut imaginile pe FTP..." -ForegroundColor Yellow
$allImages = @()

$years = Get-FtpListing "/wp-content/uploads/"
foreach ($year in $years) {
    if ($year -match "^\d{4}$") {
        $months = Get-FtpListing "/wp-content/uploads/$year/"
        foreach ($month in $months) {
            if ($month -match "^\d{2}$") {
                $files = Get-FtpListing "/wp-content/uploads/$year/$month/"
                foreach ($file in $files) {
                    if ($file -match "\.(jpg|jpeg|png|webp|gif)$") {
                        $allImages += "/wp-content/uploads/$year/$month/$file"
                    }
                }
            }
        }
    }
}

Write-Host "Gasit $($allImages.Count) imagini." -ForegroundColor Green
Write-Host ""

if ($allImages.Count -eq 0) {
    Write-Host "Nu s-au gasit imagini pe FTP." -ForegroundColor Red
    Read-Host "Apasa Enter pentru a iesi"
    exit
}

# Descarca imaginile
Write-Host "Descarc imaginile..." -ForegroundColor Yellow
$downloaded = @()
$i = 0
foreach ($ftpPath in $allImages) {
    $i++
    $filename = Split-Path $ftpPath -Leaf
    $localPath = Join-Path $TEMP_DIR $filename
    Write-Progress -Activity "Descarc imagini" -Status "$i / $($allImages.Count): $filename" -PercentComplete (($i / $allImages.Count) * 100)

    if (Download-FtpFile $ftpPath $localPath) {
        $downloaded += $localPath
    } else {
        Write-Host "  Eroare: $filename" -ForegroundColor Red
    }
}
Write-Progress -Activity "Descarc imagini" -Completed
Write-Host "Descarcate: $($downloaded.Count) / $($allImages.Count)" -ForegroundColor Green
Write-Host ""

# Uploadeaza pe site in batch-uri de 10
Write-Host "Uploadeaza pe dagauto.ro..." -ForegroundColor Yellow
$ok = 0
$failed = 0
$batchSize = 10

for ($b = 0; $b -lt $downloaded.Count; $b += $batchSize) {
    $batch = $downloaded[$b..([Math]::Min($b + $batchSize - 1, $downloaded.Count - 1))]

    Write-Progress -Activity "Upload imagini" -Status "Batch $([Math]::Floor($b/$batchSize)+1): $b - $($b+$batch.Count) din $($downloaded.Count)" -PercentComplete (($b / $downloaded.Count) * 100)

    Add-Type -AssemblyName System.Net.Http
    $httpClient = New-Object System.Net.Http.HttpClient
    $content = New-Object System.Net.Http.MultipartFormDataContent

    foreach ($filePath in $batch) {
        $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
        $fileContent = New-Object System.Net.Http.ByteArrayContent($fileBytes)
        $filename = Split-Path $filePath -Leaf
        $content.Add($fileContent, "images", $filename)
    }

    try {
        $response = $httpClient.PostAsync("$SITE_URL/api/admin-upload-images", $content).Result
        $responseText = $response.Content.ReadAsStringAsync().Result
        $data = $responseText | ConvertFrom-Json
        $ok += $data.summary.ok
        $failed += $data.summary.errors + $data.summary.no_match
    } catch {
        $failed += $batch.Count
        Write-Host "  Eroare batch: $_" -ForegroundColor Red
    }

    $httpClient.Dispose()
}
Write-Progress -Activity "Upload imagini" -Completed

Write-Host ""
Write-Host "=== REZULTAT FINAL ===" -ForegroundColor Cyan
Write-Host "Migrate cu succes: $ok" -ForegroundColor Green
Write-Host "Esuate: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($ok -gt 0) {
    Write-Host "Pozele apar acum pe dagauto.ro!" -ForegroundColor Green
}

# Sterge fisierele temporare
Remove-Item $TEMP_DIR -Recurse -Force
Write-Host "Fisiere temporare sterse." -ForegroundColor Gray
Write-Host ""
Read-Host "Apasa Enter pentru a iesi"
