import { describe, it, expect, vi, beforeEach } from 'vitest'
import { markNoticeAction } from '../actions/inbox-actions'
import { loadAdminInbox } from '../services/inbox-service'
import { ADMIN_LAYOUT_PATH, INBOX_ERRORS } from '../constants/inbox-strings'

const NOTICE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'

type FakeResponse = { data?: unknown; count?: number | null; error: { message: string } | null }

let responses: FakeResponse[]
const updates: unknown[] = []
const mockRequireAdmin = vi.fn()
const mockRevalidate = vi.fn()

function nextQuery() {
  const response = responses.shift() ?? { data: [], error: null }
  const query: Record<string, unknown> = {
    then: (resolve: (value: FakeResponse) => unknown) => resolve(response),
  }
  for (const method of ['select', 'order', 'limit', 'is', 'eq']) {
    query[method] = () => query
  }
  query.update = (values: unknown) => (updates.push(values), query)
  return query
}

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ from: () => nextQuery() })) }))
vi.mock('@/features/auth', () => ({ requireAdminSession: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => mockRevalidate(...args) }))

beforeEach(() => {
  vi.clearAllMocks()
  updates.length = 0
  responses = []
  mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })
})

describe('markNoticeAction', () => {
  it('marca el aviso, exige sesión de staff y refresca el panel para que cambie el contador', async () => {
    responses = [{ data: [{ id: NOTICE_ID }], error: null }]

    const result = await markNoticeAction({ id: NOTICE_ID, read: true })

    expect(result).toEqual({ ok: true })
    expect(mockRequireAdmin).toHaveBeenCalledOnce()
    expect(updates).toHaveLength(1)
    expect(mockRevalidate).toHaveBeenCalledWith(ADMIN_LAYOUT_PATH, 'layout')
  })

  it('volver a no leído manda la fecha vacía', async () => {
    responses = [{ data: [{ id: NOTICE_ID }], error: null }]

    await markNoticeAction({ id: NOTICE_ID, read: false })

    expect(updates).toEqual([{ read_at: null }])
  })

  it('una entrada que no es un aviso válido se rechaza sin tocar la base', async () => {
    const result = await markNoticeAction({ id: 'no-es-un-uuid', read: 'sí' })

    expect(result).toEqual({ ok: false, error: INBOX_ERRORS.invalidInput })
    expect(updates).toHaveLength(0)
  })

  it('un aviso que no existe o que la sesión no puede tocar se informa sin lanzar', async () => {
    responses = [{ data: [], error: null }]

    const result = await markNoticeAction({ id: NOTICE_ID, read: true })

    expect(result).toEqual({ ok: false, error: INBOX_ERRORS.notFound })
    expect(mockRevalidate).not.toHaveBeenCalled()
  })

  it('un fallo de la base se devuelve como error, no sube a error.tsx', async () => {
    responses = [{ data: null, error: { message: 'caída' } }]

    const result = await markNoticeAction({ id: NOTICE_ID, read: true })

    expect(result).toEqual({ ok: false, error: INBOX_ERRORS.saveFailed })
  })
})

describe('loadAdminInbox', () => {
  it('devuelve los avisos y el conteo de no leídos', async () => {
    responses = [
      {
        data: [
          {
            id: NOTICE_ID,
            kind: 'booking_created',
            appointment_id: 'cita-1',
            client_name: 'Ana Pérez',
            service_name: 'Lifting de pestañas',
            starts_at: '2026-11-05T15:00:00+00:00',
            read_at: null,
            created_at: '2026-10-29T18:00:00+00:00',
          },
        ],
        error: null,
      },
      { count: 1, error: null },
    ]

    const result = await loadAdminInbox()

    expect(result.ok && result.inbox.unreadCount).toBe(1)
    expect(result.ok && result.inbox.notices.map((notice) => notice.clientName)).toEqual(['Ana Pérez'])
  })

  it('si la base falla, la bandeja informa el error en vez de mostrarse vacía', async () => {
    responses = [{ data: null, error: { message: 'caída' } }, { count: null, error: { message: 'caída' } }]

    expect(await loadAdminInbox()).toEqual({ ok: false })
  })
})
