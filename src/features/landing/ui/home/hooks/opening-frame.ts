// Geometría de la "apertura" del hero para un progreso de scroll `p` (0 a 1), tal como la define
// el diseño: la foto asoma desde abajo como una píldora, se abre y termina a sangre, mientras el
// título se desvanece. Pura, para poder probarla sin navegador.

export type OpeningFrame = {
  width: number
  height: number
  translateY: number
  radiusX: number
  radiusY: number
  typeOpacity: number
  typeTranslateY: number
}

const NARROW_VIEWPORT = 760

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)

export function openingFrame(progress: number, viewportWidth: number, viewportHeight: number): OpeningFrame {
  const p = clamp01(progress)
  const narrow = viewportWidth < NARROW_VIEWPORT
  // Tres tiempos: asoma, se abre, se va a sangre.
  const peek = ease(clamp01(p / 0.36))
  const open = ease(clamp01((p - 0.3) / 0.4))
  const bleed = ease(clamp01((p - 0.74) / 0.26))

  const startWidth = narrow ? 0.86 : 0.68
  const startHeight = 0.08
  const openHeight = narrow ? 0.52 : 0.64
  const baseHeight = startHeight + (openHeight - startHeight) * open
  const height = (baseHeight + (1 - baseHeight) * bleed) * viewportHeight
  // En p = 0 queda fuera de cuadro: entra recién al bajar.
  const peekOffset = viewportHeight / 2 + height * 0.62

  return {
    width: (startWidth + (1 - startWidth) * bleed) * viewportWidth,
    height,
    translateY: peekOffset * (1 - peek),
    radiusX: 50 * (1 - bleed),
    radiusY: 100 * (1 - bleed),
    typeOpacity: Math.max(0, 1 - ease(clamp01((p - 0.1) / 0.3)) * 1.15),
    typeTranslateY: -0.13 * viewportHeight * peek,
  }
}
