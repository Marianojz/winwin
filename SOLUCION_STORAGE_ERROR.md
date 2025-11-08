# 🔧 Solución Rápida: Error de Permisos en Storage

## ❌ Error que estás viendo:
```
Firebase Storage: User does not have permission to access 'logo/...'. (storage/unauthorized)
```

## ✅ Solución Inmediata (2 minutos)

### Paso 1: Abre Firebase Console
1. Ve a: **https://console.firebase.google.com/**
2. Selecciona tu proyecto: **`clikio-773fa`**

### Paso 2: Abre las Reglas de Storage
1. En el menú lateral, haz clic en **"Storage"**
2. Haz clic en la pestaña **"Reglas"** (Rules)

### Paso 3: Copia las Reglas de Desarrollo
1. Abre el archivo `storage.rules` en tu proyecto (NO el `.production`)
2. **Copia TODO el contenido** del archivo
3. El contenido debería empezar con:
   ```
   rules_version = '2';
   
   service firebase.storage {
     match /b/{bucket}/o {
   ```

### Paso 4: Pega y Publica
1. En Firebase Console, **BORRA TODO** el contenido actual de las reglas
2. **PEGA** el contenido que copiaste de `storage.rules`
3. Haz clic en el botón **"Publicar"** (Publish) - botón verde/azul
4. **Espera 30 segundos** para que las reglas se propaguen

### Paso 5: Actualiza tu Sesión
1. **Cierra sesión** en tu aplicación web
2. **Vuelve a iniciar sesión**
3. Intenta subir la imagen nuevamente

## ✅ ¡Listo!

Con las reglas de desarrollo, cualquier usuario autenticado puede subir imágenes. Esto es perfecto para desarrollo.

---

## 🔍 ¿Por qué funciona esto?

- **Reglas de Desarrollo**: Permiten a cualquier usuario autenticado subir imágenes
- **Reglas de Producción**: Requieren que el usuario sea admin en Firestore (más estricto)

Como estás en desarrollo, usar las reglas de desarrollo es la solución correcta.

---

## 📝 Contenido del archivo `storage.rules` (para copiar):

```rules
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Imágenes de subastas - Lectura pública, escritura solo autenticados
    match /auctions/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 && // 5MB máximo
                      request.resource.contentType.matches('image/.*');
    }
    
    // Imágenes de productos - Lectura pública, escritura solo autenticados
    match /products/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 && // 5MB máximo
                      request.resource.contentType.matches('image/.*');
    }
    
    // Avatares de usuarios - Lectura pública, escritura solo el propio usuario
    match /avatars/{userId}/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.auth.uid == userId &&
                      request.resource.size < 2 * 1024 * 1024 && // 2MB máximo
                      request.resource.contentType.matches('image/.*');
    }
    
    // Imágenes generales - Lectura pública, escritura solo autenticados
    match /images/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 && // 5MB máximo
                      request.resource.contentType.matches('image/.*');
    }
    
    // Banners y promociones - Lectura pública, escritura solo autenticados
    match /banners/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 && // 5MB máximo
                      request.resource.contentType.matches('image/.*');
    }
    
    // Logo del sitio - Lectura pública, escritura solo autenticados
    match /logo/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 && // 5MB máximo
                      request.resource.contentType.matches('image/.*');
    }
    
    // Denegar todo lo demás por defecto
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## ⚠️ Nota Importante

Si después de seguir estos pasos el error persiste:
1. Espera 1-2 minutos más (las reglas pueden tardar en propagarse)
2. Limpia la caché del navegador (Ctrl+Shift+Delete)
3. Cierra completamente el navegador y vuelve a abrirlo
4. Vuelve a iniciar sesión

