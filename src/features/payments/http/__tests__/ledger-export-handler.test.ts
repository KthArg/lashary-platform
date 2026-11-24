import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err } from '@/shared/result'
import { ledgerExportTooLarge, paymentsStorageFailed } from '../../domain/errors'
import {
  LEDGER_EXPORT_ERROR_PARAM,
  LEDGER_EXPORT_RETURN_PATH,
} from '../../ui/admin-ledger-export/constants/ledger-export-strings'

const mockGetAuthSession = vi.fn()
const mockEntriesIn = vi.fn()
const mockRepositoryFactory = vi.fn()

vi.mock('@/features/auth', () => ({
  getAuthSession: () => mockGetAuthSession(),
  isStaffRole: (role: string) => role === 'admin',
}))
vi.mock('../../db/ledger-export-repository', () => ({
  ledgerExportRepository: async () => (mockRepositoryFactory(), { entriesIn: mockEntriesIn }),
}))

import { LEDGER_EXPORT_CONTENT_TYPE, receiveLedgerExportRequest } from '../ledger-export-handler'

const requestFor = (query: string) => new Request(`http://localhost/api/admin/ledger-export${query}`)
const VALID_QUERY = '?desde=2026-11-01&hasta=2026-11-30'
const backToFormWith = (reason: string) =>
  `http://localhost${LEDGER_EXPORT_RETURN_PATH}?${LEDGER_EXPORT_ERROR_PARAM}=${reason}`

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mockGetAuthSession.mockResolvedValue({ role: 'admin' })
  mockEntriesIn.mockResolvedValue(ok([]))
})

describe('receiveLedgerExportRequest', () => {
  it('responde 401 sin sesión y no toca la base', async () => {
    mockGetAuthSession.mockResolvedValue(null)

    const response = await receiveLedgerExportRequest(requestFor(VALID_QUERY))

    expect(response.status).toBe(401)
    expect(mockRepositoryFactory).not.toHaveBeenCalled()
  })

  it('responde 403 a quien no es staff y no toca la base', async () => {
    mockGetAuthSession.mockResolvedValue({ role: 'cliente' })

    const response = await receiveLedgerExportRequest(requestFor(VALID_QUERY))

    expect(response.status).toBe(403)
    expect(mockRepositoryFactory).not.toHaveBeenCalled()
  })

  it('vuelve al formulario con el motivo cuando el rango es inválido, sin leer el ledger', async () => {
    const response = await receiveLedgerExportRequest(requestFor('?desde=2026-11-30&hasta=2026-11-01'))

    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toBe(backToFormWith('range'))
    expect(mockEntriesIn).not.toHaveBeenCalled()
  })

  it('entrega el CSV como descarga con su nombre de archivo', async () => {
    const response = await receiveLedgerExportRequest(requestFor(VALID_QUERY))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(LEDGER_EXPORT_CONTENT_TYPE)
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="ledger-2026-11-01-a-2026-11-30.csv"')
    expect(await response.text()).toContain('Fecha,Clienta,Cita,Tipo,Monto')
  })

  it('vuelve al formulario cuando hay demasiados asientos', async () => {
    mockEntriesIn.mockResolvedValue(err(ledgerExportTooLarge(20000)))

    const response = await receiveLedgerExportRequest(requestFor(VALID_QUERY))

    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toBe(backToFormWith('tooLarge'))
  })

  it.each([
    ['un error de base', () => mockEntriesIn.mockResolvedValue(err(paymentsStorageFailed('detalle interno')))],
    ['una excepción', () => mockEntriesIn.mockRejectedValue(new Error('detalle interno'))],
  ])('vuelve al formulario sin filtrar el mensaje interno ante %s', async (_name, fail) => {
    fail()

    const response = await receiveLedgerExportRequest(requestFor(VALID_QUERY))

    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toBe(backToFormWith('unavailable'))
  })
})
