import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok, type Result } from '@/shared/result'
import { delinquencyStorageFailed, invalidReceipt, regularizationRefused } from '../../domain/errors'
import { submitRegularization, loadMyAccount } from '../submit-regularization'
import type { RegularizationRepository } from '../ports'
import type { UploadReceiptFailure } from '../upload-receipt'
import type { AccountEntry } from '../../domain/regularization'

const RECEIPT = new TextEncoder().encode('%PDF-1.7\n')
const input = { caseId: 'morosidad-1', declaredAmount: 10000, reference: '  SINPE 44  ', receipt: RECEIPT }

function createUpload(result: Result<string, UploadReceiptFailure> = ok('clienta-1/archivo-1.pdf')) {
  const received: Uint8Array[] = []
  const upload = async (bytes: Uint8Array) => {
    received.push(bytes)
    return result
  }
  return { upload, received }
}

function createRepository(submitResult: Awaited<ReturnType<RegularizationRepository['submit']>> = ok('solicitud-1')) {
  const submitted: unknown[] = []
  const requests: RegularizationRepository = {
    async submit(request) {
      submitted.push(request)
      return submitResult
    },
    async myAccount() {
      return ok([])
    },
  }
  return { requests, submitted }
}

describe('submitRegularization', () => {
  it('sube el comprobante y registra la solicitud con la ruta y la referencia sin espacios sobrantes', async () => {
    const { upload, received } = createUpload()
    const { requests, submitted } = createRepository()
    const result = await submitRegularization({ upload, requests })(input)

    expect(isOk(result) && result.value).toBe('solicitud-1')
    expect(received).toEqual([RECEIPT])
    expect(submitted).toEqual([
      { caseId: 'morosidad-1', declaredAmount: 10000, reference: 'SINPE 44', receiptPath: 'clienta-1/archivo-1.pdf' },
    ])
  })

  it('un monto inválido se rechaza antes de subir nada', async () => {
    const { upload, received } = createUpload()
    const { requests, submitted } = createRepository()
    const result = await submitRegularization({ upload, requests })({ ...input, declaredAmount: 0 })

    expect(isErr(result) && result.error).toMatchObject({ code: 'DELINQUENCY_REGULARIZATION_REFUSED', reason: 'declared-amount-invalid' })
    expect(received).toEqual([])
    expect(submitted).toEqual([])
  })

  it('un comprobante inválido no llega a registrar la solicitud', async () => {
    const { upload } = createUpload(err(invalidReceipt('receipt-type-not-allowed')))
    const { requests, submitted } = createRepository()
    const result = await submitRegularization({ upload, requests })(input)

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_INVALID_RECEIPT')
    expect(submitted).toEqual([])
  })

  it('lo que rechaza la base llega como el rechazo con su motivo', async () => {
    const { upload } = createUpload()
    const { requests } = createRepository(err(regularizationRefused('case-already-paid')))
    const result = await submitRegularization({ upload, requests })(input)

    expect(isErr(result) && result.error).toMatchObject({ reason: 'case-already-paid' })
  })
})

describe('loadMyAccount', () => {
  it('devuelve las morosidades del estado de cuenta y el total que debe en las activas', async () => {
    const entries: AccountEntry[] = [
      { caseId: 'm1', caseState: 'active', appointmentId: 'c1', pending: 25000, since: new Date(0), request: null },
      { caseId: 'm2', caseState: 'settled', appointmentId: 'c2', pending: 0, since: new Date(0), request: null },
    ]
    const requests: RegularizationRepository = {
      submit: async () => ok('x'),
      myAccount: async () => ok(entries),
    }
    const result = await loadMyAccount(requests)()

    expect(isOk(result) && result.value).toEqual({ entries, totalOwed: 25000 })
  })

  it('un fallo de la base es un fallo, no un estado de cuenta vacío', async () => {
    const requests: RegularizationRepository = {
      submit: async () => ok('x'),
      myAccount: async () => err(delinquencyStorageFailed('caída')),
    }
    const result = await loadMyAccount(requests)()

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
  })
})
