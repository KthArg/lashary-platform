import { expect, test, type Locator, type Page } from '@playwright/test'
import { PUBLIC_VIEWPORTS } from './support/viewports'

// Criterio 2 de US-LAND-01, parte "visible" (src/features/landing/SPEC.md): título, subtítulo y
// "Reservar cita" visibles, dentro de la pantalla, sin superponerse entre sí ni con la cabecera,
// y botones de al menos 44 px (UI-004). En e2e no hay CMS: se ve el contenido de respaldo.
const MIN_TOUCH_TARGET_PX = 44

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  if (!box) throw new Error('sin caja')
  return box
}

const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

async function heroParts(page: Page) {
  const hero = page.locator('section[aria-labelledby="hero-title"]')
  const header = page.locator('header')
  return {
    brand: header.locator('a[href="#inicio"]'),
    headerCta: header.getByRole('link', { name: 'Reservar cita' }),
    title: hero.getByRole('heading', { level: 1 }),
    subtitle: hero.locator('#hero-title + div > p'),
    heroCta: hero.getByRole('link', { name: 'Reservar cita' }),
  }
}

async function expectVisibleHero(page: Page, width: number, height: number) {
  const parts = await heroParts(page)
  // Espera a que termine la entrada animada del texto.
  await expect.poll(() => parts.subtitle.evaluate((el) => getComputedStyle(el.parentElement!).opacity)).toBe('1')

  const boxes = Object.fromEntries(
    await Promise.all(Object.entries(parts).map(async ([name, locator]) => [name, await boxOf(locator)] as const)),
  ) as Record<keyof typeof parts, Box>

  for (const [name, box] of Object.entries(boxes)) {
    expect.soft(box.x, `${name} empieza dentro de la pantalla`).toBeGreaterThanOrEqual(0)
    expect.soft(box.y, `${name} empieza dentro de la pantalla`).toBeGreaterThanOrEqual(0)
    expect.soft(box.x + box.width, `${name} termina dentro del ancho`).toBeLessThanOrEqual(width)
    expect.soft(box.y + box.height, `${name} termina dentro del alto`).toBeLessThanOrEqual(height)
  }

  const names = Object.keys(boxes) as (keyof typeof boxes)[]
  for (const [i, a] of names.entries()) {
    for (const b of names.slice(i + 1)) {
      expect.soft(overlap(boxes[a], boxes[b]), `${a} no se superpone con ${b}`).toBe(false)
    }
  }

  expect(boxes.heroCta.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
  expect(boxes.headerCta.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
}

for (const viewport of PUBLIC_VIEWPORTS) {
  test(`hero visible en ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')
    await expectVisibleHero(page, viewport.width, viewport.height)
  })
}

test.describe('con prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' })

  for (const viewport of PUBLIC_VIEWPORTS.filter((v) => ['movil-375', 'escritorio-1280'].includes(v.name))) {
    test(`hero visible y sin pista de scroll en ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      await expectVisibleHero(page, viewport.width, viewport.height)
      const track = page.locator('section[aria-labelledby="hero-title"] > div')
      expect(await track.getAttribute('data-animated')).toBeNull()
    })
  }
})
