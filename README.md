# 🏆 Subasta Argenta

Aplicación web moderna de subastas y tienda online desarrollada con React + TypeScript + Vite + Firebase. Plataforma completa para gestión de subastas en tiempo real, tienda online, sistema de mensajería y panel administrativo avanzado.

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Funcionalidades Implementadas](#-funcionalidades-implementadas)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Mejoras Futuras](#-mejoras-futuras)
- [Problemas Conocidos y Mejoras Pendientes](#-problemas-conocidos-y-mejoras-pendientes)

## 🚀 Características Principales

### Funcionalidades Implementadas

#### ✅ Sistema de Autenticación Completo
- **Registro de usuarios** con validación completa
- **Login/Logout** con Firebase Authentication
- **Verificación de email** obligatoria
- **Autenticación con Google** (opcional)
- **Recuperación de contraseña** (preparado)
- **Perfil de usuario** editable con mapa interactivo
- **Campos obligatorios:** Email, DNI, Teléfono, Ubicación en mapa

#### ✅ Sistema de Subastas en Tiempo Real
- **Subastas activas** con countdown en tiempo real
- **Sistema de pujas** con incrementos mínimos de $500
- **Opción de compra directa** (Buy Now) cuando está disponible
- **Visualización de últimas ofertas** (top 3)
- **Filtros avanzados:** Categoría, búsqueda, estado
- **Tracking de clicks:** Cada click en una subasta se registra automáticamente
- **Tracking de búsquedas:** Las búsquedas se registran con debounce (1 segundo)
- **Gestión automática** de finalización de subastas
- **Notificaciones automáticas** al ganar o ser superado
- **Stickers visuales** para destacar subastas (✨ Nuevo, 🔥 Hot Sale, etc.)
- **Republicación de subastas** desde el panel admin
- **Sincronización con Firebase Realtime Database**
- **Filtrado automático** de subastas corruptas o antiguas (>3 días finalizadas)

#### ✅ Tienda Online Completa
- **Catálogo de productos** con stock en tiempo real
- **Sistema de reseñas y ratings** (implementado)
- **Carrito de compras** persistente
- **Filtros y ordenamiento** por precio, categoría, relevancia
- **Productos destacados** y categorías
- **Tracking de clicks:** Cada click en un producto se registra automáticamente
- **Tracking de búsquedas:** Las búsquedas se registran con debounce (1 segundo)
- **Gestión de stock** automática
- **Stickers visuales** para productos
- **Badges:** Nuevo, Oferta, 50% OFF, Destacado, etc.

#### ✅ Sistema de Notificaciones Inteligente
- **Bandeja de notificaciones** completa
- **Notificaciones automáticas** para:
  - Subastas ganadas
  - Ofertas superadas
  - Recordatorios de pago
  - Compras realizadas
  - Mensajes nuevos
- **Marcar como leído** individual o todas
- **Limpieza automática inteligente:**
  - Notificaciones leídas: eliminadas después de 2 días
  - Notificaciones no leídas: eliminadas después de 7 días
- **Persistencia correcta** del estado de lectura (problema de reaparición solucionado)
- **Contador de no leídas** en navbar
- **Normalización estricta** de estados (boolean estricto)

#### ✅ Sistema de Mensajería Admin-Usuario
- **Chat entre admin y usuarios** en tiempo real
- **Mensajes automáticos** generados al:
  - Ganar una subasta
  - Completar una compra
  - Requerir pago (recordatorios)
  - Enviar pedido
  - Entregar pedido
  - Ser superado en subasta
- **Templates personalizables:** Los mensajes automáticos usan templates editables desde el panel admin
- **Notificaciones** cuando hay mensajes nuevos
- **Interfaz de chat** moderna y responsive
- **Gestión de conversaciones** en panel admin:
  - Selector de usuario para enviar mensaje nuevo
  - Eliminar mensajes individuales
  - Eliminar conversaciones completas
- **Limpieza de conversaciones** individual o masiva

#### ✅ Panel de Administración Avanzado
- **Dashboard completo** con estadísticas en tiempo real:
  - Ingresos por subastas y tienda (separados)
  - Ganancia neta calculada
  - Subastas activas, finalizadas, programadas
  - Productos en stock, sin stock, destacados
  - Usuarios activos, bots, pedidos pendientes
  - **Items más buscados** (top 10 con promedio de resultados)
  - **Items más cliqueados** (top 10 productos y subastas)
  - Alertas de pedidos pendientes, subastas finalizando, stock bajo
  - Actividad reciente con botón de limpieza
- **Gestión de Usuarios:**
  - Listado completo con filtros
  - Edición de datos de usuario
  - Edición de ubicación en mapa
  - Suspensión/activación de usuarios
  - Visualización de detalles completos
- **Gestión de Subastas:**
  - Crear, editar, eliminar subastas
  - Republicar subastas finalizadas
  - Programar subastas futuras
  - Agregar stickers visuales
  - 15 categorías disponibles
- **Gestión de Productos:**
  - Crear, editar, eliminar productos
  - Control de stock
  - Productos destacados
  - Badges y stickers
- **Gestión de Pedidos (Mejorada):**
  - Dashboard con estadísticas rápidas (Pendientes, Confirmados, En Tránsito, Entregados)
  - Botón de limpieza de pedidos antiguos (entregados/cancelados >30 días)
  - Tabla profesional con columnas: Pedido, Cliente, Monto, Estado, Fecha, Acciones
  - Filtros avanzados (búsqueda por ID, cliente, monto, estado)
  - Sistema de avance de estado con confirmaciones
  - Botón "Siguiente" para avanzar estado automáticamente
  - Resumen de totales (cantidad y valor total)
- **Sistema de Bots (Completamente Profesionalizado):**
  - Dashboard con estadísticas rápidas (Activos, Balance Total, Ofertas Máx, En Subastas)
  - Botón "Desactivar Todos" para acción masiva
  - Formulario colapsable para crear bots con validaciones:
    - Nombre del bot
    - Balance inicial (mínimo $100)
    - Oferta máxima (mínimo $100)
    - Intervalo mínimo y máximo (1-300 segundos)
  - Tabla profesional con: Nombre, Balance, Oferta Máx, Intervalo, Estado, Ofertas, Acciones
  - Filtros (búsqueda por nombre, filtro por estado)
  - Acciones individuales por bot:
    - Recargar balance
    - Activar/Desactivar
    - Editar oferta máxima
    - Eliminar bot
  - Resumen de totales (cantidad de bots y balance total)
- **Editor de Página de Inicio (Completamente Renovado):**
  - **Sección Hero:**
    - Edición de título principal
    - Edición de subtítulo
    - **Imagen con drag & drop:** arrastrá y soltá imágenes o seleccioná archivos
    - Conversión automática a Base64
    - Preview en tiempo real
    - Alternativa de URL manual
  - **Sistema de Banners:**
    - Crear, editar, eliminar banners
    - Título, descripción, imagen (drag & drop), link, texto del botón
    - Control de orden de visualización
    - Activar/desactivar individualmente
    - Preview de imágenes
  - **Sistema de Promociones:**
    - Crear, editar, eliminar promociones
    - Título, descripción, imagen (drag & drop), link
    - Fechas de inicio y fin
    - Activar/desactivar
    - Preview de imágenes
- **Templates de Mensajes Automáticos (NUEVO):**
  - Editor completo para personalizar mensajes automáticos
  - 6 tipos de templates editables:
    - Ganador de Subasta (`auction_won`)
    - Compra Confirmada (`purchase`)
    - Recordatorio de Pago (`payment_reminder`)
    - Pedido Enviado (`order_shipped`)
    - Pedido Entregado (`order_delivered`)
    - Superado en Subasta (`auction_outbid`)
  - Variables dinámicas clicables para copiar (`{username}`, `{amount}`, `{orderId}`, etc.)
  - Vista previa en tiempo real con datos de ejemplo
  - Activar/desactivar templates individualmente
  - Los templates personalizados se usan automáticamente cuando están activos
- **Sistema de Tracking (NUEVO):**
  - Seguimiento de clicks en productos y subastas
  - Seguimiento de búsquedas con debounce (1 segundo)
  - Estadísticas de más buscado y más cliqueado en Dashboard
  - Integración con sistema de logs
- **Sistema de Logs:**
  - Registro de todas las acciones admin
  - Logs de subastas, productos, pedidos, usuarios
  - Historial completo con timestamps
- **Sección de Configuración (Mejorada):**
  - Templates de mensajes editables
  - Estadísticas del sistema con cards con gradientes
  - Limpieza de datos (con reglas claras)
  - Reset del sistema (zona peligrosa)
- **Reset del Sistema:**
  - Limpieza completa preservando usuarios y logs

#### ✅ Sistema de Limpieza Automática
- **Limpieza automática de datos antiguos:**
  - Notificaciones después de 7 días
  - Subastas finalizadas después de 7 días (configurable)
  - Pedidos completados después de 30 días
- **Ejecución automática** al iniciar la app y cada 6 horas
- **Logs detallados** de limpieza

#### ✅ Diseño y UX Mejorado
- **Modo día/noche** con toggle
- **Diseño 100% responsive:**
  - Navbar adaptativo (desktop vs mobile)
  - Formularios optimizados para móvil
  - Touch targets adecuados
  - Grids adaptativos
- **Animaciones y efectos visuales:**
  - Fade-in, slide-in, bounce
  - Hover effects (lift, scale, glow)
  - Loading spinners
  - Skeleton loading
  - Toast notifications
  - Transiciones suaves
- **Paleta de colores argentina:**
  - Primary: #FF6B00 (Naranja)
  - Secondary: #0044AA (Azul Argentino)
- **Tipografía moderna:** Inter + Poppins
- **Glassmorphism** en navbar

#### ✅ Gestión de Estado y Persistencia
- **Zustand** para estado global
- **LocalStorage** para persistencia:
  - Usuario autenticado
  - Subastas y productos
  - Carrito de compras
  - Notificaciones por usuario
  - Tema (día/noche)
  - Configuración del home
  - Mensajes y conversaciones
- **Firebase Firestore** para usuarios
- **Firebase Realtime Database** para subastas en tiempo real

## 📋 Requisitos Previos

- **Node.js** 18+ 
- **npm** o **yarn**
- **Firebase** proyecto configurado (para autenticación y base de datos)

## 🛠️ Instalación

1. **Clona el repositorio:**
```bash
git clone https://github.com/Marianojz/winwin.git
cd winwin
```

2. **Instala las dependencias:**
```bash
npm install
```

3. **Configura Firebase:**
   - Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
   - Habilita Authentication (Email/Password y Google)
   - Crea una Firestore Database
   - Crea una Realtime Database
   - Copia las credenciales a `src/config/firebase.ts`

4. **Inicia el servidor de desarrollo:**
```bash
npm run dev
```

5. **Abre tu navegador en** `http://localhost:5173` (puerto por defecto de Vite)

## 🎯 Uso

### Para Usuarios

1. **Registrate:**
   - Completa email, contraseña, DNI, teléfono
   - Selecciona tu ubicación en el mapa (obligatorio)
   - Verifica tu email

2. **Explora:**
   - Navega por subastas activas
   - Explora la tienda
   - Usa filtros y búsqueda

3. **Participa:**
   - Haz ofertas en subastas (mínimo $500 más que la actual)
   - Compra productos de la tienda
   - Revisa tus notificaciones
   - Comunicate con el admin desde tu perfil

### Para Administradores

1. **Accede al Panel:**
   - Inicia sesión como admin
   - Ve a `/admin`

2. **Dashboard:**
   - Revisa estadísticas en tiempo real
   - Ve alertas importantes
   - Accede a secciones desde las tarjetas de alerta

3. **Gestiona Contenido:**
   - Crea subastas y productos
   - Edita usuarios y sus ubicaciones
   - Gestiona pedidos
   - Personaliza la página de inicio

4. **Sistema de Mensajería:**
   - Comunicate con usuarios desde el panel
   - Ve conversaciones y mensajes nuevos

## 🏗️ Estructura del Proyecto

```
winwin/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── AuctionCard.tsx      # Tarjeta de subasta
│   │   ├── ProductCard.tsx      # Tarjeta de producto
│   │   ├── Countdown.tsx        # Countdown timer
│   │   ├── Navbar.tsx           # Barra de navegación (responsive)
│   │   ├── ThemeToggle.tsx      # Toggle día/noche
│   │   ├── LoadingSpinner.tsx   # Spinner de carga
│   │   ├── ToastContainer.tsx   # Contenedor de toasts
│   │   ├── UserDetailsModal.tsx # Modal de detalles de usuario
│   │   ├── MapPicker.tsx        # Selector de mapa
│   │   ├── ImageUploader.tsx    # Subida de imágenes
│   │   └── StatsCard.tsx        # Tarjeta de estadísticas
│   │
│   ├── pages/               # Páginas principales
│   │   ├── Home.tsx             # Página de inicio (editable)
│   │   ├── Subastas.tsx         # Listado de subastas
│   │   ├── AuctionDetail.tsx    # Detalle de subasta
│   │   ├── Tienda.tsx           # Listado de productos
│   │   ├── ProductDetail.tsx    # Detalle de producto
│   │   ├── Login.tsx            # Login
│   │   ├── Registro.tsx         # Registro (con validación)
│   │   ├── Carrito.tsx          # Carrito de compras
│   │   ├── Notificaciones.tsx   # Bandeja de notificaciones
│   │   ├── Perfil.tsx           # Perfil de usuario (con mensajería)
│   │   ├── AdminPanel.tsx       # Panel de administración
│   │   ├── CompletarPerfil.tsx  # Completar perfil inicial
│   │   ├── Terminos.tsx         # Términos y condiciones
│   │   └── Preguntas.tsx        # Preguntas frecuentes
│   │
│   ├── store/               # Estado global (Zustand)
│   │   └── useStore.ts          # Store principal con:
│   │                            # - Usuario y autenticación
│   │                            # - Subastas y productos
│   │                            # - Carrito
│   │                            # - Notificaciones
│   │                            # - Bots
│   │                            # - Pedidos
│   │
│   ├── types/               # Tipos TypeScript
│   │   ├── index.ts            # Tipos principales
│   │   └── homeConfig.ts       # Configuración del home
│   │
│   ├── utils/               # Utilidades
│   │   ├── helpers.ts          # Funciones auxiliares
│   │   ├── mockData.ts         # Datos mock (categorías, etc.)
│   │   ├── actionLogger.ts     # Sistema de logs
│   │   ├── messages.ts          # Sistema de mensajería
│   │   ├── messageTemplates.ts # Templates de mensajes automáticos (NUEVO)
│   │   ├── tracking.ts         # Sistema de tracking (NUEVO)
│   │   ├── stickers.ts         # Stickers disponibles
│   │   ├── dataCleaner.ts      # Limpieza automática
│   │   ├── AuctionManager.tsx  # Gestor de subastas
│   │   ├── OrderManager.tsx    # Gestor de pedidos
│   │   ├── DataCleanupManager.tsx # Gestor de limpieza
│   │   ├── toast.ts            # Sistema de toasts
│   │   ├── sounds.ts           # Efectos de sonido
│   │   └── celebrations.ts     # Efectos visuales
│   │
│   ├── hooks/               # Custom hooks
│   │   ├── useSyncFirebase.ts     # Sincronización Firebase
│   │   ├── useFirebaseRealtime.ts # Realtime Database
│   │   └── useMediaQuery.ts       # Detección de móvil
│   │
│   ├── config/              # Configuración
│   │   └── firebase.ts          # Configuración Firebase
│   │
│   ├── App.tsx              # Componente principal
│   ├── main.tsx             # Punto de entrada
│   └── index.css            # Estilos globales
│
├── public/                  # Archivos estáticos
├── package.json             # Dependencias
├── tsconfig.json           # Configuración TypeScript
├── vite.config.ts          # Configuración Vite
└── README.md               # Este archivo
```

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **React Router v6** - Navegación
- **Zustand** - Estado global
- **Lucide React** - Iconos modernos
- **date-fns** - Manejo de fechas

### Backend/Base de Datos
- **Firebase Authentication** - Autenticación de usuarios
- **Firebase Firestore** - Base de datos NoSQL para usuarios
- **Firebase Realtime Database** - Subastas en tiempo real
- **LocalStorage** - Persistencia local

### UI/UX
- **CSS3** - Estilos modernos con variables CSS
- **Responsive Design** - Mobile-first approach
- **Animaciones CSS** - Transiciones suaves
- **React Leaflet** - Mapas interactivos

## 🎨 Características de Diseño

### Sistema de Temas

**Modo Día:**
- Primary: `#FF6B00` (Naranja)
- Secondary: `#0044AA` (Azul Argentino)
- Background: `#cac8c8ff`
- Text: `#1a1a1a`

**Modo Noche:**
- Primary: `#FF8533`
- Secondary: `#3366CC`
- Background: `#121212`
- Text: `#ffffff`

### Responsive Breakpoints
- **Mobile:** 320px - 768px
- **Tablet:** 768px - 1024px
- **Desktop:** 1024px+
- **Large:** 1440px+

### Componentes con Efectos Visuales
- Hover lift, scale, glow
- Fade-in animations
- Loading skeletons
- Toast notifications
- Glassmorphism en navbar
- Confetti effects en victorias

## 📊 Estadísticas del Proyecto

- **Archivos de código:** 55+
- **Componentes React:** 15+
- **Páginas:** 12
- **Utilidades:** 17+
- **Tipos TypeScript:** 25+
- **Categorías de productos:** 15
- **Templates de mensajes:** 6 tipos editables
- **Sistema de tracking:** Completo (clicks y búsquedas)

## 🔒 Seguridad

- ✅ Validación de formularios completa
- ✅ Autenticación con Firebase (segura)
- ✅ Verificación de email obligatoria
- ✅ Validación de DNI y teléfono
- ✅ Protección de rutas admin
- ✅ Sanitización de datos de entrada
- ✅ Validación de ofertas (mínimos, múltiplos)

## 🚀 Compilación para Producción

```bash
# Compilar
npm run build

# Preview de producción
npm run preview

# Linting
npm run lint
```

Los archivos optimizados se generarán en `dist/`.

## ⚠️ Problemas Conocidos y Mejoras Pendientes

### 🔴 Problemas Críticos Corregidos
- ✅ Archivos duplicados eliminados
- ✅ Rutas duplicadas corregidas
- ✅ Errores de tipos en formularios corregidos
- ✅ Memory leaks en timers corregidos
- ✅ Problemas de logout inesperado corregidos

### 🟡 Mejoras Recomendadas (No Críticas)

#### 1. Tipado Estricto
- **Problema:** Uso excesivo de `any` (25+ instancias)
- **Ubicación:** `useStore.ts`, `dataCleaner.ts`, `DataCleanupManager.tsx`
- **Impacto:** Bajo (funcional, pero menos seguro)
- **Prioridad:** Media
- **Solución:** Reemplazar con tipos específicos (`Auction[]`, `Order[]`, `Notification[]`)

#### 2. Sistema de Logging
- **Problema:** Console.logs excesivos (27+ instancias)
- **Ubicación:** Múltiples archivos
- **Impacto:** Bajo (desarrollo), Medio (producción)
- **Prioridad:** Media
- **Solución:** Crear `utils/logger.ts` con niveles (debug, info, warn, error) y deshabilitar en producción

#### 3. Optimización de Performance
- **Recomendaciones:**
  - Implementar `React.memo` en componentes pesados
  - Revisar dependencias de `useEffect`
  - Optimizar re-renders innecesarios
  - Lazy loading de componentes grandes

#### 4. Testing
- **Actual:** Sin tests
- **Recomendado:**
  - Tests unitarios para funciones críticas
  - Tests de integración para flujos principales
  - Tests E2E para flujos de usuario

#### 5. Documentación de API
- **Faltante:** Documentación de funciones internas
- **Recomendado:** JSDoc para funciones principales

## 🔮 Futuras Mejoras Planificadas

### Funcionalidades
- [ ] **Websockets** para actualizaciones en tiempo real más eficientes
- [ ] **Notificaciones push** del navegador
- [ ] **Sistema de favoritos** para usuarios
- [ ] **Historial completo** de transacciones con exportación
- [ ] **Búsqueda avanzada** con múltiples filtros
- [ ] **Sistema de reputación** de usuarios
- [ ] **Chat entre usuarios** (no solo admin)
- [ ] **Sistema de reseñas** de productos más completo
- [ ] **Integración real con MercadoPago** (actualmente mock)
- [ ] **App móvil** (React Native)

### Técnicas
- [ ] **Sistema de logging centralizado**
- [ ] **Tipado estricto** completo (eliminar `any`)
- [ ] **Testing** (unit, integration, E2E)
- [ ] **PWA** (Progressive Web App)
- [ ] **Service Workers** para offline
- [ ] **Optimización de imágenes** automática
- [ ] **CDN** para assets estáticos
- [ ] **SEO** mejorado (meta tags, sitemap)

## 📝 Notas de Desarrollo

### Configuración Actual
- **TypeScript:** `strict: true`
- **React:** Modo estricto activado
- **Vite:** HMR (Hot Module Replacement) activado
- **Firebase:** Autenticación y Realtime Database activos

### Estructura de Datos

**Usuario (Firestore):**
```typescript
{
  id: string
  email: string
  username: string
  dni: string
  phone: string
  address: Address
  isAdmin: boolean
  active: boolean
  createdAt: Date
}
```

**Subasta (Realtime DB + LocalStorage):**
```typescript
{
  id: string
  title: string
  description: string
  startingPrice: number
  currentPrice: number
  status: 'active' | 'ended' | 'scheduled'
  stickers?: string[]
  bids: Bid[]
  endTime: Date
}
```

**Producto (LocalStorage):**
```typescript
{
  id: string
  name: string
  price: number
  stock: number
  stickers?: string[]
  badges?: string[]
  active: boolean
  featured: boolean
}
```

## 🤝 Contribución

Este es un proyecto en desarrollo activo. Para contribuir:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es un demo/prototipo para Subasta Argenta.

## 👨‍💻 Autor

Desarrollado con ❤️ para Subasta Argenta

## 📞 Soporte

Para consultas o soporte técnico, contacta a través de los canales oficiales del proyecto.

---

**Versión:** 2.0.0  
**Última actualización:** Diciembre 2024  
**Estado:** ✅ En desarrollo activo - Funcional

## 🆕 Últimas Actualizaciones (v2.0.0)

### ✨ Nuevas Funcionalidades
- **Sistema de Templates de Mensajes Automáticos:** Editor completo para personalizar mensajes automáticos con variables dinámicas
- **Editor de Página de Inicio Renovado:** Drag & drop de imágenes, gestión completa de banners y promociones
- **Sistema de Tracking:** Seguimiento de clicks y búsquedas con estadísticas en Dashboard
- **Sección de Bots Profesionalizada:** Dashboard, tabla profesional, gestión avanzada
- **Sección de Pedidos Mejorada:** Dashboard con estadísticas, tabla profesional, acciones rápidas
- **Mejoras en Configuración:** Templates editables, estadísticas mejoradas, limpieza profesionalizada

### 🐛 Correcciones Importantes
- ✅ Sistema de notificaciones: Persistencia correcta del estado de lectura
- ✅ Eliminación de duplicados en pedidos
- ✅ Filtrado automático de subastas corruptas
- ✅ Mejoras en proceso de login (especialmente móvil)
- ✅ Optimización responsive en todo el panel admin

### 📈 Mejoras de UX/UI
- ✅ Drag & drop de imágenes en Editor Home
- ✅ Preview en tiempo real de todas las imágenes
- ✅ Variables clicables para copiar en templates
- ✅ Vista previa de templates con datos de ejemplo
- ✅ Cards con gradientes en estadísticas
- ✅ Tablas profesionales en todas las secciones
