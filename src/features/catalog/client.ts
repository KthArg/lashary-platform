// Entry point público para Client Components (ARCH-003). A diferencia de index.ts, esta
// superficie es intencionalmente mínima: solo reexporta lo que no depende de next/headers
// (index.ts sí, vía techniqueRepository). Los boundaries de ruta que corren en el cliente
// (loading.tsx, error.tsx) importan de aquí para no arrastrar código de servidor al bundle.
export { catalogMessages } from './ui/messages'
