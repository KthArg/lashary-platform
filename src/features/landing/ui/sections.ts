export type SiteSection = { id: string; label: string }

// Servicios (US-LAND-02). El id es el ancla que usan la cabecera y el menú; la sección se
// renderiza siempre, incluso sin técnicas, para que ese ancla nunca apunte al vacío.
export const TECHNIQUES_SECTION: SiteSection = { id: 'servicios', label: 'Servicios' }

// El estudio (US-LAND-04). Por qué acá, que va debajo, no tiene enlace en la navegación, como
// en el diseño.
export const STUDIO_SECTION: SiteSection = { id: 'estudio', label: 'El estudio' }

// Galería (US-LAND-03). Como Servicios, se renderiza siempre para que el ancla exista.
export const GALLERY_SECTION: SiteSection = { id: 'galeria', label: 'Galería' }

// Fidelidad (US-LAND-05). No está en el diseño: va después de Galería, con el mismo lenguaje.
export const LOYALTY_SECTION: SiteSection = { id: 'fidelidad', label: 'Fidelidad' }

// Preguntas y Ubicación (US-LAND-07).
export const FAQ_SECTION: SiteSection = { id: 'preguntas', label: 'Preguntas' }
export const LOCATION_SECTION: SiteSection = { id: 'ubicacion', label: 'Ubicación' }

// Secciones de la landing que aparecen en la navegación, en orden. Cada historia agrega la suya
// al montarla.
export const landingSections: readonly SiteSection[] = [
  TECHNIQUES_SECTION,
  STUDIO_SECTION,
  GALLERY_SECTION,
  LOYALTY_SECTION,
  FAQ_SECTION,
  LOCATION_SECTION,
]
