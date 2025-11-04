/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string
  // más variables de entorno aquí si es necesario
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

