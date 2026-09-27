import type { ComponentType } from 'react'
import type { EstadoAccionProducto } from '../../actions/estado-accion-producto'
import { FeedbackIdle } from './FeedbackIdle'
import { FeedbackOk } from './FeedbackOk'
import { FeedbackForbidden } from './FeedbackForbidden'
import { FeedbackInvalido } from './FeedbackInvalido'

const FEEDBACKS: Record<EstadoAccionProducto['status'], ComponentType<any>> = {
  idle: FeedbackIdle,
  ok: FeedbackOk,
  forbidden: FeedbackForbidden,
  invalid: FeedbackInvalido,
}

export function Feedback(estado: EstadoAccionProducto) {
  const Componente = FEEDBACKS[estado.status]
  return <Componente message={estado.message} problems={estado.problems} />
}
