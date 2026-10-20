import { ok, err, type Result } from '@/shared/result'
import { depositExemptionValidationError, type DepositExemptionValidationError } from './errors'

export type DepositExemptionInput = {
  clientId: string
  exemptedBy: string
  reason: string
  createdAt: Date
}

export type DepositExemptionView = {
  id: string
  clientId: string
  exemptedBy: string
  reason: string
  active: boolean
  createdAt: Date
}

const depositExemptionBrand: unique symbol = Symbol('DepositExemption')

export interface DepositExemption {
  readonly [depositExemptionBrand]: true
  readonly id: string
  readonly clientId: string
  readonly exemptedBy: string
  readonly reason: string
  readonly active: boolean
  readonly createdAt: Date
}

export function buildDepositExemption(
  id: string,
  input: DepositExemptionInput,
): Result<DepositExemption, DepositExemptionValidationError> {
  const problems: string[] = []

  const clientId = input.clientId.trim()
  if (clientId.length === 0) problems.push('el cliente no puede estar vacío')

  const exemptedBy = input.exemptedBy.trim()
  if (exemptedBy.length === 0) problems.push('quién otorga la exoneración no puede estar vacío')

  const reason = input.reason.trim()
  if (reason.length === 0) problems.push('la razón no puede estar vacía')

  if (problems.length > 0) {
    return err(depositExemptionValidationError(problems))
  }

  return ok({
    [depositExemptionBrand]: true,
    id,
    clientId,
    exemptedBy,
    reason,
    active: true,
    createdAt: input.createdAt,
  })
}

export function depositExemptionToView(exemption: DepositExemption): DepositExemptionView {
  return {
    id: exemption.id,
    clientId: exemption.clientId,
    exemptedBy: exemption.exemptedBy,
    reason: exemption.reason,
    active: exemption.active,
    createdAt: exemption.createdAt,
  }
}
