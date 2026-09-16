import { test } from '@playwright/test'
import { PUBLIC_VIEWPORTS } from './support/viewports'

// Criterio 2 de US-LAND-01, parte "atractivo": no se automatiza. Esto solo produce las capturas
// que el PO compara contra el diseño de referencia. Quedan en el reporte de Playwright
// (CI: artefacto "capturas-landing"). Primera pantalla y página completa sin animación.
for (const viewport of PUBLIC_VIEWPORTS) {
  test(`captura de inicio en ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')
    await page.waitForTimeout(1300)
    await testInfo.attach(`${viewport.name}-primera-pantalla`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await testInfo.attach(`${viewport.name}-pagina-completa`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  })
}
