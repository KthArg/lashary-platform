import { describe, it, expect } from 'vitest'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { buildReminderMessage, buildReminderTemplateVariables, formatStudioDateTime } from '../reminder-message'

describe('buildReminderMessage', () => {
  it('incluye la técnica y la fecha/hora en la zona del estudio (criterio 2)', () => {
    const message = buildReminderMessage({
      techniqueName: 'Lifting de pestañas',
      startsAt: fixedDate('2026-11-02T21:00:00Z'),
    })

    expect(message).toContain('Lifting de pestañas')
    expect(message).toContain(formatStudioDateTime(fixedDate('2026-11-02T21:00:00Z')))
    expect(message).toMatch(/3:00\s*p\.?\s*m\.?/i)
  })
})

describe('buildReminderTemplateVariables', () => {
  it('da la técnica y la fecha/hora en ese orden, para una plantilla de WhatsApp aprobada por Meta', () => {
    const startsAt = fixedDate('2026-11-02T21:00:00Z')
    expect(buildReminderTemplateVariables({ techniqueName: 'Lifting de pestañas', startsAt })).toEqual([
      'Lifting de pestañas',
      formatStudioDateTime(startsAt),
    ])
  })
})
