import { ok, err, type Result } from '@/shared/result'
import { AuditEventValidationError } from './errors'

export type AuditEventPayload = Record<string, unknown>

export type AuditEventInput = {
  actorId: string
  action: string
  entityType: string
  entityId: string
  payload?: AuditEventPayload
  createdAt: Date
}

export type AuditEventView = {
  id: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  payload: AuditEventPayload
  createdAt: Date
}

type AuditEventProps = AuditEventView

export class AuditEvent {
  private constructor(private readonly props: AuditEventProps) {}

  static create(
    id: string,
    input: AuditEventInput,
  ): Result<AuditEvent, AuditEventValidationError> {
    const problems: string[] = []

    const actorId = input.actorId.trim()
    if (actorId.length === 0) problems.push('el actor no puede estar vacío')

    const action = input.action.trim()
    if (action.length === 0) problems.push('la acción no puede estar vacía')

    const entityType = input.entityType.trim()
    if (entityType.length === 0) problems.push('el tipo de recurso no puede estar vacío')

    const entityId = input.entityId.trim()
    if (entityId.length === 0) problems.push('el recurso no puede estar vacío')

    if (problems.length > 0) {
      return err(new AuditEventValidationError(problems))
    }

    return ok(
      new AuditEvent({
        id,
        actorId,
        action,
        entityType,
        entityId,
        payload: input.payload ?? {},
        createdAt: input.createdAt,
      }),
    )
  }

  get id(): string {
    return this.props.id
  }
  get actorId(): string {
    return this.props.actorId
  }
  get action(): string {
    return this.props.action
  }
  get entityType(): string {
    return this.props.entityType
  }
  get entityId(): string {
    return this.props.entityId
  }
  get payload(): AuditEventPayload {
    return this.props.payload
  }
  get createdAt(): Date {
    return this.props.createdAt
  }

  toView(): AuditEventView {
    return { ...this.props }
  }
}
