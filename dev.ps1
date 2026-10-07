# =============================================================================
#  dev.ps1 - Script de developpement EduStream
# =============================================================================
#  Usage :
#    .\dev.ps1 front    # Rebuild + redemarrage frontend seulement
#    .\dev.ps1 back     # Rebuild + redemarrage backend seulement
#    .\dev.ps1 all      # Rebuild complet (front + back + infra)
#    .\dev.ps1 stop     # Arrete tous les services
#    .\dev.ps1 logs     # Logs en temps reel (Ctrl+C pour quitter)
#    .\dev.ps1 logs front   # Logs du frontend seulement
#    .\dev.ps1 logs back    # Logs du backend seulement
#    .\dev.ps1 status   # Etat des conteneurs
#    .\dev.ps1 restart front|back|all   # Redemarrage sans rebuild
# =============================================================================

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('front', 'back', 'all', 'stop', 'logs', 'status', 'restart', '')]
    [string]$Action = '',

    [Parameter(Position = 1)]
    [string]$Target = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# --- Couleurs -----------------------------------------------------------------
function Write-Step([string]$msg)  { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)    { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn([string]$msg)  { Write-Host "    /!\ $msg" -ForegroundColor Yellow }
function Write-Info([string]$msg)  { Write-Host "    $msg" -ForegroundColor DarkGray }

# --- Chemins ------------------------------------------------------------------
$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$Compose = Join-Path $Root 'compose.yaml'
$EnvFile = Join-Path $Root '.env.docker'

if (-not (Test-Path -LiteralPath $Compose)) { throw "compose.yaml introuvable dans $Root" }
if (-not (Test-Path -LiteralPath $EnvFile)) {
    throw ".env.docker introuvable - lancez d'abord start-docker.ps1"
}

$base = @('compose', '--env-file', $EnvFile, '-f', $Compose)

# --- Menu interactif si aucun argument ----------------------------------------
if ($Action -eq '') {
    Write-Host ""
    Write-Host "  ===============================" -ForegroundColor Cyan
    Write-Host "   EduStream - Menu developpement" -ForegroundColor Cyan
    Write-Host "  ===============================" -ForegroundColor Cyan
    Write-Host "  [1] front   - Rebuild frontend"
    Write-Host "  [2] back    - Rebuild backend"
    Write-Host "  [3] all     - Rebuild complet"
    Write-Host "  [4] stop    - Arreter les services"
    Write-Host "  [5] logs    - Voir les logs"
    Write-Host "  [6] status  - Etat des conteneurs"
    Write-Host ""
    $choice = Read-Host "  Votre choix (1-6)"
    switch ($choice) {
        '1' { $Action = 'front' }
        '2' { $Action = 'back' }
        '3' { $Action = 'all' }
        '4' { $Action = 'stop' }
        '5' { $Action = 'logs' }
        '6' { $Action = 'status' }
        default { Write-Warn "Choix invalide."; exit 1 }
    }
}

# --- Actions ------------------------------------------------------------------
switch ($Action) {

    'front' {
        Write-Step "Rebuild du frontend..."
        & docker @($base + @('build', 'web'))
        if ($LASTEXITCODE -ne 0) { throw "Echec du build frontend." }
        Write-Ok "Image web reconstruite"

        & docker @($base + @('up', '-d', '--no-deps', 'web'))
        if ($LASTEXITCODE -ne 0) { throw "Echec du demarrage web." }
        Write-Ok "Frontend redémarre sur http://localhost:3000"
    }

    'back' {
        Write-Step "Rebuild du backend..."
        & docker @($base + @('build', 'backend'))
        if ($LASTEXITCODE -ne 0) { throw "Echec du build backend." }
        Write-Ok "Image backend reconstruite"

        & docker @($base + @('up', '-d', '--no-deps', 'backend'))
        if ($LASTEXITCODE -ne 0) { throw "Echec du demarrage backend." }
        Write-Ok "Backend redémarre sur http://localhost:8000"
    }

    'all' {
        Write-Step "Rebuild complet (front + back)..."
        & docker @($base + @('build'))
        if ($LASTEXITCODE -ne 0) { throw "Echec du build complet." }
        Write-Ok "Images reconstruites"

        & docker @($base + @('up', '-d'))
        if ($LASTEXITCODE -ne 0) { throw "Echec du demarrage." }
        Write-Ok "Tous les services demarres"
        Write-Info "Frontend : http://localhost:3000"
        Write-Info "Backend  : http://localhost:8000"
    }

    'stop' {
        Write-Step "Arret des services..."
        & docker @($base + @('down'))
        if ($LASTEXITCODE -ne 0) { throw "Echec de l'arret." }
        Write-Ok "Tous les services arretes"
    }

    'logs' {
        $svc = if ($Target -ne '') { @($Target) } else { @() }
        Write-Step "Logs$(if ($Target -ne '') { ' (' + $Target + ')' } else { ' (tous les services)' }) - Ctrl+C pour quitter"
        & docker @($base + @('logs', '-f', '--tail=50') + $svc)
    }

    'status' {
        Write-Step "Etat des conteneurs EduStream"
        & docker @($base + @('ps'))
    }

    'restart' {
        $svc = switch ($Target) {
            'front' { 'web' }
            'back'  { 'backend' }
            'all'   { '' }
            default { Write-Warn "Cible invalide. Utilisez : front, back, all"; exit 1 }
        }
        Write-Step "Redemarrage$(if ($svc -ne '') { ' de ' + $svc } else { ' de tous les services' })..."
        if ($svc -ne '') {
            & docker @($base + @('restart', $svc))
        } else {
            & docker @($base + @('restart'))
        }
        if ($LASTEXITCODE -ne 0) { throw "Echec du redemarrage." }
        Write-Ok "Redemarrage effectue"
    }
}

Write-Host ""
