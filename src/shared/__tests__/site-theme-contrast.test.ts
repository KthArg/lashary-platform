import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { createRequire } from 'node:module'

// UI-004: contraste WCAG AA de los pares que usa el sitio público. Si alguien cambia un color
// del tema `lashary-site` y rompe un par, esto falla antes de que llegue a una pantalla.
const require = createRequire(import.meta.url)
const config = require(path.resolve(__dirname, '../../../tailwind.config.js'))
const site: Record<string, string> = config.theme.extend.colors.site
const daisySite: Record<string, string> = config.daisyui.themes.find(
  (theme: unknown) => typeof theme === 'object' && theme !== null && 'lashary-site' in theme,
)['lashary-site']

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const TEXT_AA = 4.5
const NON_TEXT_AA = 3

describe('tema lashary-site — UI-004: contraste AA', () => {
  const textPairs: [string, string, string][] = [
    ['ink', 'paper', 'texto principal'],
    ['paper', 'ink', 'texto del botón primario'],
    ['ink-soft', 'paper', 'texto secundario'],
    ['ink-muted', 'paper', 'texto atenuado'],
    ['clay', 'paper', 'acento en cursiva y numeración'],
    ['paper', 'night', 'texto sobre fondo oscuro'],
    ['taupe', 'night', 'texto atenuado sobre fondo oscuro'],
    ['rose', 'night', 'enlace de acento sobre fondo oscuro'],
  ]

  it.each(textPairs)('texto %s sobre %s (%s) alcanza 4.5:1', (fg, bg) => {
    expect(contrast(site[fg], site[bg])).toBeGreaterThanOrEqual(TEXT_AA)
  })

  it.each(['paper', 'ink', 'night'])('el anillo de foco alcanza 3:1 sobre %s', (bg) => {
    expect(contrast(site.focus, site[bg])).toBeGreaterThanOrEqual(NON_TEXT_AA)
  })

  it.each([
    ['primary-content', 'primary'],
    ['secondary-content', 'secondary'],
    ['accent-content', 'accent'],
    ['neutral-content', 'neutral'],
    ['base-content', 'base-100'],
  ])('DaisyUI: %s sobre %s alcanza 4.5:1', (fg, bg) => {
    expect(contrast(daisySite[fg], daisySite[bg])).toBeGreaterThanOrEqual(TEXT_AA)
  })
})
