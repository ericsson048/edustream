# =============================================================================
#  start-docker.ps1 — Démarre Edustream avec Docker Compose
# -----------------------------------------------------------------------------
#  Services :
#    web      Nginx (front Vite construit + proxy /api et /ws vers backend)
#             accessible sur http://IP_DE_LA_MACHINE:3000 depuis le Wi-Fi
#    backend  Django ASGI (Daphne) sur 8000
#    postgres PostgreSQL 16 (avec healthcheck)
#    redis    Redis 7 (sessions, cache, canaux websocket)
#
#  Résultat : les appareils du Wi-Fi ouvrent directement
#  http://IP_DE_LA_MACHINE:3000 (sans ngrok).
#
#  Usage :
#    .\start-docker.ps1               # build + démarrage
#    .\start-docker.ps1 -NoBuild      # démarrage seul (sans reconstruire)
#    .\start-docker.ps1 -ForceEnv     # réécrit .env.docker (secrets + IP)
# =============================================================================

[CmdletBinding()]
param(
    [switch]$NoBuild,
    [switch]$ForceEnv
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
function Write-Step([string]$msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "    $msg"   -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "    AVERTISSEMENT: $msg" -ForegroundColor Yellow }

function New-RandomString([int]$Length = 50) {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    $chars += '!@#$%^&*()-_=+[]{}'
    [byte[]]$bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    $sb = [System.Text.StringBuilder]::new()
    for ($i = 0; $i -lt $Length; $i++) {
        $idx = $bytes[$i] % $chars.Length   # portable (PS 5.1 / .NET Framework)
        [void]$sb.Append($chars[$idx])
    }
    return $sb.ToString()
}

# Teste si le daemon Docker répond. On relâche temporairement
# $ErrorActionPreference : sous PowerShell 5.1, la sortie stderr d'une commande
# native déclenche sinon une erreur bloquante quand le daemon est arrêté.
function Test-DockerDaemon {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        docker version --format '{{.Server.Version}}' 2>$null | Out-Null
        return ($LASTEXITCODE -eq 0)
    } finally {
        $ErrorActionPreference = $prev
    }
}

# -----------------------------------------------------------------------------
# Chemins
# -----------------------------------------------------------------------------
$Root       = Split-Path -Parent $MyInvocation.MyCommand.Path
$Compose    = Join-Path $Root 'compose.yaml'
$EnvFile    = Join-Path $Root '.env.docker'
$EnvExample = Join-Path $Root '.env.docker.example'

if (-not (Test-Path -LiteralPath $Compose)) {
    throw "compose.yaml introuvable dans $script:Root"
}

# -----------------------------------------------------------------------------
# 0. Vérifier Docker (et lancer Docker Desktop si le daemon est arrêté)
# -----------------------------------------------------------------------------
Write-Step "Vérification de Docker..."
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
    throw "docker n'est pas dans le PATH. Installez Docker Desktop puis relancez ce script."
}

if (-not (Test-DockerDaemon)) {
    Write-Warn "Le daemon Docker ne répond pas."
    Write-Step "Tentative d'ouverture de Docker Desktop..."
    $candidates = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
    )
    $dd = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($dd) {
        Start-Process -FilePath $dd
        Write-Ok "Docker Desktop lancé — attente du daemon..."
    } else {
        Write-Warn "Docker Desktop introuvable au chemin standard. Ouvrez-le manuellement."
    }
    $waited = 0
    $ready = $false
    do {
        Start-Sleep -Seconds 3
        $waited += 3
        if (Test-DockerDaemon) { $ready = $true; break }
        Write-Host ("    ...daemon pas encore prêt ({0}s)" -f $waited)
    } while ($waited -lt 240)
    if (-not $ready) {
        throw "Docker Desktop ne répond toujours pas après $waited secondes. Vérifiez Docker Desktop puis relancez."
    }
    Write-Ok "Docker OK (daemon disponible après $waited s)"
} else {
    Write-Ok "Docker OK (daemon disponible)"
}

