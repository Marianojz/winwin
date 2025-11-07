# Script para subir el logo de Clikio a Firebase Storage
# Uso: .\subir-logo.ps1 -ArchivoLogo "ruta\al\logo.png"

param(
    [Parameter(Mandatory=$true)]
    [string]$ArchivoLogo
)

Write-Host "🚀 Subiendo logo de Clikio a Firebase Storage..." -ForegroundColor Cyan

# Verificar que el archivo existe
if (-not (Test-Path $ArchivoLogo)) {
    Write-Host "❌ Error: No se encontró el archivo: $ArchivoLogo" -ForegroundColor Red
    exit 1
}

# Verificar que Firebase CLI está disponible
try {
    $firebaseVersion = npx firebase-tools --version 2>&1
    Write-Host "✅ Firebase CLI encontrado: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Firebase CLI no está disponible. Instálalo con: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}

# Obtener el nombre del archivo
$nombreArchivo = Split-Path -Leaf $ArchivoLogo
$extension = [System.IO.Path]::GetExtension($nombreArchivo)

# Validar formato
$formatosValidos = @('.png', '.jpg', '.jpeg', '.webp', '.svg')
if ($extension -notin $formatosValidos) {
    Write-Host "❌ Error: Formato no válido. Usa PNG, JPG, WEBP o SVG" -ForegroundColor Red
    exit 1
}

# Nombre del archivo en Storage
$nombreEnStorage = "clickio-logo$extension"
$rutaEnStorage = "logo/$nombreEnStorage"

Write-Host "📤 Subiendo: $nombreArchivo" -ForegroundColor Yellow
Write-Host "   Destino: $rutaEnStorage" -ForegroundColor Yellow
Write-Host "   Proyecto: clikio-773fa" -ForegroundColor Yellow
Write-Host ""

# Comando para subir
$comando = "npx firebase-tools storage:upload `"$ArchivoLogo`" --bucket clikio-773fa.firebasestorage.app --destination `"$rutaEnStorage`""

Write-Host "Ejecutando: $comando" -ForegroundColor Gray
Write-Host ""

# Ejecutar comando
try {
    Invoke-Expression $comando
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Logo subido exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
        Write-Host "1. Ve a Firebase Console → Storage → logo/" -ForegroundColor White
        Write-Host "2. Haz clic en el archivo y copia la URL pública" -ForegroundColor White
        Write-Host "3. Actualiza la URL en: src/types/homeConfig.ts" -ForegroundColor White
        Write-Host ""
        Write-Host "URL esperada:" -ForegroundColor Yellow
        Write-Host "https://firebasestorage.googleapis.com/v0/b/clikio-773fa.firebasestorage.app/o/logo%2F$nombreEnStorage?alt=media" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error al subir el logo. Código de salida: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error ejecutando el comando: $_" -ForegroundColor Red
    exit 1
}

