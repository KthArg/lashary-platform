import { ok, err, type Result } from '@/shared/result'
import { DepositExemptionValidationError } from './errors'

export type DepositExemptionInput = {
  clientId: string
  exemptedBy: string
  reason: string
  createdAt: Date
}

// Vista pública de una exoneración.
export type DepositExemptionView = {
  id: string
  clientId: string
  exemptedBy: string
  reason: string
  active: boolean
  createdAt: Date
}

type DepositExemptionProps = DepositExemptionView

export class DepositExemption {
  private constructor(private readonly props: DepositExemptionProps) {}

  // Constructor validado (DOM-007): una exoneración inválida no puede existir. Nace siempre
  // activa — "levantarla" (active: false) no es parte del criterio 5 de US-AGE-13, se agrega
  // cuando una historia futura construya esa capacidad. El reloj se inyecta (DOM-004).
  static create(
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
      return err(new DepositExemptionValidationError(problems))
    }

    return ok(
      new DepositExemption({
        id,
        clientId,
        exemptedBy,
        reason,
        active: true,
        createdAt: input.createdAt,
      }),
    )
  }

  get id(): string {
    return this.props.id
  }
  get clientId(): string {
    return this.props.clientId
  }
  get exemptedBy(): string {
    return this.props.exemptedBy
  }
  get reason(): string {
    return this.props.reason
  }
  get active(): boolean {
    return this.props.active
  }
  get createdAt(): Date {
    return this.props.createdAt
  }

  toView(): DepositExemptionView {
    return { ...this.props }
  }
}
