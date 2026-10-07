# =============================================================================
#  rebuild-front.ps1 - Rebuild uniquement le service web (frontend React/Vite)
#  et le redémarre sans toucher au backend, postgres ou redis.
#
#  Usage :
#    .\rebuild-front.ps1
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

Write-Step "Rebuild du frontend (service web)..."
& docker @($composeArgs + @('build', 'web'))
if ($LASTEXITCODE -ne 0) { throw "Echec du build du frontend." }
Write-Ok "Image web reconstruite"

Write-Step "Redemarrage du service web..."
& docker @($composeArgs + @('up', '-d', '--no-deps', 'web'))
if ($LASTEXITCODE -ne 0) { throw "Echec du demarrage du service web." }
Write-Ok "Service web redémarre"

Write-Host ""
Write-Host "  Frontend mis a jour : http://localhost:3000" -ForegroundColor Green
