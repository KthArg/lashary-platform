import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { delinquencyStorageFailed } from '../../domain/errors'
import { uploadReceipt } from '../upload-receipt'
import type { CurrentClientPort, ReceiptStorage } from '../ports'

const PDF = new TextEncoder().encode('%PDF-1.7\n')
const HTML = new TextEncoder().encode('<html></html>')

function createStorage(result = ok(undefined) as Awaited<ReturnType<ReceiptStorage['upload']>>) {
  const uploads: Array<{ path: string; contentType: string; size: number }> = []
  const storage: ReceiptStorage = {
    async upload(path, file) {
      uploads.push({ path, contentType: file.contentType, size: file.bytes.byteLength })
      return result
    },
  }
  return { storage, uploads }
}

function createCurrentClient(result: Awaited<ReturnType<CurrentClientPort['currentClientId']>>) {
  let asked = 0
  const currentClient: CurrentClientPort = {
    async currentClientId() {
      asked += 1
      return result
    },
  }
  return { currentClient, asked: () => asked }
}

const newId = () => 'archivo-1'

describe('uploadReceipt', () => {
  it('sube el comprobante a la carpeta de la clienta con el tipo que dicen sus bytes y devuelve la ruta', async () => {
    const { storage, uploads } = createStorage()
    const { currentClient } = createCurrentClient(ok('clienta-1'))
    const result = await uploadReceipt({ storage, currentClient, newId })(PDF)

    expect(isOk(result) && result.value).toBe('clienta-1/archivo-1.pdf')
    expect(uploads).toEqual([{ path: 'clienta-1/archivo-1.pdf', contentType: 'application/pdf', size: PDF.byteLength }])
  })

  it('un archivo que no es imagen ni PDF no llega a la base ni a Storage', async () => {
    const { storage, uploads } = createStorage()
    const { currentClient, asked } = createCurrentClient(ok('clienta-1'))
    const result = await uploadReceipt({ storage, currentClient, newId })(HTML)

    expect(isErr(result) && result.error).toMatchObject({ code: 'DELINQUENCY_INVALID_RECEIPT', problem: 'receipt-type-not-allowed' })
    expect(asked()).toBe(0)
    expect(uploads).toEqual([])
  })

  it('una sesión que no es de una clienta no sube nada', async () => {
    const { storage, uploads } = createStorage()
    const { currentClient } = createCurrentClient(ok(null))
    const result = await uploadReceipt({ storage, currentClient, newId })(PDF)

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_NOT_A_CLIENT')
    expect(uploads).toEqual([])
  })

  it('si no se puede saber quién es la clienta, es un fallo de almacenamiento y no sube nada', async () => {
    const { storage, uploads } = createStorage()
    const { currentClient } = createCurrentClient(err(delinquencyStorageFailed('caída')))
    const result = await uploadReceipt({ storage, currentClient, newId })(PDF)

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
    expect(uploads).toEqual([])
  })

  it('si Storage falla, devuelve el fallo', async () => {
    const { storage } = createStorage(err(delinquencyStorageFailed('sin espacio')))
    const { currentClient } = createCurrentClient(ok('clienta-1'))
    const result = await uploadReceipt({ storage, currentClient, newId })(PDF)

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
  })
})
