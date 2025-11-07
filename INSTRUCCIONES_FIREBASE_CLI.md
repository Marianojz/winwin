# 🔧 Instrucciones para usar Firebase CLI

## ✅ Firebase CLI Instalado

Firebase CLI se instaló correctamente. Sin embargo, en Windows a veces el comando `firebase` no se reconoce inmediatamente.

## 🚀 Soluciones

### Opción 1: Usar npx (Recomendado)

En lugar de `firebase`, usá `npx firebase-tools`:

```powershell
# Login
npx firebase-tools login

# Ver versión
npx firebase-tools --version

# Desplegar functions
npx firebase-tools deploy --only functions:executeBots
```

### Opción 2: Cerrar y reabrir la terminal

1. Cerrá completamente PowerShell/CMD
2. Abrí una nueva terminal
3. Probá: `firebase --version`

### Opción 3: Usar el script helper

Ejecutá el script `firebase.ps1` que creé:

```powershell
.\firebase.ps1 login
.\firebase.ps1 deploy --only functions
```

## 📝 Pasos para Configurar Bots 24/7

### Paso 1: Login en Firebase

```powershell
npx firebase-tools login
```

Esto abrirá tu navegador para autenticarte. Seguí las instrucciones.

### Paso 2: Seleccionar el proyecto

```powershell
npx firebase-tools use clikio-773fa
```

(Reemplazá `clikio-773fa` con el ID de tu proyecto si es diferente)

### Paso 3: Instalar dependencias de Functions

```powershell
cd functions
npm install
```

### Paso 4: Compilar TypeScript

```powershell
npm run build
```

### Paso 5: Desplegar la función

```powershell
cd ..
npx firebase-tools deploy --only functions:executeBots
```

## ⚠️ Nota Importante

Si seguís teniendo problemas con el comando `firebase`, siempre podés usar `npx firebase-tools` en su lugar. Es equivalente y más confiable.

## 🔍 Verificar Instalación

Para verificar que todo está bien:

```powershell
npx firebase-tools --version
```

Deberías ver algo como: `14.24.0` (o la versión que tengas)

---

**Siguiente paso**: Ejecutá `npx firebase-tools login` manualmente en tu terminal. Se abrirá el navegador para autenticarte.

