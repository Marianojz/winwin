# Subasta Argenta

Aplicación web moderna de subastas y tienda online desarrollada con React + TypeScript + Vite.

## 🚀 Características Principales

### Funcionalidades Implementadas

✅ **Sistema de Autenticación**
- Login y Registro de usuarios
- Validación de credenciales
- Panel de perfil de usuario
- Gestión de sesión

✅ **Módulo de Subastas**
- Listado de subastas activas
- Countdown en tiempo real
- Sistema de pujas con incrementos de $500
- Opción de compra directa (Buy Now)
- Visualización de últimas 3 ofertas
- Filtros por categoría y búsqueda

✅ **Módulo de Tienda**
- Catálogo de productos con stock en tiempo real
- Sistema de reseñas y ratings
- Carrito de compras
- Filtros y ordenamiento
- Integración con MercadoPago (mock)

✅ **Sistema de Notificaciones**
- Bandeja de notificaciones
- Alertas de subastas ganadas/superadas
- Recordatorios de pago
- Notificaciones de compras

✅ **Panel de Administración**
- Dashboard con estadísticas completas
- Gestión de usuarios
- Gestión de subastas y productos
- Sistema de Bots para ofertas automáticas
- Métricas y análisis en tiempo real

✅ **Diseño y UX**
- Modo día/noche
- Diseño responsive (mobile-first)
- Animaciones sutiles
- Paleta de colores argentina
- Tipografía moderna (Inter + Poppins)

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn

## 🛠️ Instalación

1. Navega al directorio del proyecto:
```bash
cd subasta-argenta
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

4. Abre tu navegador en `http://localhost:3000`

## 🎯 Uso

### Credenciales de Prueba

**Usuario Regular:**
- Email: cualquier email válido
- Contraseña: mínimo 6 caracteres

**Administrador:**
- Email: `admin@subastaargenta.com`
- Contraseña: cualquier contraseña (mínimo 6 caracteres)

### Navegación Principal

- **Inicio**: Vista general con subastas destacadas
- **Subastas**: Todas las subastas activas con filtros
- **Tienda**: Catálogo completo de productos
- **Panel Admin**: Solo para administradores (gestión completa)

### Funcionalidades Clave

#### Subastas
- Las ofertas deben ser múltiplos de $500
- Puedes comprar directamente con "Compra Ya"
- Si ganás, tenés 48hs para pagar
- Las últimas 3 ofertas se muestran en cada subasta

#### Tienda
- Stock en tiempo real
- Los carritos no aseguran el stock
- Pago con MercadoPago

#### Panel de Admin
- Ver estadísticas en tiempo real
- Crear y gestionar bots de ofertas automáticas
- Administrar subastas y productos
- Ver usuarios activos y métricas

## 🏗️ Estructura del Proyecto

```
src/
├── components/       # Componentes reutilizables
│   ├── Navbar.tsx
│   ├── ThemeToggle.tsx
│   ├── Countdown.tsx
│   ├── AuctionCard.tsx
│   └── ProductCard.tsx
├── pages/           # Páginas principales
│   ├── Home.tsx
│   ├── Subastas.tsx
│   ├── Tienda.tsx
│   ├── Login.tsx
│   ├── Registro.tsx
│   ├── Carrito.tsx
│   ├── Notificaciones.tsx
│   ├── Perfil.tsx
│   └── AdminPanel.tsx
├── store/           # Estado global (Zustand)
│   └── useStore.ts
├── types/           # Tipos TypeScript
│   └── index.ts
├── utils/           # Utilidades y helpers
│   ├── helpers.ts
│   └── mockData.ts
├── App.tsx          # Componente principal
├── main.tsx         # Punto de entrada
└── index.css        # Estilos globales
```

## 🎨 Sistema de Temas

La aplicación incluye modo día y noche con los siguientes colores:

**Modo Día:**
- Primary: #FF6B00 (Naranja)
- Secondary: #0044AA (Azul Argentino)
- Background: #cac8c8ff

**Modo Noche:**
- Primary: #FF8533
- Secondary: #3366CC
- Background: #121212

## 🤖 Sistema de Bots

Los administradores pueden crear bots que:
- Ofertan automáticamente en subastas
- Tienen saldo asignado
- Operan en intervalos configurables
- Pueden limitarse a subastas específicas
- Se activan/desactivan fácilmente

## 📱 Responsive Design

La aplicación está optimizada para:
- ✅ Móviles (320px+)
- ✅ Tablets (768px+)
- ✅ Desktop (1024px+)
- ✅ Large screens (1440px+)

## 🔒 Seguridad

- Validación de formularios
- Autenticación con JWT (preparado)
- Encriptación de contraseñas (preparado)
- Validación de DNI y direcciones

## 🚀 Compilación para Producción

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/`.

## 📦 Tecnologías Utilizadas

- **React 18** - Framework UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **Zustand** - Estado global
- **React Router** - Navegación
- **date-fns** - Manejo de fechas
- **Lucide React** - Iconos

## 🔮 Futuras Mejoras

- [ ] Integración real con Firebase
- [ ] Websockets para actualizaciones en tiempo real
- [ ] Sistema de chat entre usuarios
- [ ] Notificaciones push
- [ ] App móvil (React Native)
- [ ] Sistema de reputación de usuarios
- [ ] Búsqueda avanzada con filtros múltiples
- [ ] Sistema de favoritos
- [ ] Historial de transacciones completo

## 📄 Licencia

Este proyecto es un demo/prototipo para Subasta Argenta.

## 👨‍💻 Desarrollado con ❤️ por Claude

Para consultas: soporte@subastaargenta.com
