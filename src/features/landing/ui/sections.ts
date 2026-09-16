export type SiteSection = { id: string; label: string }

// Secciones de la landing que aparecen en la navegación, en orden. Cada historia agrega la suya
// al montarla (Servicios US-LAND-02, El estudio US-LAND-04, Galería US-LAND-03, Ubicación
// US-LAND-07). Hoy no hay ninguna: listar anclas a secciones que no existen dejaría enlaces rotos.
export const landingSections: readonly SiteSection[] = []
