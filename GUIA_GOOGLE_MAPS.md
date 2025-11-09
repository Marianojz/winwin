# 🗺️ Guía de Implementación: Google Maps/Places API

Esta guía explica cómo configurar y usar el componente `GoogleAddressPicker` con la API de Google Maps/Places.

## 📋 Requisitos Previos

1. **Cuenta de Google Cloud Platform**
2. **Proyecto en Google Cloud Console**
3. **API Key de Google Maps** con las siguientes APIs habilitadas:
   - Maps JavaScript API
   - Places API
   - Geocoding API

## 🔑 Paso 1: Obtener API Key de Google Maps

### 1.1. Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el nombre del proyecto

### 1.2. Habilitar APIs Necesarias

1. Ve a **APIs & Services** → **Library**
2. Busca y habilita las siguientes APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**

### 1.3. Crear API Key

1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **Create Credentials** → **API Key**
3. Copia la API key generada
4. (Opcional pero recomendado) Restringe la API key:
   - Haz clic en la API key creada
   - En **Application restrictions**, selecciona **HTTP referrers**
   - Agrega tus dominios (ej: `localhost:5173`, `tu-dominio.com`)
   - En **API restrictions**, selecciona solo las APIs que necesitas

## ⚙️ Paso 2: Configurar en el Proyecto

### 2.1. Crear Archivo .env

En la raíz del proyecto, crea un archivo `.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

### 2.2. Verificar Configuración

El archivo `src/config/googleMaps.ts` ya está configurado para leer la variable de entorno:

```typescript
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
```

Si no usas variables de entorno, puedes reemplazar directamente el valor en `src/config/googleMaps.ts`.

## 🚀 Paso 3: Usar el Componente

### 3.1. Importar el Componente

```typescript
import GoogleAddressPicker, { AddressData } from '../components/GoogleAddressPicker';
import { GOOGLE_MAPS_CONFIG } from '../config/googleMaps';
```

### 3.2. Ejemplo Básico

```typescript
const [addressData, setAddressData] = useState<AddressData | null>(null);

const handleAddressSelect = (address: AddressData) => {
  setAddressData(address);
  console.log('Dirección seleccionada:', address);
};

return (
  <GoogleAddressPicker
    onAddressSelect={handleAddressSelect}
    apiKey={GOOGLE_MAPS_CONFIG.apiKey}
    countryRestriction="ar" // Opcional, por defecto 'ar'
  />
);
```

### 3.3. Ejemplo Completo (Ver `CompletarPerfilGoogle.tsx`)

El archivo `src/pages/CompletarPerfilGoogle.tsx` muestra un ejemplo completo de cómo integrar el componente en un formulario.

## 📦 Estructura de Datos

### AddressData

```typescript
interface AddressData {
  formatted: string;              // Dirección completa formateada
  components: AddressComponents;    // Componentes desglosados
  coordinates: {
    lat: number;
    lng: number;
  };
  placeId?: string;                // ID único del lugar en Google
}
```

### AddressComponents

```typescript
interface AddressComponents {
  street: string;          // Calle (ej: "Av. Corrientes")
  streetNumber: string;   // Número (ej: "1234")
  floor: string;          // Piso (ej: "2")
  apartment: string;      // Departamento (ej: "A")
  crossStreets: string;   // Calles laterales
  locality: string;       // Localidad (ej: "Buenos Aires")
  province: string;       // Provincia (ej: "CABA")
  postalCode: string;     // Código postal
  country: string;        // País
}
```

## ✨ Funcionalidades

### ✅ Autocompletado Predictivo
- Búsqueda en tiempo real mientras escribís
- Sugerencias basadas en direcciones reales
- Restricción por país (Argentina por defecto)

### ✅ Desglose de Campos
- Calle y número
- Piso y departamento
- Calles laterales
- Localidad, provincia y código postal

### ✅ Mapa Interactivo
- Marcador arrastrable
- Clic en el mapa para seleccionar ubicación
- Geocodificación inversa automática

### ✅ Validación
- Verificación automática de direcciones
- Indicador visual de estado
- Actualización de coordenadas en tiempo real

### ✅ Optimización Mobile
- Campos centrados verticalmente
- Scroll suave entre secciones
- Ajuste automático al enfocar inputs
- Agrupación visual de campos relacionados

## 🎨 Personalización

### Cambiar Restricción de País

```typescript
<GoogleAddressPicker
  apiKey={GOOGLE_MAPS_API_KEY}
  countryRestriction="ar"  // 'ar' para Argentina, 'us' para USA, etc.
/>
```

### Estilos CSS

Los estilos están en `src/components/GoogleAddressPicker.css`. Puedes personalizar:
- Colores usando variables CSS del tema
- Tamaños de campos
- Altura del mapa
- Espaciado y márgenes

## 🔒 Seguridad

### Restricciones Recomendadas para API Key

1. **HTTP Referrers**: Limita a tus dominios
   ```
   localhost:5173/*
   tu-dominio.com/*
   *.tu-dominio.com/*
   ```

2. **API Restrictions**: Solo las APIs necesarias
   - Maps JavaScript API
   - Places API
   - Geocoding API

3. **Cuotas**: Configura límites diarios en Google Cloud Console

## 🐛 Solución de Problemas

### Error: "This API key is not authorized"

- Verifica que las APIs estén habilitadas
- Revisa las restricciones de la API key
- Asegúrate de que el dominio esté en la lista de referrers permitidos

### El mapa no se muestra

- Verifica que la API key sea válida
- Revisa la consola del navegador para errores
- Asegúrate de que `GOOGLE_MAPS_API_KEY` tenga un valor

### Autocompletado no funciona

- Verifica que Places API esté habilitada
- Revisa que la API key tenga permisos para Places API
- Verifica las restricciones de la API key

### Geocodificación inversa no funciona

- Verifica que Geocoding API esté habilitada
- Revisa las cuotas en Google Cloud Console
- Verifica que la API key tenga permisos

## 📊 Costos

Google Maps ofrece un crédito mensual gratuito:
- **$200 USD** por mes (equivalente a ~28,000 cargas de mapa)
- Después del crédito, se cobra por uso

Consulta los precios actuales en: [Google Maps Pricing](https://cloud.google.com/maps-platform/pricing)

## 📚 Recursos Adicionales

- [Google Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [Places API Docs](https://developers.google.com/maps/documentation/places/web-service)
- [Geocoding API Docs](https://developers.google.com/maps/documentation/geocoding)

## ✅ Checklist de Implementación

- [ ] Crear proyecto en Google Cloud Console
- [ ] Habilitar Maps JavaScript API
- [ ] Habilitar Places API
- [ ] Habilitar Geocoding API
- [ ] Crear API key
- [ ] Configurar restricciones de API key
- [ ] Agregar API key al archivo `.env`
- [ ] Probar componente localmente
- [ ] Configurar variables de entorno en producción (Vercel, etc.)
- [ ] Probar en producción

