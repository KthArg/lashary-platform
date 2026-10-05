import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
}))

vi.mock('@/features/auth', () => ({
  requireAdminSession: mocks.requireAdminSession,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/catalog',
}))

import AdminCatalogLayout from './layout'

describe('protección de /admin/catalog', () => {
  it('propaga el redirect de requireAdminSession cuando no hay sesión staff', async () => {
    mocks.requireAdminSession.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/admin'))

    await expect(
      AdminCatalogLayout({ children: <div>catálogo</div> }),
    ).rejects.toThrow('NEXT_REDIRECT:/admin')
  })

  it('renderiza la sección con pestañas Técnicas y Paquetes para staff', async () => {
    mocks.requireAdminSession.mockResolvedValueOnce({
      user: { email: 'admin@lashary.test' },
      role: 'admin',
    })

    render(await AdminCatalogLayout({ children: <div>catálogo protegido</div> }))

    expect(screen.getByText('catálogo protegido')).toBeDefined()
    const techniques = screen.getByRole('tab', { name: 'Técnicas' })
    const packages = screen.getByRole('tab', { name: 'Paquetes' })
    expect(techniques.getAttribute('href')).toBe('/admin/catalog')
    expect(packages.getAttribute('href')).toBe('/admin/catalog/packages')
    expect(techniques.getAttribute('aria-current')).toBe('page')
    expect(packages.getAttribute('aria-current')).toBeNull()
  })
})
