import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  pathname: '/admin/citas/disponibilidad',
}))

vi.mock('@/features/auth', () => ({ requireAdminSession: mocks.requireAdminSession }))
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }))

import AdminCitasLayout from './layout'
import { CITAS_ROUTES, CITAS_SECTION } from './citas-section.strings'

describe('/admin/citas: pestañas de aprobaciones y disponibilidad', () => {
  it('propaga el redirect de requireAdminSession cuando no hay sesión staff', async () => {
    mocks.requireAdminSession.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/admin'))
    await expect(AdminCitasLayout({ children: <div>citas</div> })).rejects.toThrow('NEXT_REDIRECT:/admin')
  })

  it('muestra las dos pestañas y marca la activa según la ruta', async () => {
    mocks.requireAdminSession.mockResolvedValueOnce({ user: { email: 'admin@lashary.test' }, role: 'admin' })
    render(await AdminCitasLayout({ children: <div>contenido</div> }))

    const approvals = screen.getByRole('link', { name: CITAS_SECTION.tabs.approvals })
    const availability = screen.getByRole('link', { name: CITAS_SECTION.tabs.availability })
    expect(approvals.getAttribute('href')).toBe(CITAS_ROUTES.approvals)
    expect(availability.getAttribute('href')).toBe(CITAS_ROUTES.availability)
    expect(availability.getAttribute('aria-current')).toBe('page')
    expect(approvals.getAttribute('aria-current')).toBeNull()
    expect(screen.getByText('contenido')).toBeTruthy()
  })
})
