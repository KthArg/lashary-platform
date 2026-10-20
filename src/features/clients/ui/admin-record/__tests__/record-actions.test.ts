import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  addRecordPrecautionAction,
  createRecordAction,
  editRecordStudyAction,
  removeRecordPrecautionAction,
} from '../actions/record-actions'
import { RECORD_ERROR_MESSAGES, RECORD_PROBLEM_MESSAGES } from '../constants/record-strings'
import { fakeRecordRepository, initialVersion } from '@/features/clients/application/__tests__/record-fakes'
import { ALLERGY } from '@/features/clients/domain/record/__tests__/record-fixtures'
import type { RecordAuditEvent } from '@/features/clients/application/record/record-ports'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const ADMIN_ID = '22222222-2222-4222-8222-222222222222'
const CATEGORY_ID = '33333333-3333-4333-8333-333333333333'
const TECHNIQUE_ID = '44444444-4444-4444-8444-444444444444'

let store: ReturnType<typeof fakeRecordRepository>
let auditSucceeds = true
const auditEvents: RecordAuditEvent[] = []
const mockRequireAdmin = vi.fn()
const mockRevalidate = vi.fn()

vi.mock('@/features/auth', () => ({ requireAdminSession: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => mockRevalidate(path) }))
vi.mock('@/features/clients/db/record/record-repository', () => ({ recordRepository: async () => store.repo }))
vi.mock('@/features/clients/db/record/precaution-category-repository', () => ({
  precautionCategoryLookup: async () => ({
    findCategory: async (id: string) => (id === CATEGORY_ID ? { id, name: 'Condición relevante' } : null),
  }),
}))
vi.mock('@/features/clients/http/record/record-gateways', () => ({
  auditRecordLog: async (event: RecordAuditEvent) => {
    auditEvents.push(event)
    return auditSucceeds
  },
  catalogTechniqueLookup: {
    findActiveTechnique: async (id: string) => (id === TECHNIQUE_ID ? { id, name: 'Volumen' } : null),
  },
}))

const existingRecord = () => fakeRecordRepository([{ ...initialVersion(), clientId: CLIENT_ID }])

beforeEach(() => {
  vi.clearAllMocks()
  store = fakeRecordRepository()
  auditSucceeds = true
  auditEvents.length = 0
  mockRequireAdmin.mockResolvedValue({ user: { id: ADMIN_ID }, role: 'admin' })
})

describe('acciones de escritura del expediente (criterios 1, 2 y 4)', () => {
  it('crea el registro inicial firmado por la admin de la sesión y refresca la ruta', async () => {
    const result = await createRecordAction(CLIENT_ID, { studyText: 'Pestaña fina', recommendedTechniqueId: TECHNIQUE_ID })
    if (!result.ok) throw new Error('debería guardar')
    expect(result.version).toMatchObject({ changeKind: 'initial', createdBy: ADMIN_ID })
    expect(result.version.recommendedTechnique).toEqual({ id: TECHNIQUE_ID, name: 'Volumen' })
    expect(mockRevalidate).toHaveBeenCalledWith(`/admin/clients/${CLIENT_ID}/expediente`)
  })

  it('traduce cada problema de validación a su texto', async () => {
    const result = await createRecordAction(CLIENT_ID, { studyText: '  ', recommendedTechniqueId: null })
    expect(result).toEqual({
      ok: false,
      error: RECORD_ERROR_MESSAGES.invalid,
      problems: [RECORD_PROBLEM_MESSAGES['study-text-empty']],
    })
    expect(store.versions).toHaveLength(0)
  })

  it('una técnica con id mal formado se rechaza sin consultar el catálogo', async () => {
    const result = await createRecordAction(CLIENT_ID, { studyText: 'Pestaña fina', recommendedTechniqueId: 'drop table' })
    expect(result).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.techniqueNotFound, problems: [] })
    expect(mockRequireAdmin).toHaveBeenCalled()
  })

  it('agrega un antecedente con la categoría elegida', async () => {
    store = existingRecord()
    const result = await addRecordPrecautionAction(CLIENT_ID, { categoryId: CATEGORY_ID, description: 'Blefaritis' })
    if (!result.ok) throw new Error('debería guardar')
    expect(result.version.precautions.at(-1)).toMatchObject({ categoryName: 'Condición relevante', description: 'Blefaritis' })
  })

  it('una categoría con id mal formado se rechaza', async () => {
    store = existingRecord()
    const result = await addRecordPrecautionAction(CLIENT_ID, { categoryId: 'x', description: 'Blefaritis' })
    expect(result).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.categoryNotFound, problems: [] })
    expect(store.versions).toHaveLength(1)
  })

  it('quita un antecedente por su id', async () => {
    store = existingRecord()
    const result = await removeRecordPrecautionAction(CLIENT_ID, ALLERGY.id)
    if (!result.ok) throw new Error('debería guardar')
    expect(result.version.precautions).toEqual([])
  })

  it('editar sin cambios avisa que no hay nada que guardar', async () => {
    store = existingRecord()
    const current = initialVersion().content
    const result = await editRecordStudyAction(CLIENT_ID, { studyText: current.studyText, recommendedTechniqueId: null })
    expect(result.ok).toBe(true)
    const again = await editRecordStudyAction(CLIENT_ID, { studyText: current.studyText, recommendedTechniqueId: null })
    expect(again).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.unchanged, problems: [] })
  })

  it('un choque de versiones pide recargar', async () => {
    store = existingRecord()
    const [first, second] = await Promise.all([
      addRecordPrecautionAction(CLIENT_ID, { categoryId: CATEGORY_ID, description: 'Blefaritis' }),
      addRecordPrecautionAction(CLIENT_ID, { categoryId: CATEGORY_ID, description: 'Ojo seco' }),
    ])
    expect([first, second].filter((result) => result.ok)).toHaveLength(1)
    expect([first, second]).toContainEqual({ ok: false, error: RECORD_ERROR_MESSAGES.versionConflict, problems: [] })
  })
})

describe('acciones de escritura ante fallos de infraestructura (M1)', () => {
  it('si la base falla, responde con un mensaje en vez de lanzar el error a la pantalla', async () => {
    store = existingRecord()
    store.repo.listVersions = async () => { throw new Error('caída') }
    expect(await removeRecordPrecautionAction(CLIENT_ID, ALLERGY.id)).toEqual({
      ok: false, error: RECORD_ERROR_MESSAGES.saveFailed, problems: [],
    })
  })

  it('si se guardó pero falló la bitácora, lo dice y refresca porque el cambio sí quedó', async () => {
    store = existingRecord()
    auditSucceeds = false
    const result = await removeRecordPrecautionAction(CLIENT_ID, ALLERGY.id)
    expect(result).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.savedWithoutAudit, problems: [], saved: true })
    expect(store.versions).toHaveLength(2)
    expect(mockRevalidate).toHaveBeenCalledWith(`/admin/clients/${CLIENT_ID}/expediente`)
  })

  it('un id de clienta en mayúsculas se guarda en minúsculas, como lo guarda la base', async () => {
    store = existingRecord()
    const result = await removeRecordPrecautionAction(CLIENT_ID.toUpperCase(), ALLERGY.id)
    expect(result.ok).toBe(true)
    expect(store.versions.at(-1)?.clientId).toBe(CLIENT_ID)
  })
})
