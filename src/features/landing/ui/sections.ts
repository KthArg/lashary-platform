export type SiteSection = { id: string; label: string }

export const TECHNIQUES_SECTION: SiteSection = { id: 'servicios', label: 'Servicios' }

export const STUDIO_SECTION: SiteSection = { id: 'estudio', label: 'El estudio' }

export const GALLERY_SECTION: SiteSection = { id: 'galeria', label: 'Galería' }

export const LOYALTY_SECTION: SiteSection = { id: 'fidelidad', label: 'Fidelidad' }

export const FAQ_SECTION: SiteSection = { id: 'preguntas', label: 'Preguntas' }
export const LOCATION_SECTION: SiteSection = { id: 'ubicacion', label: 'Ubicación' }

export const landingSections: readonly SiteSection[] = [
  TECHNIQUES_SECTION,
  STUDIO_SECTION,
  GALLERY_SECTION,
  LOYALTY_SECTION,
  FAQ_SECTION,
  LOCATION_SECTION,
]
