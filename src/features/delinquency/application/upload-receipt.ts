import { err, isErr, ok, type Result } from '@/shared/result'
import {
  invalidReceipt,
  notAClient,
  type DelinquencyStorageFailed,
  type InvalidReceipt,
  type NotAClient,
} from '../domain/errors'
import { receiptPath, validateReceipt } from '../domain/receipt'
import type { CurrentClientPort, ReceiptStorage } from './ports'

export type UploadReceiptDeps = {
  storage: ReceiptStorage
  currentClient: CurrentClientPort
  newId: () => string
}

export type UploadReceiptFailure = InvalidReceipt | NotAClient | DelinquencyStorageFailed

// Valida el comprobante por su contenido en el servidor (DOM-008) antes de preguntar nada a la base: un archivo
// inválido no llega a Storage. Devuelve la ruta, que la solicitud de regularización guarda.
export const uploadReceipt =
  ({ storage, currentClient, newId }: UploadReceiptDeps) =>
  async (bytes: Uint8Array): Promise<Result<string, UploadReceiptFailure>> => {
    const format = validateReceipt(bytes)
    if (isErr(format)) return err(invalidReceipt(format.error))

    const clientId = await currentClient.currentClientId()
    if (isErr(clientId)) return clientId
    if (clientId.value === null) return err(notAClient())

    const path = receiptPath(clientId.value, newId(), format.value)
    const uploaded = await storage.upload(path, { bytes, contentType: format.value.contentType })
    if (isErr(uploaded)) return uploaded
    return ok(path)
  }
