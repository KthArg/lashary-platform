import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { delinquencyStorageFailed, invalidReceipt, notAClient, regularizationRefused } from '@/features/delinquency/domain/errors'
import { RECEIPT_MAX_BYTES } from '@/features/delinquency/domain/receipt'
import { performLoadMyAccount, performSubmitRegularization, type RegularizationDeps } from '../utils/perform-regularization'
import { receiptProblemMessages, refusalMessages, regularizationMessages } from '../constants/regularization-strings'
import type { ReceiptUpload } from '../types/regularization-results'

const CASE_ID = '00000000-0000-0000-0000-0000000016d1'
const PDF = new TextEncoder().encode('%PDF-1.7\n')

function upload(bytes: Uint8Array, size = bytes.byteLength): ReceiptUpload & { reads: () => number } {
  let reads = 0
  return {
    size,
    arrayBuffer: async () => {
      reads += 1
      return bytes.slice().buffer
    },
    reads: () => reads,
  }
}

function createDeps(overrides: Partial<RegularizationDeps> = {}) {
  const submitted: unknown[] = []
  const deps: RegularizationDeps = {
    isClient: async () => true,
    submit: async (input) => {
      submitted.push({ ...input, receipt: Array.from(input.receipt) })
      return ok('solicitud-1')
    },
    loadMyAccount: async () => ok({ entries: [], totalOwed: 0 }),
    ...overrides,
  }
  return { deps, submitted }
}

const fields = (receipt: unknown = upload(PDF)) => ({ caseId: CASE_ID, declaredAmount: '10000', reference: 'SINPE 44', receipt })

describe('performSubmitRegularization', () => {
  it('envía la regularización con el monto como número y los bytes del comprobante', async () => {
    const { deps, submitted } = createDeps()
    const result = await performSubmitRegularization(fields(), deps)

    expect(result).toEqual({ ok: true, message: regularizationMessages.sent })
    expect(submitted).toEqual([
      { caseId: CASE_ID, declaredAmount: 10000, reference: 'SINPE 44', receipt: Array.from(PDF) },
    ])
  })

  it('una sesión que no es de clienta no envía nada', async () => {
    const { deps, submitted } = createDeps({ isClient: async () => false })
    const result = await performSubmitRegularization(fields(), deps)

    expect(result).toEqual({ ok: false, message: regularizationMessages.accessDenied })
    expect(submitted).toEqual([])
  })

  it.each([[''], ['abc'], ['-5'], ['10.5']])('un monto de «%s» no se envía', async (declaredAmount) => {
    const { deps, submitted } = createDeps()
    const result = await performSubmitRegularization({ ...fields(), declaredAmount }, deps)

    expect(result).toEqual({ ok: false, message: regularizationMessages.invalidForm })
    expect(submitted).toEqual([])
  })

  it('sin comprobante pide adjuntarlo', async () => {
    const { deps } = createDeps()
    expect(await performSubmitRegularization(fields(null), deps)).toEqual({ ok: false, message: regularizationMessages.missingReceipt })
    expect(await performSubmitRegularization(fields(upload(new Uint8Array(0))), deps)).toEqual({
      ok: false,
      message: regularizationMessages.missingReceipt,
    })
  })

  it('un comprobante de más de 1 MB se rechaza sin leerlo', async () => {
    const { deps, submitted } = createDeps()
    const big = upload(PDF, RECEIPT_MAX_BYTES + 1)
    const result = await performSubmitRegularization(fields(big), deps)

    expect(result).toEqual({ ok: false, message: receiptProblemMessages['receipt-too-large'] })
    expect(big.reads()).toBe(0)
    expect(submitted).toEqual([])
  })

  it.each([
    [invalidReceipt('receipt-type-not-allowed'), receiptProblemMessages['receipt-type-not-allowed']],
    [regularizationRefused('case-already-paid'), refusalMessages['case-already-paid']],
    [notAClient(), regularizationMessages.accessDenied],
    [delinquencyStorageFailed('caída'), regularizationMessages.storageFailed],
  ])('cada rechazo llega a la clienta con su mensaje', async (error, message) => {
    const { deps } = createDeps({ submit: async () => err(error) })
    expect(await performSubmitRegularization(fields(), deps)).toEqual({ ok: false, message })
  })
})

describe('performLoadMyAccount', () => {
  it('devuelve el estado de cuenta de la clienta', async () => {
    const { deps } = createDeps()
    expect(await performLoadMyAccount(deps)).toEqual({ ok: true, account: { entries: [], totalOwed: 0 } })
  })

  it('una sesión que no es de clienta no lee nada', async () => {
    const { deps } = createDeps({ isClient: async () => false })
    expect(await performLoadMyAccount(deps)).toEqual({ ok: false, message: regularizationMessages.accessDenied })
  })

  it('un fallo de la base se dice, no se muestra como «sin deudas»', async () => {
    const { deps } = createDeps({ loadMyAccount: async () => err(delinquencyStorageFailed('caída')) })
    expect(await performLoadMyAccount(deps)).toEqual({ ok: false, message: regularizationMessages.loadFailed })
  })
})
