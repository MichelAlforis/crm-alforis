# ===========================================
# SCRIPT DE DÉMARRAGE PROPRE - NEXT.JS (Windows)
# ===========================================

$PORT = if ($env:PORT) { $env:PORT } else { 3010 }

Write-Host "🔍 Vérification du port $PORT..." -ForegroundColor Cyan

# Vérifier et libérer le port
$processes = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    Write-Host "⚠️  Port $PORT déjà utilisé par les processus: $processes" -ForegroundColor Yellow
    Write-Host "🔨 Arrêt des processus existants..." -ForegroundColor Yellow

    foreach ($pid in $processes) {
        try {
            Write-Host "   • Arrêt du processus $pid..." -ForegroundColor Gray
            Stop-Process -Id $pid -Force -ErrorAction Stop
        }
        catch {
            Write-Host "   ⚠️  Impossible d'arrêter le processus $pid" -ForegroundColor Yellow
        }
    }

    Start-Sleep -Seconds 2
    Write-Host "✅ Port $PORT libéré." -ForegroundColor Green
}
else {
    Write-Host "✅ Port $PORT disponible." -ForegroundColor Green
}

# Nettoyage Next.js
Write-Host "🧹 Nettoyage Next.js (.next + cache)..." -ForegroundColor Cyan
if (Test-Path ".next") { Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "node_modules/.cache") { Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host "✅ Cache Next.js supprimé." -ForegroundColor Green

# Vérification des dépendances
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan
    npm install
}

# Lancement
Write-Host "🚀 Démarrage du serveur Next.js sur le port $PORT..." -ForegroundColor Green
Write-Host "   🌐 http://localhost:$PORT" -ForegroundColor Cyan
Write-Host "   ⌨️  Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Gray
Write-Host ""

$env:PORT = $PORT
npm run dev
