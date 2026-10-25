# =============================================================================
#  rebuild-back.ps1 - Rebuild uniquement le service backend (Django/Daphne)
#  et le redémarre sans toucher au frontend, postgres ou redis.
#
#  Usage :
#    .\rebuild-back.ps1
# =============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step([string]$msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "    $msg"   -ForegroundColor Green }

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$Compose = Join-Path $Root 'compose.yaml'
$EnvFile = Join-Path $Root '.env.docker'

if (-not (Test-Path -LiteralPath $Compose)) { throw "compose.yaml introuvable dans $Root" }
if (-not (Test-Path -LiteralPath $EnvFile)) { throw ".env.docker introuvable - lancez d'abord start-docker.ps1" }

$composeArgs = @('compose', '--env-file', $EnvFile, '-f', $Compose)

Write-Step "Rebuild du backend (service backend)..."
& docker @($composeArgs + @('build', 'backend'))
if ($LASTEXITCODE -ne 0) { throw "Echec du build du backend." }
Write-Ok "Image backend reconstruite"

Write-Step "Redemarrage du service backend..."
& docker @($composeArgs + @('up', '-d', '--no-deps', 'backend'))
if ($LASTEXITCODE -ne 0) { throw "Echec du demarrage du service backend." }
Write-Ok "Service backend redémarre"

Write-Host ""
Write-Host "  Backend mis a jour : http://localhost:8100" -ForegroundColor Green
