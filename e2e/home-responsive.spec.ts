import { expect, test } from '@playwright/test'
import { PUBLIC_VIEWPORTS } from './support/viewports'

// Criterio 2 de US-LAND-01, parte "visible". Hoy solo comprueba lo que vale para cualquier
// página pública: sin scroll horizontal en ningún ancho. Las comprobaciones del hero (título,
// subtítulo y "Reservar cita" visibles, sin superponerse, botón de 44 px) entran con el PR del hero.
for (const viewport of PUBLIC_VIEWPORTS) {
  test(`inicio sin scroll horizontal en ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
}
