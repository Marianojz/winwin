# Script para completar el archivo .env con las credenciales de Firebase
# Ejecuta este script: .\completar-env.ps1

$envContent = @"
# Firebase Configuration
# Credenciales de Firebase - Proyecto: clikio-773fa
VITE_FIREBASE_API_KEY=AIzaSyDhJldFdxpezX2MCANk67PBIWPbZacevEc
VITE_FIREBASE_AUTH_DOMAIN=clikio-773fa.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=clikio-773fa
VITE_FIREBASE_STORAGE_BUCKET=clikio-773fa.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=930158513107
VITE_FIREBASE_APP_ID=1:930158513107:web:685ebe622ced3398e8bd26
VITE_FIREBASE_DATABASE_URL=https://clikio-773fa-default-rtdb.firebaseio.com
VITE_FIREBASE_MEASUREMENT_ID=G-13J0SJPW40

# Google Maps API Key
# ⚠️ IMPORTANTE: Reemplaza esto con tu API key real de Google Maps
# Obtén tu API key en: https://console.cloud.google.com/google/maps-apis/credentials
VITE_GOOGLE_MAPS_API_KEY=tu_google_maps_api_key_aqui
"@

# Escribir el contenido al archivo .env
$envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline

Write-Host "✅ Archivo .env completado con las credenciales de Firebase" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - Revisa el archivo .env y completa VITE_GOOGLE_MAPS_API_KEY con tu API key real" -ForegroundColor Yellow
Write-Host "   - Si el repositorio ha sido público, considera rotar estas credenciales" -ForegroundColor Yellow
Write-Host ""
Write-Host "Proximo paso: Reinicia el servidor de desarrollo (npm run dev)" -ForegroundColor Cyan

