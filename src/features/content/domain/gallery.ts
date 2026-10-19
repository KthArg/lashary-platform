import type { CmsImage } from './landing-content'

export const GALLERY_KEY = 'galeria'

export const GALLERY_MAX_PAIRS = 24

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

export type GalleryPair = {
  family: GalleryFamily
  before: CmsImage
  after: CmsImage
}
