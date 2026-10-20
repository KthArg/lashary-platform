import { describe, it, expect } from 'vitest'
import { isOk } from '@/shared/result'
import { addRecordImage } from '../record/add-record-image'
import { RECORD_LIMITS } from '../../domain/record/record-limits'
import { validContent, validContentInput } from '../../domain/record/__tests__/record-fixtures'
import { ACTOR, commandDeps, initialVersion } from './record-fakes'
import type { RecordImageUpload } from '../record/record-ports'

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const PNG: RecordImageUpload = { bytes: PNG_BYTES, contentType: 'image/png' }

function imageDeps(initial = [initialVersion()], auditSucceeds = true) {
  const { deps, versions, events } = commandDeps(initial, auditSucceeds)
  const uploads: { path: string; contentType: string }[] = []
  const images = { upload: async (path: string, image: RecordImageUpload) => { uploads.push({ path, contentType: image.contentType }) } }
  return { deps: { ...deps, images }, versions, events, uploads }
}

describe('addRecordImage — subir una imagen al expediente (criterios 1 y 5)', () => {
  it('sube a la carpeta de la clienta y guarda una versión nueva con esa ruta', async () => {
    const { deps, uploads, events } = imageDeps()
    const result = await addRecordImage(deps)(ACTOR, PNG)
    if (!isOk(result)) throw new Error('debería guardar')
    expect(uploads).toEqual([{ path: `${ACTOR.clientId}/generated-1.png`, contentType: 'image/png' }])
    expect(result.value.changeKind).toBe('image_added')
    expect(result.value.content.images).toEqual([uploads[0].path])
    expect(events).toEqual([{ ...ACTOR, action: 'clients.record.updated' }])
  })

  it('el tipo sale de los bytes reales: un PDF que dice ser PNG no se sube', async () => {
    const { deps, uploads, versions } = imageDeps()
    const result = await addRecordImage(deps)(ACTOR, { bytes: new TextEncoder().encode('%PDF-1.7'), contentType: 'image/png' })
    expect(result.ok ? null : result.error).toEqual({ code: 'image-type-not-allowed' })
    expect(uploads).toEqual([])
    expect(versions).toHaveLength(1)
  })

  it('sin registro inicial no sube nada', async () => {
    const { deps, uploads } = imageDeps([])
    const result = await addRecordImage(deps)(ACTOR, PNG)
    expect(result.ok ? null : result.error).toEqual({ code: 'record-missing' })
    expect(uploads).toEqual([])
  })

  it('con el expediente lleno de imágenes no sube nada', async () => {
    const images = Array.from({ length: RECORD_LIMITS.maxImages }, (_, index) => `${ACTOR.clientId}/foto-${index}.png`)
    const full = { ...initialVersion(), content: validContent({ ...validContentInput(), images }) }
    const { deps, uploads } = imageDeps([full])
    const result = await addRecordImage(deps)(ACTOR, PNG)
    expect(result.ok ? null : result.error).toMatchObject({ problems: ['too-many-images'] })
    expect(uploads).toEqual([])
  })
})
