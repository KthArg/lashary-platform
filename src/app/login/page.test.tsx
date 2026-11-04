import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ getAuthSession: vi.fn() }))

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/features/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth')>()),
  getAuthSession: mocks.getAuthSession,
}))

import LoginPage from './page'
import { ADMIN_PORTAL_ROUTES, AUTH_LABELS } from '@/features/auth'

afterEach(cleanup)

describe('/login', () => {
  it('sin sesión ofrece el enlace al acceso administrativo', async () => {
    mocks.getAuthSession.mockResolvedValue(null)

    render(await LoginPage({}))

    expect(screen.getByRole('link', { name: AUTH_LABELS.staffAccessLink }).getAttribute('href')).toBe(ADMIN_PORTAL_ROUTES.login)
  })

  it('con sesión y teléfono pendiente no ofrece el acceso administrativo', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: { id: 'clienta-1', email: 'ana@example.com' }, role: 'cliente', profile: null })

    render(await LoginPage({}))

    expect(screen.queryByRole('link', { name: AUTH_LABELS.staffAccessLink })).toBeNull()
  })
})
