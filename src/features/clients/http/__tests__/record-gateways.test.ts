import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err } from '@/shared/result'
import {
  RECORD_AUDIT_ENTITY_TYPE,
  TECHNIQUE_OPTIONS_LIMIT,
  auditRecordLog,
  catalogTechniqueLookup,
  listActiveCatalogTechniques,
} from '@/features/clients/http/record/record-gateways'

const mockRecord = vi.fn()
const mockGetTechnique = vi.fn()
const mockListTechniques = vi.fn()

vi.mock('@/features/audit', () => ({ record: (input: unknown) => mockRecord(input) }))
vi.mock('@/features/catalog', () => ({
  getTechnique: (id: string) => mockGetTechnique(id),
  listTechniques: (query: unknown) => mockListTechniques(query),
}))

const event = { actorId: 'admin-1', clientId: 'client-1', action: 'clients.record.viewed' as const }

beforeEach(() => vi.clearAllMocks())

describe('auditRecordLog — el expediente usa la bitácora de audit', () => {
  it('registra la acción sobre la clienta, sin contenido del expediente', async () => {
    mockRecord.mockResolvedValue(ok({}))
    expect(await auditRecordLog(event)).toBe(true)
    expect(mockRecord).toHaveBeenCalledWith({
      actorId: 'admin-1',
      action: 'clients.record.viewed',
      entityType: RECORD_AUDIT_ENTITY_TYPE,
      entityId: 'client-1',
    })
  })

  it('si audit rechaza el evento, responde que no quedó registrado', async () => {
    mockRecord.mockResolvedValue(err({ code: 'invalid' }))
    expect(await auditRecordLog(event)).toBe(false)
  })

  it('si audit falla por la base o la red, también responde que no quedó registrado', async () => {
    mockRecord.mockRejectedValue(new Error('rls'))
    expect(await auditRecordLog(event)).toBe(false)
  })
})

describe('catalogTechniqueLookup — la técnica recomendada sale de catalog', () => {
  it('devuelve id y nombre de una técnica activa', async () => {
    mockGetTechnique.mockResolvedValue(ok({ id: 'technique-1', name: 'Clásicas', isActive: true }))
    expect(await catalogTechniqueLookup.findActiveTechnique('technique-1')).toEqual({ id: 'technique-1', name: 'Clásicas' })
  })

  it('una técnica desactivada no se puede recomendar', async () => {
    mockGetTechnique.mockResolvedValue(ok({ id: 'technique-1', name: 'Clásicas', isActive: false }))
    expect(await catalogTechniqueLookup.findActiveTechnique('technique-1')).toBeNull()
  })

  it('una técnica que no existe se lee como null', async () => {
    mockGetTechnique.mockResolvedValue(err({ code: 'not-found' }))
    expect(await catalogTechniqueLookup.findActiveTechnique('technique-x')).toBeNull()
  })
})

describe('listActiveCatalogTechniques — las opciones del menú de técnicas', () => {
  it('pide solo las activas, con tope, y deja id y nombre', async () => {
    mockListTechniques.mockResolvedValue({ items: [{ id: 'technique-1', name: 'Clásicas', isActive: true, family: 'pestanas' }] })
    expect(await listActiveCatalogTechniques()).toEqual([{ id: 'technique-1', name: 'Clásicas' }])
    expect(mockListTechniques).toHaveBeenCalledWith({ activeOnly: true, pageSize: TECHNIQUE_OPTIONS_LIMIT })
  })
})
