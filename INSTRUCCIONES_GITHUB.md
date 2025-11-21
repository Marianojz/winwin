# 📦 Instrucciones para Crear Repositorio en GitHub

## Opción 1: Usar el Script Automático

Ejecuta el script que creé:

```powershell
.\crear-repositorio-github.ps1
```

El script te guiará paso a paso.

## Opción 2: Hacerlo Manualmente

### Paso 1: Crear el Repositorio en GitHub

1. Ve a: https://github.com/new
2. **Repository name:** `estable-con-seguridad`
3. **Description:** `Versión estable del proyecto con todas las correcciones de seguridad aplicadas`
4. Elige si será **público** o **privado**
5. **NO** marques:
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
6. Haz clic en **"Create repository"**

### Paso 2: Cambiar el Remoto

Ejecuta estos comandos en tu terminal:

```powershell
# Cambiar el remoto
git remote set-url origin https://github.com/Marianojz/estable-con-seguridad.git

# Verificar que cambió
git remote -v

# Subir la rama
git push -u origin estable-con-seguridad
```

### Paso 3: (Opcional) Hacer esta rama la principal

Si quieres que `estable-con-seguridad` sea la rama principal:

1. Ve a Settings del repositorio en GitHub
2. Branches → Default branch
3. Cambia de `main` a `estable-con-seguridad`

---

## ✅ Estado Actual

- ✅ Rama `estable-con-seguridad` creada localmente
- ✅ Rama subida a: https://github.com/Marianojz/winwin (rama `estable-con-seguridad`)
- ⏳ Pendiente: Crear nuevo repositorio `estable-con-seguridad` y cambiar remoto

---

## 📝 Nota

El repositorio actual (`winwin`) ya tiene la rama `estable-con-seguridad` subida. Si prefieres mantener todo en el mismo repositorio, puedes simplemente usar esa rama.

Si quieres un repositorio completamente separado, sigue las instrucciones arriba.

