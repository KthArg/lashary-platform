import { expect, test } from '@playwright/test'
import { PUBLIC_VIEWPORTS } from './support/viewports'

test('la tienda se sirve dentro del sitio público, con su cabecera y su pie', async ({ page }) => {
  const response = await page.goto('/productos')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})

test('el detalle de un producto también lleva la cabecera y el pie del sitio', async ({ page }) => {
  await page.goto('/productos/producto-de-prueba')

  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})

test('desde la tienda, las secciones de la cabecera vuelven a la portada', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/productos')

  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name: 'Servicios' }).click()

  await expect(page).toHaveURL(/\/#servicios$/)
})

test('desde la portada, "Productos" en la cabecera lleva a la tienda', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  await page.getByRole('banner').getByRole('link', { name: 'Productos' }).click()

  await expect(page).toHaveURL(/\/productos$/)
})

test('en el teléfono, el menú lleva a la tienda', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')

  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page.getByRole('dialog', { name: 'Menú' }).getByRole('link', { name: 'Productos' }).click()

  await expect(page).toHaveURL(/\/productos$/)
})

test('a 860 px, el ancho donde aparece la navegación completa, la cabecera cabe con "Productos"', async ({
  page,
}) => {
  await page.setViewportSize({ width: 860, height: 800 })
  await page.goto('/')

  await expect(page.getByRole('banner').getByRole('link', { name: 'Productos' })).toBeVisible()
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
})

for (const viewport of PUBLIC_VIEWPORTS) {
  test(`tienda sin scroll horizontal en ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/productos')

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
}
