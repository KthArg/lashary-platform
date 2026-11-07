import { describe, expect, it } from 'vitest'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { formatStudioDateTime } from '@/shared/studio-time'
import {
  buildConfirmationMessage,
  buildConfirmationTemplateVariables,
  CONFIRMATION_MESSAGE_TEXTS,
} from '../confirmation-request'

const input = {
  serviceName: 'Clásicas',
  startsAt: fixedDate('2027-03-10T15:00:00Z'),
  appointmentsUrl: 'https://lashary.example/portal/citas/mis-citas',
}

describe('buildConfirmationMessage', () => {
  it('trae el detalle de la cita y el enlace para confirmar o cancelar (criterio 1)', () => {
    const message = buildConfirmationMessage(input)

    expect(message).toContain('Clásicas')
    expect(message).toContain(formatStudioDateTime(input.startsAt))
    expect(message).toContain(`${CONFIRMATION_MESSAGE_TEXTS.action} ${input.appointmentsUrl}`)
  })
})

describe('buildConfirmationTemplateVariables', () => {
  it('da las 3 variables en el orden de la plantilla de Meta', () => {
    expect(buildConfirmationTemplateVariables(input)).toEqual([
      'Clásicas',
      formatStudioDateTime(input.startsAt),
      input.appointmentsUrl,
    ])
  })
})
