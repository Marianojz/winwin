# Script para crear un nuevo repositorio en GitHub con el nombre "estable-con-seguridad"
# Este script te guiará para crear el repositorio y cambiar el remoto

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Crear Repositorio: estable-con-seguridad" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PASO 1: Crear el repositorio en GitHub" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ve a: https://github.com/new" -ForegroundColor White
Write-Host "2. Nombre del repositorio: estable-con-seguridad" -ForegroundColor White
Write-Host "3. Descripcion: Version estable del proyecto con todas las correcciones de seguridad aplicadas" -ForegroundColor White
Write-Host "4. Elige si sera publico o privado" -ForegroundColor White
Write-Host "5. NO inicialices con README, .gitignore o licencia" -ForegroundColor White
Write-Host "6. Haz clic en 'Create repository'" -ForegroundColor White
Write-Host ""
Write-Host "Presiona Enter cuando hayas creado el repositorio..." -ForegroundColor Green
Read-Host

Write-Host ""
Write-Host "PASO 2: Cambiar el remoto del repositorio" -ForegroundColor Yellow
Write-Host ""

# Cambiar el remoto
$newRemote = "https://github.com/Marianojz/estable-con-seguridad.git"
Write-Host "Cambiando remoto a: $newRemote" -ForegroundColor Cyan

git remote set-url origin $newRemote

Write-Host ""
Write-Host "Verificando remoto..." -ForegroundColor Yellow
git remote -v

Write-Host ""
Write-Host "PASO 3: Subir la rama al nuevo repositorio" -ForegroundColor Yellow
Write-Host ""

# Subir la rama actual
Write-Host "Subiendo rama estable-con-seguridad..." -ForegroundColor Cyan
git push -u origin estable-con-seguridad

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "¡Repositorio configurado correctamente!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tu repositorio estara en:" -ForegroundColor Cyan
Write-Host "https://github.com/Marianojz/estable-con-seguridad" -ForegroundColor White
Write-Host ""

