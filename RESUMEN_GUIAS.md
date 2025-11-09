# 📚 Resumen de Guías - Proyecto Clikio

Este documento es un índice completo de todas las guías y documentación disponible para el proyecto Clikio.

---

## 🚀 Guías de Inicio Rápido

### [INSTALAR_DEPENDENCIAS.md](./INSTALAR_DEPENDENCIAS.md)
**Propósito:** Instalación inicial del proyecto  
**Contenido:**
- Requisitos previos (Node.js, npm)
- Instalación de dependencias
- Configuración inicial
- Comandos básicos

**Cuándo usar:** Primera vez que clonas o trabajas en el proyecto

---

### [README.md](./README.md)
**Propósito:** Documentación principal del proyecto  
**Contenido:**
- Descripción general del proyecto
- Características principales
- Estructura del proyecto
- Tecnologías utilizadas
- Guía de uso básica

**Cuándo usar:** Para entender el proyecto en general

---

## 🔥 Guías de Firebase

### [FIREBASE_DESARROLLO.md](./FIREBASE_DESARROLLO.md)
**Propósito:** Configuración de Firebase para desarrollo  
**Contenido:**
- Configuración de proyecto Firebase
- Habilitación de servicios (Auth, Firestore, Realtime Database)
- Configuración de reglas de seguridad
- Variables de entorno
- Testing local

**Cuándo usar:** Al configurar el entorno de desarrollo

---

### [FIREBASE_PRODUCCION.md](./FIREBASE_PRODUCCION.md)
**Propósito:** Configuración de Firebase para producción  
**Contenido:**
- Migración de desarrollo a producción
- Configuración de reglas de producción
- Optimización de costos
- Monitoreo y logs
- Backup y recuperación

**Cuándo usar:** Antes de desplegar a producción

---

### [README_FIREBASE.md](./README_FIREBASE.md)
**Propósito:** Documentación general de Firebase  
**Contenido:**
- Resumen de servicios Firebase utilizados
- Estructura de datos
- Mejores prácticas

**Cuándo usar:** Referencia rápida sobre Firebase

---

### [INSTRUCCIONES_FIREBASE_CLI.md](./INSTRUCCIONES_FIREBASE_CLI.md)
**Propósito:** Uso de Firebase CLI  
**Contenido:**
- Instalación de Firebase CLI
- Comandos básicos
- Despliegue de reglas
- Despliegue de funciones
- Troubleshooting

**Cuándo usar:** Al trabajar con Firebase desde la terminal

---

## 🔐 Guías de Configuración

### [CONFIGURAR_ADMIN.md](./CONFIGURAR_ADMIN.md)
**Propósito:** Configuración de usuarios administradores  
**Contenido:**
- Crear usuario admin
- Permisos y roles
- Acceso al panel de administración
- Gestión de usuarios

**Cuándo usar:** Al configurar el primer administrador o gestionar permisos

---

### [GUIA_CAMBIO_DOMINIO_CLICKIO.md](./GUIA_CAMBIO_DOMINIO_CLICKIO.md)
**Propósito:** Cambio de dominio del proyecto  
**Contenido:**
- Configuración de nuevo dominio
- Actualización de Firebase
- Configuración de DNS
- Despliegue en Vercel
- Verificación de dominio

**Cuándo usar:** Al cambiar el dominio del proyecto o configurar producción

---

## 🗺️ Guías de Integración

### [GUIA_GOOGLE_MAPS.md](./GUIA_GOOGLE_MAPS.md)
**Propósito:** Implementación de Google Maps/Places API  
**Contenido:**
- Obtener API key de Google Maps
- Habilitar APIs necesarias (Maps, Places, Geocoding)
- Configuración en el proyecto
- Uso del componente GoogleAddressPicker
- Estructura de datos de direcciones
- Solución de problemas
- Costos y cuotas

**Cuándo usar:** Al implementar funcionalidades de direcciones y mapas

**Componentes relacionados:**
- `src/components/GoogleAddressPicker.tsx`
- `src/config/googleMaps.ts`
- `src/pages/CompletarPerfilGoogle.tsx`
- `src/pages/RegistroMobile.tsx`

---

### [GUIA_VERIFICACION_EMAIL.md](./GUIA_VERIFICACION_EMAIL.md)
**Propósito:** Configuración del sistema de verificación de email  
**Contenido:**
- Configuración del template de email en Firebase
- Personalización del template (HTML y texto plano)
- Medidas anti-spam (SPF, DKIM, DMARC)
- Configuración de DNS
- Mejores prácticas de contenido
- Solución de problemas comunes
- Monitoreo y métricas

