# 🔒 Guía: Testing de Permisos - Sistema de Anuncios

Esta es la **tercera guía del plan de despliegue** - Fase 1.3-1.4: Verificar Permisos y Seguridad.

## 📋 Objetivo

Verificar que los permisos de seguridad funcionan correctamente: solo admins pueden crear/editar anuncios, y usuarios solo pueden ver sus anuncios asignados.

---

## 👤 Paso 1: Preparar Usuarios de Prueba

### 1.1. Verificar Usuario Admin

1. Abre Firebase Console → **Realtime Database** → **Datos**
2. Navega a `users/{tu_user_id}`
3. Verifica que existe `"isAdmin": true`
4. Si no existe, agrégalo:
   ```json
   {
     "isAdmin": true
   }
   ```

### 1.2. Crear Usuario Regular de Prueba

**Opción A: Usar usuario existente**
- Si ya tienes un usuario regular, úsalo

**Opción B: Crear nuevo usuario**
1. En tu aplicación, crea una cuenta nueva
2. Anota el `user_id` del nuevo usuario
3. En Firebase Console, verifica que NO tiene `isAdmin: true`

---

## ✅ Paso 2: Testing - Admin Puede Crear Anuncios

### 2.1. Iniciar Sesión como Admin

1. Abre tu aplicación
2. Inicia sesión con tu cuenta **admin**
3. Ve a **Admin Panel** → Tab **"Anuncios"**

### 2.2. Crear Anuncio

1. Haz clic en **"Nuevo Anuncio"**
2. Completa el formulario:
   - Título: "Test Admin - Crear"
   - Contenido: "Este anuncio verifica que admin puede crear"
   - Tipo: "text"
   - Prioridad: "low"
   - Destinatarios: "all_users"
3. Haz clic en **"Guardar"**

### 2.3. Verificar Resultado

- [ ] ✅ El anuncio se crea sin errores
- [ ] ✅ Aparece en la lista de anuncios
- [ ] ✅ No hay errores en la consola (F12)
- [ ] ✅ En Firebase Console, el anuncio existe en `announcements/`

> ✅ Si todos los checks pasan, el test es exitoso.

---

## ❌ Paso 3: Testing - Usuario Regular NO Puede Crear

### 3.1. Iniciar Sesión como Usuario Regular

1. Abre tu aplicación en **modo incógnito** o **otra pestaña**
2. Inicia sesión con cuenta **regular** (no admin)
3. Intenta acceder a **Admin Panel**

### 3.2. Verificar que NO Puede Acceder

- [ ] ❌ No puede acceder al Admin Panel (redirige o muestra error)
- [ ] ❌ O si accede, no ve la tab "Anuncios"
- [ ] ❌ No hay botón "Nuevo Anuncio" visible

### 3.3. Intentar Crear Anuncio (si es posible)

Si de alguna manera puede acceder al creador:

1. Intenta crear un anuncio
2. Verifica que:
   - [ ] ❌ Muestra error de permisos
   - [ ] ❌ O el anuncio no se guarda
   - [ ] ❌ Hay error en consola: "Permission denied"

> ✅ Si el usuario NO puede crear anuncios, el test es exitoso.

---

## 👁️ Paso 4: Testing - Usuario Puede Ver Anuncios Asignados

### 4.1. Crear Anuncio para Usuario Específico

1. Como **admin**, crea un anuncio:
   - Título: "Test Usuario - Específico"
   - Contenido: "Este anuncio es solo para un usuario"
   - Tipo: "text"
   - Destinatarios: "custom_segment"
   - Usuarios: `{user_id_del_usuario_regular}`

### 4.2. Verificar como Usuario Regular

1. Como **usuario regular**, ve a **Home**
2. Verifica que:
   - [ ] ✅ Ve el anuncio "Test Usuario - Específico"
   - [ ] ✅ Puede hacer click en el anuncio
   - [ ] ✅ Puede descartar el anuncio (botón X)

### 4.3. Crear Anuncio para Todos

1. Como **admin**, crea otro anuncio:
   - Título: "Test Usuario - Todos"
   - Destinatarios: "all_users"

2. Como **usuario regular**, verifica:
   - [ ] ✅ Ve el anuncio "Test Usuario - Todos"
   - [ ] ✅ Puede interactuar con él

> ✅ Si el usuario ve sus anuncios asignados, el test es exitoso.

---

## 🚫 Paso 5: Testing - Usuario NO Ve Anuncios de Otros

### 5.1. Crear Anuncio para Otro Usuario

