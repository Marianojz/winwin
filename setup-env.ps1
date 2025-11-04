# Configuración del entorno para WinWin
# Ejecuta este script una vez para configurar aliases

Write-Host "Configurando aliases de npm..." -ForegroundColor Cyan

# Crear alias para npm
function npm {
    & "C:\Program Files\nodejs\npm.cmd" $args
}

# Exportar función para esta sesión
Export-ModuleMember -Function npm

Write-Host "✓ Aliases configurados" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora puedes usar 'npm' normalmente" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para instalar dependencias:" -ForegroundColor Cyan
Write-Host "  npm install" -ForegroundColor White
Write-Host ""
Write-Host "Para iniciar el servidor:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White


