import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
}))

vi.mock('@/features/auth', () => ({
  requireAdminSession: mocks.requireAdminSession,
  signOutAction: vi.fn(),
}))

import AdminStoreLayout from './layout'

describe('protección de /admin/store', () => {
  it('propaga el redirect de requireAdminSession cuando no hay sesión staff', async () => {
    mocks.requireAdminSession.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/admin'))

    await expect(
      AdminStoreLayout({ children: <div>productos</div> }),
    ).rejects.toThrow('NEXT_REDIRECT:/admin')
  })

  it('renderiza el panel y el cierre de sesión para staff', async () => {
    mocks.requireAdminSession.mockResolvedValueOnce({
      user: { email: 'admin@lashary.test' },
      role: 'admin',
    })

    render(await AdminStoreLayout({ children: <div>productos protegidos</div> }))

    expect(screen.getByText('productos protegidos')).toBeDefined()
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeDefined()
  })
})
