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

import AdminLoginPage from './page'
import { AUTH_LABELS, CLIENT_LOGIN_ROUTE } from '@/features/auth'

afterEach(cleanup)

describe('/admin', () => {
  it('sin sesión ofrece el enlace al ingreso de clientas', async () => {
    mocks.getAuthSession.mockResolvedValue(null)

    render(await AdminLoginPage({}))

    expect(screen.getByRole('link', { name: AUTH_LABELS.clientAccessLink }).getAttribute('href')).toBe(CLIENT_LOGIN_ROUTE)
  })
})
