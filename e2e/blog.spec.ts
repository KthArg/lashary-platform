import { expect, test } from '@playwright/test'
import { PUBLIC_VIEWPORTS } from './support/viewports'

// US-BLOG-02. El build de e2e corre sin `CMS_URL`, así que /blog sirve su estado de "no se pudo
// cargar": lo que aquí se comprueba es que la ruta existe, que entra en el sitio público con su
// cabecera y su pie, y que no se desborda. Las tarjetas y la paginación se prueban en
// src/features/content/ui/blog/__tests__/blog-list.test.tsx.
test('el blog se sirve dentro del sitio público, con su título', async ({ page }) => {
  const response = await page.goto('/blog')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})

test('desde el blog, las secciones de la cabecera vuelven a la portada', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/blog')

  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name: 'Servicios' }).click()

  await expect(page).toHaveURL(/\/#servicios$/)
})

test('el pie de la portada lleva al blog', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('contentinfo').getByRole('link', { name: 'Blog' }).click()

  await expect(page).toHaveURL(/\/blog$/)
})

test('una página que no es un número no rompe el blog', async ({ page }) => {
  const response = await page.goto('/blog?pagina=abc')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()
})

for (const viewport of PUBLIC_VIEWPORTS) {
  test(`blog sin scroll horizontal en ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/blog')

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
}

// US-BLOG-03. Sin `CMS_URL` no se puede leer ninguna publicación, así que el detalle sirve su
// aviso de "no se pudo cargar" en vez de un 404: no se puede afirmar que no existe. El texto, los
// metadatos y el 404 de un slug inexistente se prueban en las pruebas unitarias de `content` y en
// src/app/(site)/blog/[slug]/page.data.test.ts.
test('el detalle de una publicación avisa cuando no se pudo leer, y deja volver al listado', async ({ page }) => {
  const response = await page.goto('/blog/una-publicacion')

  expect(response?.status()).toBe(200)
  // Next pone además su propio anunciador de rutas con `role="alert"`: se busca el nuestro.
  await expect(
    page.getByRole('alert').filter({ hasText: 'No pudimos cargar esta publicación' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Volver al blog' }).click()
  await expect(page).toHaveURL(/\/blog$/)
})

for (const viewport of PUBLIC_VIEWPORTS) {
  test(`detalle del blog sin scroll horizontal en ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/blog/una-publicacion')

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
}
