# Guía de Instalación - Proyecto WinWin

## Paso 1: Instalar Node.js (OBLIGATORIO)

1. **Descarga Node.js LTS:**
   - Ve a: https://nodejs.org/
   - Descarga la versión **LTS** (Long Term Support)
   - Ejecuta el instalador `.msi`

2. **Durante la instalación:**
   - ✅ Marca la opción "Automatically install the necessary tools"
   - ✅ Asegúrate de que Node.js se agregue al PATH

3. **Verificar instalación:**
   - Cierra y vuelve a abrir PowerShell
   - Ejecuta: `node --version` (debe mostrar la versión, ej: v20.x.x)
   - Ejecuta: `npm --version` (debe mostrar la versión, ej: 10.x.x)

## Paso 2: Instalar dependencias del proyecto

Una vez que Node.js esté instalado, ejecuta en PowerShell:

```powershell
npm install
```

## Paso 3: Iniciar servidor de desarrollo

```powershell
npm run dev
```

El servidor se iniciará y verás algo como:
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Abre tu navegador en `http://localhost:5173/` para ver el proyecto.

## Comandos disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Compila para producción
- `npm run preview` - Previsualiza build de producción
- `npm run lint` - Verifica código con ESLint

## Solución de problemas

### Si npm install falla:
- Verifica que Node.js esté instalado: `node --version`
- Limpia caché: `npm cache clean --force`
- Elimina `package-lock.json` y `node_modules` (si existen) y vuelve a ejecutar `npm install`

### Si el puerto 5173 está ocupado:
- Vite usará automáticamente el siguiente puerto disponible
- O puedes especificar otro puerto: `npm run dev -- --port 3000`

