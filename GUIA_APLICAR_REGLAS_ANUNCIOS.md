# 🔥 Guía: Aplicar Reglas Firebase para Sistema de Anuncios

Esta es la **primera guía del plan de despliegue** - Fase 1.1: Actualizar Reglas Firebase en Testing.

## ⚠️ IMPORTANTE: Leer Antes de Continuar

Esta guía es **CRÍTICA** para que el sistema de anuncios funcione correctamente. Sin aplicar estas reglas, los usuarios no podrán ver anuncios y los admins no podrán crearlos.

---

## 📋 Paso 1: Hacer Backup de Reglas Actuales

### 1.1. Abrir Firebase Console

1. Ve a: **https://console.firebase.google.com/**
2. Selecciona tu proyecto: **"subasta-argenta-winwin"**
3. Ve a: **Realtime Database** → pestaña **"Reglas"**

### 1.2. Copiar Reglas Actuales

1. **Selecciona TODO** el contenido del editor de reglas (Ctrl+A)
2. **Copia** el contenido (Ctrl+C)
3. **Guarda** en un archivo de texto como backup (ej: `backup_reglas_antes_anuncios.txt`)

> 💡 **Tip**: Si algo sale mal, podrás restaurar las reglas anteriores desde este backup.

---

## 📋 Paso 2: Aplicar Nuevas Reglas

### 2.1. Abrir Archivo de Reglas

1. En tu proyecto, abre el archivo: `firebase-realtime-database.rules.json`
2. **Selecciona TODO** el contenido** (Ctrl+A)
3. **Copia** el contenido (Ctrl+C)

### 2.2. Aplicar en Firebase Console

1. En Firebase Console → **Realtime Database** → **Reglas**
2. **BORRA TODO** el contenido actual del editor
3. **PEGA** el contenido que copiaste (Ctrl+V)
4. Verifica que el JSON es válido (no debería haber errores de sintaxis)

### 2.3. Publicar Reglas

1. Haz clic en el botón **"Publicar"** (botón verde en la parte superior)
2. Confirma la acción si se solicita
3. **Espera 30-60 segundos** para que las reglas se propaguen

> ⏱️ **Importante**: Las reglas pueden tardar hasta 1 minuto en aplicarse completamente. No cierres la pestaña durante este tiempo.

---

## ✅ Paso 3: Verificar que las Reglas se Aplicaron

### 3.1. Verificación Visual

1. Recarga la página de Firebase Console (F5)
2. Ve a **Realtime Database** → **Reglas**
3. Verifica que las nuevas reglas están visibles
4. Busca las siguientes secciones en las reglas:
   - `"announcements": { ... }`
   - `"user_announcements": { ... }`
   - `"announcement_engagement": { ... }`

### 3.2. Verificación Funcional

1. Abre tu aplicación en el navegador
2. Inicia sesión como **admin**
3. Ve al **Admin Panel** → Tab **"Anuncios"**
4. Intenta crear un anuncio de prueba
5. Si no hay errores de permisos, las reglas están funcionando ✅

---

## 🔍 Paso 4: Verificar Estructuras de Datos

### 4.1. Verificar en Firebase Console

1. Ve a **Realtime Database** → **Datos**
2. Verifica que puedes ver la estructura base (auctions, products, users, etc.)
3. Las estructuras de anuncios se crearán automáticamente cuando:
   - Un admin cree el primer anuncio → se crea `announcements/`
   - Un usuario vea un anuncio → se crea `user_announcements/{userId}/`
   - Un usuario interactúe con un anuncio → se crea `announcement_engagement/{announcementId}/`

### 4.2. Crear Estructura de Prueba (Opcional)

Si quieres verificar manualmente, puedes crear un anuncio de prueba desde el Admin Panel:

1. Ve a **Admin Panel** → **Anuncios**
2. Haz clic en **"Nuevo Anuncio"**
3. Completa el formulario:
   - Título: "Anuncio de Prueba"
   - Contenido: "Este es un anuncio de prueba"
   - Tipo: "text"
   - Prioridad: "low"
   - Destinatarios: "all_users"
4. Guarda el anuncio
5. Verifica en Firebase Console que se creó en `announcements/{id}`

---

## 🚨 Solución de Problemas

### Error: "Permission denied"

**Causa**: Las reglas no se aplicaron correctamente o hay un error de sintaxis.

**Solución**:
1. Verifica que el JSON es válido (sin comas extra, llaves balanceadas)
2. Asegúrate de haber esperado 30-60 segundos después de publicar
3. Recarga la aplicación (Ctrl+F5 para limpiar cache)
4. Verifica que el usuario tiene `isAdmin: true` en Firebase

### Error: "Rules are invalid"

**Causa**: Error de sintaxis en las reglas.

**Solución**:
1. Copia nuevamente el contenido de `firebase-realtime-database.rules.json`
2. Verifica que no hay caracteres extra
3. Usa un validador JSON online para verificar la sintaxis
4. Vuelve a pegar y publicar

### Los anuncios no se crean

**Causa**: El usuario no tiene permisos de admin.

**Solución**:
1. Ve a Firebase Console → **Realtime Database** → **Datos**
2. Navega a `users/{tuUserId}`
3. Verifica que existe `"isAdmin": true`
4. Si no existe, agrégalo manualmente:
   ```json
   {
     "users": {
       "tuUserId": {
       "id": "tuUserId",
       "username": "TuNombre",
       "email": "tu@email.com",
       "isAdmin": true  ← Agregar esto
     }
   }
   }
   ```

### Las reglas no se actualizan

**Causa**: Cache del navegador o propagación lenta.

**Solución**:
1. Espera 1-2 minutos adicionales
2. Cierra y vuelve a abrir Firebase Console
3. Limpia el cache del navegador (Ctrl+Shift+Delete)
4. Intenta desde otro navegador o modo incógnito

---

## ✅ Checklist de Verificación

Marca cada paso cuando lo completes:

- [ ] Backup de reglas actuales guardado
- [ ] Archivo `firebase-realtime-database.rules.json` abierto
- [ ] Contenido copiado al portapapeles
- [ ] Reglas pegadas en Firebase Console
- [ ] Reglas publicadas (botón verde)
- [ ] Esperado 30-60 segundos
- [ ] Verificado que las reglas están visibles en Console
- [ ] Verificado que admin puede crear anuncio
- [ ] Verificado que no hay errores en consola del navegador

---

## 📚 Próximos Pasos

Una vez completada esta guía, continúa con:

1. **GUIA_VERIFICAR_ESTRUCTURAS_ANUNCIOS.md** - Verificar que las estructuras de datos se crean correctamente
2. **GUIA_TESTING_PERMISOS_ANUNCIOS.md** - Testing de permisos y seguridad
3. **GUIA_TESTING_ADMIN_ANUNCIOS.md** - Testing completo del Admin Panel

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa la sección "Solución de Problemas" arriba
2. Verifica los logs de la consola del navegador (F12)
3. Verifica los logs de Firebase Console → **Realtime Database** → **Usage**

---

**Última actualización**: 2025-01-27
**Versión**: 1.0.0
**Fase**: 1.1 - Backend

