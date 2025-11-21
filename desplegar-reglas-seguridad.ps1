# Script para desplegar las reglas de seguridad corregidas a Firebase
# Ejecuta este script: .\desplegar-reglas-seguridad.ps1

Write-Host "Desplegando reglas de seguridad a Firebase..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estas logueado
Write-Host "1. Verificando autenticacion..." -ForegroundColor Yellow
$loginCheck = npx firebase-tools projects:list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "No estas autenticado en Firebase" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, ejecuta primero:" -ForegroundColor Yellow
    Write-Host "   npx firebase-tools login" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Autenticado correctamente" -ForegroundColor Green
Write-Host ""

# Desplegar reglas de Firestore
Write-Host "2. Desplegando reglas de Firestore..." -ForegroundColor Yellow
npx firebase-tools deploy --only firestore:rules
if ($LASTEXITCODE -eq 0) {
    Write-Host "Reglas de Firestore desplegadas correctamente" -ForegroundColor Green
} else {
    Write-Host "Error al desplegar reglas de Firestore" -ForegroundColor Red
}
Write-Host ""

# Desplegar reglas de Realtime Database
Write-Host "3. Desplegando reglas de Realtime Database..." -ForegroundColor Yellow
npx firebase-tools deploy --only database
if ($LASTEXITCODE -eq 0) {
    Write-Host "Reglas de Realtime Database desplegadas correctamente" -ForegroundColor Green
} else {
    Write-Host "Error al desplegar reglas de Realtime Database" -ForegroundColor Red
}
Write-Host ""

# Desplegar reglas de Storage
Write-Host "4. Desplegando reglas de Storage..." -ForegroundColor Yellow
npx firebase-tools deploy --only storage
if ($LASTEXITCODE -eq 0) {
    Write-Host "Reglas de Storage desplegadas correctamente" -ForegroundColor Green
} else {
    Write-Host "Error al desplegar reglas de Storage" -ForegroundColor Red
}
Write-Host ""

Write-Host "Proceso completado!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "   - Verifica en Firebase Console que las reglas se desplegaron correctamente" -ForegroundColor White
Write-Host "   - Prueba la aplicación para asegurarte de que todo funciona" -ForegroundColor White
Write-Host ""

