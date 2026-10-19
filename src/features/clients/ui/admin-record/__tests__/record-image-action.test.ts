import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addRecordImageAction } from '../actions/record-actions'
import { RECORD_ERROR_MESSAGES } from '../constants/record-strings'
import { fakeRecordRepository, initialVersion } from '../../../application/__tests__/record-fakes'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  uploads: [] as string[],
  store: null as unknown as ReturnType<typeof fakeRecordRepository>,
}))

vi.mock('@/features/auth', () => ({ requireAdminSession: mocks.requireAdminSession }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../../../db/record/record-repository', () => ({ recordRepository: async () => mocks.store.repo }))
vi.mock('../../../db/record/precaution-category-repository', () => ({ precautionCategoryLookup: async () => ({}) }))
vi.mock('../../../application/record/record-gateways', () => ({ auditRecordLog: async () => true, catalogTechniqueLookup: {} }))
vi.mock('../../../db/record/record-image-storage', () => ({
  recordImageStorage: async () => ({ upload: async (path: string) => { mocks.uploads.push(path) } }),
}))

const formWith = (file?: File) => {
  const form = new FormData()
  if (file) form.append('image', file)
  return form
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.uploads.length = 0
  mocks.store = fakeRecordRepository([{ ...initialVersion(), clientId: CLIENT_ID }])
  mocks.requireAdminSession.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' })
})

describe('addRecordImageAction — la puerta de entrada de las imágenes', () => {
  it('sube la imagen elegida y guarda la versión', async () => {
    const result = await addRecordImageAction(CLIENT_ID, formWith(new File([new Uint8Array([1, 2])], 'estudio.png', { type: 'image/png' })))
    if (!result.ok) throw new Error('debería guardar')
    expect(mocks.uploads).toHaveLength(1)
    expect(result.version.images).toEqual(mocks.uploads)
  })

  it('sin archivo avisa que hay que elegir una imagen', async () => {
    expect(await addRecordImageAction(CLIENT_ID, formWith())).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.imageMissing, problems: [] })
    expect(mocks.requireAdminSession).toHaveBeenCalled()
  })

  it('un tipo no permitido se rechaza con su texto y no se sube', async () => {
    const result = await addRecordImageAction(CLIENT_ID, formWith(new File(['%PDF'], 'informe.pdf', { type: 'application/pdf' })))
    expect(result).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.imageTypeNotAllowed, problems: [] })
    expect(mocks.uploads).toEqual([])
  })
})
