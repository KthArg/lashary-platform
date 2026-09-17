export type SiteSection = { id: string; label: string }

// Servicios (US-LAND-02). El id es el ancla que usan la cabecera y el menú; la sección se
// renderiza siempre, incluso sin técnicas, para que ese ancla nunca apunte al vacío.
export const TECHNIQUES_SECTION: SiteSection = { id: 'servicios', label: 'Servicios' }

// Secciones de la landing que aparecen en la navegación, en orden. Cada historia agrega la suya
// al montarla (El estudio US-LAND-04, Galería US-LAND-03, Ubicación US-LAND-07).
export const landingSections: readonly SiteSection[] = [TECHNIQUES_SECTION]