# -----------------------------------------------------------------------------
# 1. Créer .env.docker s'il n'existe pas
# -----------------------------------------------------------------------------
$isNewFile = $false
if (-not (Test-Path -LiteralPath $EnvFile)) {
    Write-Step "Création de .env.docker..."
    if (-not (Test-Path -LiteralPath $EnvExample)) {
        throw ".env.docker.example introuvable dans $script:Root"
    }
    Copy-Item -LiteralPath $EnvExample -Destination $EnvFile
    Write-Ok ".env.docker créé depuis l'exemple"
    $isNewFile = $true
} else {
    Write-Ok ".env.docker déjà présent"
}

# -----------------------------------------------------------------------------
# 2. Générer des secrets si les placeholders sont encore présents
# -----------------------------------------------------------------------------
$lines = Get-Content -LiteralPath $EnvFile -Encoding UTF8
$needSecret = $false
$outLines = foreach ($line in $lines) {
    $m = [regex]::Match($line, '^(POSTGRES_PASSWORD|DJANGO_SECRET_KEY)=(.*)$')
    if ($m.Success -and ($m.Groups[2].Value -match 'replace-with')) {
        $needSecret = $true
        "$($m.Groups[1].Value)=$(New-RandomString 50)"
    } else {
        $line
    }
}
if ($needSecret) {
    Write-Step "Génération de secrets aléatoires (POSTGRES_PASSWORD, DJANGO_SECRET_KEY)..."
    Set-Content -LiteralPath $EnvFile -Value $outLines -Encoding UTF8
    Write-Ok "Secrets générés"
}

# -----------------------------------------------------------------------------
# 3. Détecter l'IP locale (Wi-Fi) et l'injecter si nécessaire
# -----------------------------------------------------------------------------
$ip = $null
try {
    $route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop |
        Sort-Object RouteMetric | Select-Object -First 1
    $cfg = Get-NetIPConfiguration -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue |
        Where-Object { $_.IPv4Address } | Select-Object -First 1
    if ($cfg) { $ip = ($cfg.IPv4Address | Select-Object -First 1).IPAddress }
} catch { $ip = $null }
if (-not $ip) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } |
        Select-Object -First 1).IPAddress
}
if (-not $ip) { $ip = '192.168.1.50' }

$out = Get-Content -LiteralPath $EnvFile -Encoding UTF8
$rewritten = ($isNewFile -or $ForceEnv) -and ($out -match '192\.168\.1\.50')
if ($rewritten) {
    Write-Step "IP détectée : $ip → injection dans .env.docker..."
    $out = foreach ($line in $out) {
        $line -replace '192\.168\.1\.50', $ip
    }
    Set-Content -LiteralPath $EnvFile -Value $out -Encoding UTF8
    Write-Ok ".env.docker mis à jour (ALLOWED_HOSTS / CORS / FRONTEND_BASE_URL)"
} else {
    Write-Ok "IP utilisée telle quelle dans .env.docker"
}

# -----------------------------------------------------------------------------
# 4. Construire puis démarrer
# -----------------------------------------------------------------------------
$composeArgs = @('compose', '--env-file', $EnvFile, '-f', $Compose)
if (-not $NoBuild) {
    Write-Step "Construction des images (web, backend)..."
    & docker @($composeArgs + @('build'))
    if ($LASTEXITCODE -ne 0) { throw "Échec de la construction des images." }
    Write-Ok "Images construites"
}

Write-Step "Démarrage des services (web, backend, postgres, redis)..."
& docker @($composeArgs + @('up', '-d'))
if ($LASTEXITCODE -ne 0) { throw "Échec du démarrage des services." }
Write-Ok "Services démarrés"

# -----------------------------------------------------------------------------
# 5. Récapitulatif
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Edustream est démarré !" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Ordinateur  : http://localhost:3000" -ForegroundColor White
Write-Host "  Wi-Fi       : http://$ip`:3000" -ForegroundColor White
Write-Host ""
Write-Host "  IP configurée dans .env.docker : $ip" -ForegroundColor DarkGray
Write-Host "  Pour la changer : modifiez DJANGO_ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS" -ForegroundColor DarkGray
Write-Host "  et FRONTEND_BASE_URL dans le fichier .env.docker." -ForegroundColor DarkGray