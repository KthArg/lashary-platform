import { describe, it, expect } from 'vitest'
import { isOk } from '@/shared/result'
import { addRecordImage } from '../record/add-record-image'
import { ACTOR, commandDeps, initialVersion } from './record-fakes'
import type { RecordImageUpload } from '../record/record-ports'

const PNG: RecordImageUpload = { bytes: new Uint8Array([1, 2, 3]), contentType: 'image/png' }

function imageDeps(initial = [initialVersion()], auditSucceeds = true) {
  const { deps, versions, events } = commandDeps(initial, auditSucceeds)
  const uploads: string[] = []
  const images = { upload: async (path: string) => { uploads.push(path) } }
  return { deps: { ...deps, images }, versions, events, uploads }
}

describe('addRecordImage — subir una imagen al expediente (criterios 1 y 5)', () => {
  it('sube a la carpeta de la clienta y guarda una versión nueva con esa ruta', async () => {
    const { deps, uploads, events } = imageDeps()
    const result = await addRecordImage(deps)(ACTOR, PNG)
    if (!isOk(result)) throw new Error('debería guardar')
    expect(uploads).toEqual([`${ACTOR.clientId}/generated-1.png`])
    expect(result.value.changeKind).toBe('image_added')
    expect(result.value.content.images).toEqual(uploads)
    expect(events).toEqual([{ ...ACTOR, action: 'clients.record.updated' }])
  })

  it('una imagen que no cumple las reglas no se sube', async () => {
    const { deps, uploads, versions } = imageDeps()
    const result = await addRecordImage(deps)(ACTOR, { ...PNG, contentType: 'application/pdf' })
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
})