**Cuándo usar:** Al configurar o personalizar el sistema de verificación de email

**Componentes relacionados:**
- `src/components/EmailVerificationModal.tsx`
- `src/pages/RegistroMobile.tsx`
- `src/pages/Registro.tsx`

---

### [GUIA_PASSWORD_MANAGERS.md](./GUIA_PASSWORD_MANAGERS.md)
**Propósito:** Optimización de formularios para password managers  
**Contenido:**
- Atributos HTML recomendados (autocomplete, data-*)
- Estructura correcta de formularios
- Validación optimizada para evitar advertencias
- Configuración específica por gestor (Google, LastPass, 1Password, Bitwarden)
- Solución de problemas comunes
- Testing con diferentes gestores

**Cuándo usar:** Al crear o modificar formularios de registro/login

**Componentes relacionados:**
- `src/pages/RegistroMobile.tsx`
- `src/pages/Registro.tsx`
- `src/pages/Login.tsx`
- `src/utils/passwordManagerOptimization.ts`

---

## 🤖 Guías de Funcionalidades

### [GUIA_BOTS_SERVER_SIDE.md](./GUIA_BOTS_SERVER_SIDE.md)
**Propósito:** Implementación de bots para subastas  
**Contenido:**
- Configuración de bots
- Lógica de pujas automáticas
- Integración con Firebase Functions
- Testing de bots

**Cuándo usar:** Al configurar o modificar bots de subastas

---

## 🎨 Guías de Diseño

### [GUIA_SUBIR_LOGO.md](./GUIA_SUBIR_LOGO.md)
**Propósito:** Subir y configurar el logo de la aplicación  
**Contenido:**
- Preparación de imágenes
- Subida a Firebase Storage
- Configuración en la aplicación
- Optimización de imágenes

**Cuándo usar:** Al actualizar el branding o logo

---

## 🐛 Guías de Solución de Problemas

### [SOLUCION_STORAGE_ERROR.md](./SOLUCION_STORAGE_ERROR.md)
**Propósito:** Solución de errores de Firebase Storage  
**Contenido:**
- Errores comunes de Storage
- Configuración de reglas
- Permisos y autenticación
- Troubleshooting

**Cuándo usar:** Cuando hay problemas con subida de archivos o imágenes

---

## 📋 Guías de Reglas y Configuración

### [ACTUALIZAR_REGLAS_TICKETS.md](./ACTUALIZAR_REGLAS_TICKETS.md)
**Propósito:** Actualización de reglas de Firebase para tickets  
**Contenido:**
- Estructura de reglas de tickets
- Permisos de lectura/escritura
- Validaciones
- Testing de reglas

**Cuándo usar:** Al modificar el sistema de tickets

---

### [ACTUALIZAR_REGLAS_LIMPIAR_TICKETS.md](./ACTUALIZAR_REGLAS_LIMPIAR_TICKETS.md)
**Propósito:** Limpieza y mantenimiento de tickets  
**Contenido:**
- Scripts de limpieza
- Archivo de tickets antiguos
- Optimización de base de datos

**Cuándo usar:** Para mantenimiento periódico de la base de datos

---

## 📱 Componentes Mobile-First

### Registro Mobile
**Archivos:**
- `src/pages/RegistroMobile.tsx`
- `src/pages/RegistroMobile.css`

**Características:**
- Diseño mobile-first
- Integración con GoogleAddressPicker
- Scroll suave entre campos
- Ajuste automático al enfocar inputs
- Validación en tiempo real

**Uso:**
```typescript
import RegistroMobile from './pages/RegistroMobile';
```

---

## 🗂️ Estructura de Archivos Importantes

### Configuración
```
src/config/
  ├── firebase.ts          # Configuración de Firebase
  └── googleMaps.ts        # Configuración de Google Maps API
```

### Componentes
```
src/components/
  ├── GoogleAddressPicker.tsx    # Selector de direcciones con Google Maps
  ├── GoogleAddressPicker.css     # Estilos del selector
  └── MapPicker.tsx               # Mapa alternativo (OpenStreetMap)
```

### Páginas
```
src/pages/
  ├── RegistroMobile.tsx          # Registro mobile-first
  ├── RegistroMobile.css          # Estilos del registro
  ├── CompletarPerfilGoogle.tsx  # Perfil con Google Maps
  └── CompletarPerfil.tsx         # Perfil con OpenStreetMap
```

