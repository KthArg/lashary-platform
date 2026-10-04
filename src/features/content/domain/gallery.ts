import type { CmsImage } from './landing-content'

// Pares antes y después de la galería (docs/contracts/cms-api.md v1.2, colección `galeria`).
export const GALLERY_KEY = 'galeria'

// Cuántos pares muestra la landing como máximo, en el orden del editor (PERF-004).
export const GALLERY_MAX_PAIRS = 24

// Los valores de `familia` que declara el contrato: los del enum del catálogo. Un par con otra
// familia se ignora entero.
export const GALLERY_FAMILIES = [
  'lash_classic',
  'lash_volume',
  'lash_extra_volume',
  'brow_design',
  'brow_lamination',
  'henna',
  'waxing',
  'lips',
] as const

export type GalleryFamily = (typeof GALLERY_FAMILIES)[number]

// Un par solo existe aquí si la clienta autorizó publicarlo: el filtro del consentimiento
// ocurre al leer, así que nada fuera de `content` ve un par sin él.
export type GalleryPair = {
  family: GalleryFamily
  before: CmsImage
  after: CmsImage
}
