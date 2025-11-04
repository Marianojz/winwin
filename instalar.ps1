# Script de instalación para WinWin
# Ejecuta este script DESPUÉS de instalar Node.js

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Instalación de dependencias WinWin  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ ERROR: Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor:" -ForegroundColor Yellow
    Write-Host "1. Descarga Node.js desde https://nodejs.org/" -ForegroundColor White
    Write-Host "2. Instala Node.js (marca 'Add to PATH')" -ForegroundColor White
    Write-Host "3. Cierra y vuelve a abrir PowerShell" -ForegroundColor White
    Write-Host "4. Vuelve a ejecutar este script" -ForegroundColor White
    exit 1
}

# Verificar npm
Write-Host "Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm instalado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ ERROR: npm no está disponible" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Instalando dependencias del proyecto..." -ForegroundColor Yellow
Write-Host "Esto puede tardar varios minutos..." -ForegroundColor Gray
Write-Host ""

# Instalar dependencias
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ Instalación completada con éxito   " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para iniciar el servidor de desarrollo, ejecuta:" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "Luego abre tu navegador en:" -ForegroundColor Cyan
    Write-Host "  http://localhost:5173/" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ Error durante la instalación      " -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Intenta:" -ForegroundColor Yellow
    Write-Host "1. Limpiar caché: npm cache clean --force" -ForegroundColor White
    Write-Host "2. Eliminar node_modules (si existe)" -ForegroundColor White
    Write-Host "3. Volver a ejecutar: npm install" -ForegroundColor White
    Write-Host ""
    exit 1
}