1. Como **admin**, crea un anuncio:
   - Título: "Test Usuario - Otro Usuario"
   - Destinatarios: "custom_segment"
   - Usuarios: `{user_id_de_otro_usuario}` (NO el usuario de prueba)

### 5.2. Verificar como Usuario Regular

1. Como **usuario regular de prueba**, ve a **Home**
2. Verifica que:
   - [ ] ❌ NO ve el anuncio "Test Usuario - Otro Usuario"
   - [ ] ✅ Solo ve sus anuncios asignados

> ✅ Si el usuario NO ve anuncios de otros, el test es exitoso.

---

## 🔐 Paso 6: Testing - Validaciones de Datos

### 6.1. Intentar Crear Anuncio Inválido

Como **admin**, intenta crear anuncios con datos inválidos:

**Test 1: Sin título**
- [ ] ❌ Muestra error de validación
- [ ] ❌ No permite guardar

**Test 2: Sin contenido**
- [ ] ❌ Muestra error de validación
- [ ] ❌ No permite guardar

**Test 3: Tipo inválido**
- Intenta poner un tipo que no existe (ej: "invalid_type")
- [ ] ❌ Firebase rechaza el dato
- [ ] ❌ O la aplicación valida antes de enviar

> ✅ Si las validaciones funcionan, el test es exitoso.

---

## 📊 Paso 7: Testing - Analytics y Permisos

### 7.1. Verificar que Usuario Puede Escribir Eventos

1. Como **usuario regular**, interactúa con un anuncio:
   - Haz click
   - Descarta
   - Click en enlace (si tiene)

2. En Firebase Console, verifica:
   - [ ] ✅ Los eventos se crean en `announcement_engagement/`
   - [ ] ✅ El `userId` es correcto
   - [ ] ✅ El `action` es correcto

### 7.2. Verificar que Solo Admin Puede Leer Analytics

1. Como **usuario regular**, intenta ver métricas:
   - [ ] ❌ No puede acceder a métricas
   - [ ] ❌ O no ve la sección de analytics

2. Como **admin**, verifica:
   - [ ] ✅ Puede ver métricas en Admin Panel
   - [ ] ✅ Puede ver todos los eventos de engagement

> ✅ Si los permisos de analytics funcionan, el test es exitoso.

---

## ✅ Checklist Final de Testing

### Permisos de Creación
- [ ] Admin puede crear anuncios
- [ ] Usuario regular NO puede crear anuncios
- [ ] Errores de permisos se muestran correctamente

### Permisos de Lectura
- [ ] Usuario ve sus anuncios asignados
- [ ] Usuario NO ve anuncios de otros usuarios
- [ ] Usuario ve anuncios con `targetUsers: "all_users"`

### Validaciones
- [ ] Validación de campos requeridos funciona
- [ ] Validación de tipos funciona
- [ ] Firebase rechaza datos inválidos

### Analytics
- [ ] Usuario puede escribir eventos de engagement
- [ ] Solo admin puede leer analytics
- [ ] Los eventos se registran correctamente

---

## 🚨 Solución de Problemas

### Usuario regular puede crear anuncios

**Causa**: Las reglas Firebase no están aplicadas o hay un error.

**Solución**:
1. Verifica que las reglas están aplicadas (ver `GUIA_APLICAR_REGLAS_ANUNCIOS.md`)
2. Verifica que el usuario NO tiene `isAdmin: true`
3. Revisa la consola del navegador para errores
4. Verifica las reglas en Firebase Console

### Usuario no ve anuncios

**Causa**: El anuncio no está activo o no está dirigido al usuario.

**Solución**:
1. Verifica que el anuncio tiene `status: "active"`
2. Verifica que `targetUsers` incluye al usuario o es "all_users"
3. Verifica que el usuario está autenticado
4. Recarga la página

### Errores de permisos en consola

**Causa**: Reglas Firebase incorrectas o no aplicadas.

**Solución**:
1. Revisa `GUIA_APLICAR_REGLAS_ANUNCIOS.md`
2. Verifica que las reglas están publicadas
3. Espera 1-2 minutos y recarga
4. Verifica la sintaxis de las reglas

---

## 📚 Próximos Pasos

Una vez completada esta guía, continúa con:

1. **GUIA_TESTING_ADMIN_ANUNCIOS.md** - Testing completo del Admin Panel

---

**Última actualización**: 2025-01-27
**Versión**: 1.0.0
**Fase**: 1.3-1.4 - Backend

