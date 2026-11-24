import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  pathname: '/admin/morosidades',
}))

vi.mock('@/features/auth', () => ({ requireAdminSession: mocks.requireAdminSession }))
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }))

import AdminMorosidadesLayout from './layout'
import { MOROSIDADES_ROUTES, MOROSIDADES_SECTION } from './morosidades-section.strings'

const renderLayout = async () => {
  mocks.requireAdminSession.mockResolvedValueOnce({ user: { email: 'admin@lashary.test' }, role: 'admin' })
  render(await AdminMorosidadesLayout({ children: <div>contenido</div> }))
  return {
    review: screen.getByRole('link', { name: MOROSIDADES_SECTION.tabs.review }),
    history: screen.getByRole('link', { name: MOROSIDADES_SECTION.tabs.history }),
  }
}

describe('/admin/morosidades: pestañas de revisión e historial', () => {
  it('propaga el redirect de requireAdminSession cuando no hay sesión staff', async () => {
    mocks.requireAdminSession.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/admin'))
    await expect(AdminMorosidadesLayout({ children: <div>morosidades</div> })).rejects.toThrow('NEXT_REDIRECT:/admin')
  })

  it('muestra las dos pestañas con sus rutas y deja ver el contenido', async () => {
    mocks.pathname = MOROSIDADES_ROUTES.review
    const { review, history } = await renderLayout()
    expect(review.getAttribute('href')).toBe(MOROSIDADES_ROUTES.review)
    expect(history.getAttribute('href')).toBe(MOROSIDADES_ROUTES.history)
    expect(screen.getByText('contenido')).toBeTruthy()
  })

  it('en la revisión marca solo Revisión como activa', async () => {
    mocks.pathname = MOROSIDADES_ROUTES.review
    const { review, history } = await renderLayout()
    expect(review.getAttribute('aria-current')).toBe('page')
    expect(history.getAttribute('aria-current')).toBeNull()
  })

  it('en el historial y en el detalle de una morosidad marca solo Historial como activa', async () => {
    for (const pathname of [MOROSIDADES_ROUTES.history, `${MOROSIDADES_ROUTES.history}/caso-1`]) {
      mocks.pathname = pathname
      const { review, history } = await renderLayout()
      expect(history.getAttribute('aria-current')).toBe('page')
      expect(review.getAttribute('aria-current')).toBeNull()
      document.body.innerHTML = ''
    }
  })
})
