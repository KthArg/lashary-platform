import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'

const mocks = vi.hoisted(() => ({ readAppointmentHistory: vi.fn() }))

vi.mock('@/features/auth', () => ({ requireAdminSession: vi.fn().mockResolvedValue({ user: { id: 'admin-1' } }) }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('@/features/clients', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/clients')>()),
  readAppointmentHistory: mocks.readAppointmentHistory,
}))

import AdminAppointmentsPage from './page'
import { HISTORY_LABELS, HISTORY_PAGINATION_TEXTS, appointmentHistoryUrl } from '@/features/clients'

const entry = { id: 'cita-1', startsAtMs: Date.parse('2026-09-15T16:00:00Z'), status: 'completed', serviceName: 'Clásicas', depositStatus: 'none' }

const renderPage = async (page?: string) =>
  render(await AdminAppointmentsPage({ params: Promise.resolve({ id: CLIENT_ID }), searchParams: Promise.resolve({ page }) }))

beforeEach(() => vi.clearAllMocks())

describe('/admin/clients/<id>/citas', () => {
  it('lee la página de la URL y muestra el historial con su paginación', async () => {
    mocks.readAppointmentHistory.mockResolvedValue({ ok: true, entries: [entry], total: 26, page: 1, pageSize: 25 })
    await renderPage('1')

    expect(mocks.readAppointmentHistory).toHaveBeenCalledWith(CLIENT_ID, 1)
    expect(screen.getByRole('region', { name: HISTORY_LABELS.title })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: HISTORY_PAGINATION_TEXTS.navLabel })).toBeTruthy()
  })

  it('sin citas no dibuja la paginación', async () => {
    mocks.readAppointmentHistory.mockResolvedValue({ ok: true, entries: [], total: 0, page: 0, pageSize: 25 })
    await renderPage()

    expect(screen.getByText(HISTORY_LABELS.empty)).toBeTruthy()
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('una página más allá de la última vuelve a la primera en vez de decir que no hay citas', async () => {
    mocks.readAppointmentHistory.mockResolvedValue({ ok: true, entries: [], total: 3, page: 9, pageSize: 25 })
    await expect(renderPage('9')).rejects.toThrow(`NEXT_REDIRECT:${appointmentHistoryUrl(CLIENT_ID, 0)}`)
  })

  it('si el historial no carga, muestra el aviso con Reintentar', async () => {
    mocks.readAppointmentHistory.mockResolvedValue({ ok: false, error: 'No se pudo cargar.' })
    await renderPage()

    expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar.')
    expect(screen.getByRole('button', { name: HISTORY_LABELS.retry })).toBeTruthy()
  })
})
