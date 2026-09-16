// Los anchos donde se comprueba que una página pública es "visible" (criterio 2 de US-LAND-01,
// definición del PO en src/features/landing/SPEC.md). Si esa definición cambia, cambia aquí.
export type Viewport = { name: string; width: number; height: number }

export const PUBLIC_VIEWPORTS: readonly Viewport[] = [
  { name: 'movil-320', width: 320, height: 568 },
  { name: 'movil-375', width: 375, height: 667 },
  { name: 'movil-414', width: 414, height: 896 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'escritorio-1280', width: 1280, height: 800 },
  { name: 'escritorio-1920', width: 1920, height: 1080 },
  { name: 'movil-horizontal', width: 667, height: 375 },
]
