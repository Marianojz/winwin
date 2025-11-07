# 🤖 Guía: Bots Automáticos 24/7 con Firebase Cloud Functions

## 📋 Situación Actual

**Problema**: Los bots actualmente se ejecutan en el navegador del cliente. Esto significa que:
- ❌ Solo funcionan cuando alguien tiene la página abierta
- ❌ Si todos los usuarios (incluidos admins) se desloguean o cierran la página, los bots se detienen
- ❌ Los timers (`setTimeout`) solo funcionan mientras la página está activa

## ✅ Solución: Firebase Cloud Functions

He creado una solución server-side usando **Firebase Cloud Functions** que ejecuta los bots automáticamente cada minuto, sin necesidad de que nadie esté logueado.

## 🚀 Instalación y Configuración

### Paso 1: Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

**Nota**: En Windows, si el comando `firebase` no funciona después de instalar, usá `npx firebase-tools` en su lugar.

### Paso 2: Iniciar sesión en Firebase

```bash
# Si firebase funciona:
firebase login

# Si no funciona, usá:
npx firebase-tools login
```

Esto abrirá tu navegador para autenticarte. Seguí las instrucciones en pantalla.

### Paso 3: Seleccionar el proyecto Firebase

```bash
# Si firebase funciona:
firebase use clikio-773fa

# Si no funciona, usá:
npx firebase-tools use clikio-773fa
```

(Reemplazá `clikio-773fa` con el ID de tu proyecto si es diferente)

**Nota**: Las functions ya están creadas, así que NO necesitás ejecutar `firebase init functions`.

Cuando te pregunte:
- **Language**: TypeScript
- **Use ESLint**: Yes
- **Install dependencies**: Yes

### Paso 4: Instalar dependencias

```bash
cd functions
npm install
```

### Paso 5: Compilar TypeScript

```bash
npm run build
```

### Paso 6: Desplegar la función

```bash
# Si firebase funciona:
firebase deploy --only functions:executeBots

# Si no funciona, usá:
npx firebase-tools deploy --only functions:executeBots
```

## 📝 Configuración del Proyecto

Asegurate de que tu `firebase.json` tenga la configuración de functions:

```json
{
  "functions": {
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ]
  }
}
```

## 🔧 Cómo Funciona

1. **Programación Automática**: La función `executeBots` se ejecuta automáticamente cada minuto usando Cloud Scheduler
2. **Lectura de Bots**: Lee todos los bots activos desde Firebase Realtime Database
3. **Lectura de Subastas**: Obtiene todas las subastas activas
4. **Ejecución**: Cada bot activo intenta hacer una oferta según su configuración
5. **Guardado**: Las ofertas se guardan directamente en Firebase

## ⚙️ Configuración de los Bots

Los bots funcionan igual que antes, pero ahora:
- ✅ Se ejecutan automáticamente cada minuto
- ✅ No dependen de clientes conectados
- ✅ Funcionan 24/7 sin interrupciones
- ✅ No consumen recursos del navegador

## 📊 Monitoreo

Puedes ver los logs de ejecución en:
- Firebase Console → Functions → Logs
- O usando: `firebase functions:log`

## 💰 Costos

Firebase Cloud Functions tiene un plan gratuito generoso:
- **2 millones de invocaciones/mes gratis**
- **400,000 GB-segundos de tiempo de cómputo/mes gratis**
- **5 GB de tráfico de red saliente/mes gratis**

Para la mayoría de casos, esto es más que suficiente.

## 🔄 Migración

**IMPORTANTE**: Una vez que despliegues las Cloud Functions, podés:

1. **Opción A**: Mantener ambos sistemas (cliente + servidor) - Los bots funcionarán en ambos lugares
2. **Opción B**: Desactivar el BotManager del cliente comentando la línea en `App.tsx`:
   ```tsx
   // <BotManager />
   ```

Recomiendo la **Opción B** para evitar duplicación de ofertas.

## 🛠️ Comandos Útiles

```bash
# Ver logs en tiempo real
npx firebase-tools functions:log

# Desplegar solo functions
npx firebase-tools deploy --only functions

# Desplegar una función específica
npx firebase-tools deploy --only functions:executeBots

# Probar localmente (requiere emulador)
cd functions
npm run serve
```

**Nota**: Si el comando `firebase` funciona en tu sistema, podés usarlo directamente en lugar de `npx firebase-tools`.

## ⚠️ Notas Importantes

1. **Primera ejecución**: La primera vez que se despliega, puede tardar unos minutos en activarse
2. **Frecuencia**: Actualmente está configurado para ejecutarse cada minuto. Podés cambiarlo en `functions/src/index.ts`:
   ```typescript
   .schedule('every 1 minutes')  // Cambiar a 'every 30 seconds', 'every 5 minutes', etc.
   ```
3. **Reglas de Firebase**: Asegurate de que las reglas de Realtime Database permitan que las Cloud Functions lean y escriban (las functions usan Admin SDK, así que tienen permisos completos)

## ✅ Verificación

Después de desplegar, podés verificar que funciona:
1. Ve a Firebase Console → Functions
2. Deberías ver la función `executeBots` activa
3. Revisa los logs para ver las ejecuciones
4. Verifica que los bots están haciendo ofertas automáticamente

## 🎉 ¡Despliegue Exitoso!

Si viste el mensaje "Functions successfully deployed" y "Successful create operation", ¡la función está activa!

La advertencia sobre la política de limpieza no es crítica. Podés configurarla ejecutando:
```bash
npx firebase-tools functions:artifacts:setpolicy
```

O simplemente ignorarla - no afecta el funcionamiento de los bots.

---

**¿Necesitás ayuda con el despliegue?** Los archivos ya están creados, solo necesitás seguir los pasos de instalación.

