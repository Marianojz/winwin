# Script para verificar y configurar Node.js

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificación de Node.js              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Node.js está en el PATH
Write-Host "Buscando Node.js..." -ForegroundColor Yellow

$nodePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:APPDATA\npm\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
)

$nodeFound = $false
$nodePath = $null

foreach ($path in $nodePaths) {
    if (Test-Path $path) {
        $nodeFound = $true
        $nodePath = $path
        Write-Host "✓ Node.js encontrado en: $path" -ForegroundColor Green
        break
    }
}

if (-not $nodeFound) {
    Write-Host "✗ Node.js no encontrado en ubicaciones estándar" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor:" -ForegroundColor Yellow
    Write-Host "1. Descarga Node.js desde: https://nodejs.org/" -ForegroundColor White
    Write-Host "2. Ejecuta el instalador" -ForegroundColor White
    Write-Host "3. IMPORTANTE: Marca la opción 'Add to PATH' durante la instalación" -ForegroundColor White
    Write-Host "4. Cierra y vuelve a abrir PowerShell" -ForegroundColor White
    Write-Host "5. Vuelve a ejecutar este script" -ForegroundColor White
    exit 1
}

# Probar Node.js
Write-Host ""
Write-Host "Probando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = & $nodePath --version
    Write-Host "✓ Node.js funcionando: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al ejecutar Node.js" -ForegroundColor Red
    exit 1
}

# Buscar npm
Write-Host ""
Write-Host "Buscando npm..." -ForegroundColor Yellow
$npmPaths = @(
    "C:\Program Files\nodejs\npm.cmd",
    "C:\Program Files (x86)\nodejs\npm.cmd",
    "$env:APPDATA\npm\npm.cmd"
)

$npmFound = $false
$npmPath = $null

foreach ($path in $npmPaths) {
    if (Test-Path $path) {
        $npmFound = $true
        $npmPath = $path
        Write-Host "✓ npm encontrado en: $path" -ForegroundColor Green
        break
    }
}

if (-not $npmFound) {
    Write-Host "✗ npm no encontrado" -ForegroundColor Red
    exit 1
}

# Probar npm
Write-Host ""
Write-Host "Probando npm..." -ForegroundColor Yellow
try {
    $npmVersion = & $npmPath --version
    Write-Host "✓ npm funcionando: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al ejecutar npm" -ForegroundColor Red
    exit 1
}

# Agregar al PATH de esta sesión si no está
$nodeDir = Split-Path $nodePath
if ($env:PATH -notlike "*$nodeDir*") {
    Write-Host ""
    Write-Host "Agregando Node.js al PATH de esta sesión..." -ForegroundColor Yellow
    $env:PATH += ";$nodeDir"
    Write-Host "✓ PATH actualizado" -ForegroundColor Green
}

# Verificar nuevamente
Write-Host ""
Write-Host "Verificación final..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ Todo está listo!                   " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora puedes ejecutar:" -ForegroundColor Cyan
    Write-Host "  npm install" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
} catch {
    Write-Host "✗ Aún hay problemas. Por favor cierra y vuelve a abrir PowerShell." -ForegroundColor Red
}


