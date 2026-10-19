import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  addRecordPrecautionAction,
  createRecordAction,
  editRecordStudyAction,
  removeRecordPrecautionAction,
  viewRecordAction,
} from '../actions/record-actions'
import { RECORD_ERROR_MESSAGES, RECORD_PROBLEM_MESSAGES } from '../constants/record-strings'
import { fakeRecordRepository, initialVersion } from '../../../application/__tests__/record-fakes'
import { ALLERGY } from '../../../domain/record/__tests__/record-fixtures'
import type { RecordAuditEvent } from '../../../application/record/record-ports'

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
vi.mock('../../../db/record/record-repository', () => ({ recordRepository: async () => store.repo }))
vi.mock('../../../db/record/precaution-category-repository', () => ({
  precautionCategoryLookup: async () => ({
    findCategory: async (id: string) => (id === CATEGORY_ID ? { id, name: 'Condición relevante' } : null),
  }),
}))
vi.mock('../../../application/record/record-gateways', () => ({
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

describe('viewRecordAction — ver el expediente (criterio 3)', () => {
  it('registra el acceso con la admin de la sesión y devuelve datos planos para la pantalla', async () => {
    store = existingRecord()
    const result = await viewRecordAction(CLIENT_ID)
    if (!result.ok) throw new Error('debería leer')
    expect(auditEvents).toEqual([{ clientId: CLIENT_ID, actorId: ADMIN_ID, action: 'clients.record.viewed' }])
    expect(result.current?.precautions).toEqual([ALLERGY])
    expect(result.current?.createdAt).toBe('2026-10-17T15:00:00.000Z')
    expect(Object.getOwnPropertySymbols(result.current)).toEqual([])
  })

  it('si la bitácora falla, muestra el aviso y no el expediente', async () => {
    store = existingRecord()
    auditSucceeds = false
    expect(await viewRecordAction(CLIENT_ID)).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.auditFailed })
  })

  it('un id de clienta mal formado no llega a la base ni a la bitácora', async () => {
    expect(await viewRecordAction('../otra')).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.clientNotFound })
    expect(mockRequireAdmin).toHaveBeenCalled()
    expect(auditEvents).toEqual([])
  })

  it('sin sesión de administradora no lee nada', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))
    await expect(viewRecordAction(CLIENT_ID)).rejects.toThrow('NEXT_REDIRECT')
    expect(auditEvents).toEqual([])
  })
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
