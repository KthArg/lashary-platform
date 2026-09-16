import { defineConfig, devices } from '@playwright/test'

// Pruebas e2e contra el build de producción, no contra `next dev`: lo que se mide es lo que se
// despliega. Solo Chromium; los anchos que importan están en e2e/support/viewports.ts.
const PORT = 3100
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Sin reintentos: un test que pasa al segundo intento es un test inestable, y se arregla.
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    // El middleware crea un cliente de Supabase en cada petición y falla sin URL ni clave.
    // Estos valores no son secretos: apuntan a un Supabase local que no tiene por qué estar
    // corriendo. La sesión sale vacía y las páginas públicas se sirven igual.
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'e2e-sin-supabase',
    },
  },
})
