# 🔥 Actualizar Reglas de Firebase para Reset Completo

## Importante: Actualizar Reglas en Firebase Console

Para que el botón "Resetear Sistema" funcione correctamente y pueda borrar todos los datos excepto usuarios, necesitas actualizar las reglas de Firebase Realtime Database.

### Pasos:

1. **Abre Firebase Console**: https://console.firebase.google.com/
2. **Selecciona tu proyecto**: `subasta-argenta-winwin`
3. **Ve a Realtime Database** → **Reglas**
4. **Copia y pega** el contenido completo del archivo `firebase-realtime-database.rules.production.json`
5. **Haz clic en "Publicar"**

### ¿Qué cambió?

Se agregaron reglas `.write` y `.validate` a nivel raíz para estos nodos:
- `notifications` - Los admins pueden borrar todo el nodo
- `messages` - Los admins pueden borrar todo el nodo
- `orders` - Los admins pueden borrar todo el nodo
- `orderTransactions` - Los admins pueden borrar todo el nodo
- `orderTransactionsByOrder` - Los admins pueden borrar todo el nodo

Esto permite que el botón "Resetear Sistema" elimine completamente estos datos de Firebase.

### ⚠️ Importante

Después de actualizar las reglas:
1. **Cierra completamente el navegador** (no solo la pestaña)
2. **Vuelve a abrir** y **inicia sesión de nuevo**
3. Esto asegura que tu token de autenticación se actualice con las nuevas reglas

---

## ✅ Funcionalidad del Reset Completo

Ahora el botón "Resetear Sistema" borra:

### ❌ Se ELIMINAN:
- Subastas
- Productos
- Bots
- Notificaciones
- Mensajes
- Pedidos
- Transacciones de pedidos
- Secuencias de pedidos (reinicia el contador)
- Imágenes (de subastas, productos, banners)

### ✅ Se PRESERVAN:
- Usuarios registrados
- Configuración de admin (`adminSettings`)

---

## 🧪 Probar el Reset

1. Asegúrate de haber actualizado las reglas en Firebase Console
2. Cierra y reabre el navegador
3. Inicia sesión como admin
4. Ve a "Zona Peligrosa" en el Admin Panel
5. Haz clic en "Resetear Sistema"
6. Confirma dos veces (hay doble confirmación por seguridad)
7. El sistema borrará todo excepto usuarios y recargará la página

---

**Nota**: Si ves errores de permisos después de actualizar las reglas, cierra completamente el navegador y vuelve a iniciar sesión.

