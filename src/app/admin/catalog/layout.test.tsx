import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
}))

vi.mock('@/features/auth', () => ({
  requireAdminSession: mocks.requireAdminSession,
  signOutAction: vi.fn(),
}))

import AdminCatalogLayout from './layout'

describe('protección de /admin/catalog', () => {
  it('propaga el redirect de requireAdminSession cuando no hay sesión staff', async () => {
    mocks.requireAdminSession.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/admin'))

    await expect(
      AdminCatalogLayout({ children: <div>catálogo</div> }),
    ).rejects.toThrow('NEXT_REDIRECT:/admin')
  })

  it('renderiza el panel y el cierre de sesión para staff', async () => {
    mocks.requireAdminSession.mockResolvedValueOnce({
      user: { email: 'admin@lashary.test' },
      role: 'admin',
    })

    render(await AdminCatalogLayout({ children: <div>catálogo protegido</div> }))

    expect(screen.getByText('catálogo protegido')).toBeDefined()
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeDefined()
  })
})