---

## 🔑 Variables de Entorno

### Desarrollo
Crea un archivo `.env` en la raíz del proyecto:

```env
# Firebase (opcional si está en firebase.ts)
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_dominio
VITE_FIREBASE_PROJECT_ID=tu_proyecto

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=tu_google_maps_api_key
```

### Producción
Configura las variables en Vercel o tu plataforma de hosting:
- Settings → Environment Variables

---

## 📊 Flujo de Trabajo Recomendado

### Para Nuevos Desarrolladores
1. Leer [README.md](./README.md)
2. Seguir [INSTALAR_DEPENDENCIAS.md](./INSTALAR_DEPENDENCIAS.md)
3. Configurar Firebase con [FIREBASE_DESARROLLO.md](./FIREBASE_DESARROLLO.md)
4. Configurar admin con [CONFIGURAR_ADMIN.md](./CONFIGURAR_ADMIN.md)

### Para Implementar Google Maps
1. Leer [GUIA_GOOGLE_MAPS.md](./GUIA_GOOGLE_MAPS.md)
2. Obtener API key de Google Cloud
3. Configurar `.env` con la API key
4. Usar `GoogleAddressPicker` en componentes

### Para Desplegar a Producción
1. Revisar [FIREBASE_PRODUCCION.md](./FIREBASE_PRODUCCION.md)
2. Seguir [GUIA_CAMBIO_DOMINIO_CLICKIO.md](./GUIA_CAMBIO_DOMINIO_CLICKIO.md)
3. Configurar variables de entorno en producción
4. Verificar reglas de seguridad

---

## 🆘 Solución Rápida de Problemas

| Problema | Guía |
|----------|------|
| Error al instalar dependencias | [INSTALAR_DEPENDENCIAS.md](./INSTALAR_DEPENDENCIAS.md) |
| Error de Firebase Storage | [SOLUCION_STORAGE_ERROR.md](./SOLUCION_STORAGE_ERROR.md) |
| No puedo acceder como admin | [CONFIGURAR_ADMIN.md](./CONFIGURAR_ADMIN.md) |
| Google Maps no funciona | [GUIA_GOOGLE_MAPS.md](./GUIA_GOOGLE_MAPS.md) |
| Error al desplegar | [INSTRUCCIONES_FIREBASE_CLI.md](./INSTRUCCIONES_FIREBASE_CLI.md) |
| Cambiar dominio | [GUIA_CAMBIO_DOMINIO_CLICKIO.md](./GUIA_CAMBIO_DOMINIO_CLICKIO.md) |
| Email de verificación no llega | [GUIA_VERIFICACION_EMAIL.md](./GUIA_VERIFICACION_EMAIL.md) |
| Emails van a spam | [GUIA_VERIFICACION_EMAIL.md](./GUIA_VERIFICACION_EMAIL.md) |
| Password manager no detecta formulario | [GUIA_PASSWORD_MANAGERS.md](./GUIA_PASSWORD_MANAGERS.md) |
| Advertencias de password manager | [GUIA_PASSWORD_MANAGERS.md](./GUIA_PASSWORD_MANAGERS.md) |

---

## 📝 Notas Importantes

### Seguridad
- ⚠️ **Nunca** commitees archivos `.env` o API keys
- ⚠️ Verifica las reglas de Firebase antes de desplegar
- ⚠️ Restringe las API keys de Google Maps por dominio

### Costos
- Google Maps tiene crédito mensual gratuito ($200 USD)
- Firebase tiene tier gratuito generoso
- Monitorea el uso en las consolas

### Mejores Prácticas
- Usa variables de entorno para configuración sensible
- Mantén las reglas de Firebase actualizadas
- Documenta cambios importantes
- Prueba en desarrollo antes de producción

---

## 🔄 Actualización de Guías

Este resumen se actualiza cuando se agregan nuevas guías. Para agregar una nueva guía:

1. Crea el archivo `.md` en la raíz del proyecto
2. Agrega una entrada en este resumen
3. Incluye enlace, propósito, contenido y cuándo usarla

---

## 📞 Soporte

Si una guía no resuelve tu problema:
1. Revisa la sección de troubleshooting de la guía correspondiente
2. Consulta la documentación oficial de las tecnologías
3. Revisa los issues del proyecto (si aplica)

---

**Última actualización:** Diciembre 2024  
**Versión del proyecto:** 0.0.0

