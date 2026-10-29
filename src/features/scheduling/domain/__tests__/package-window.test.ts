import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { computePackageAppointmentWindow } from '../package-window'
import { isPackageHasNoTechniques } from '../errors'
import { MS_PER_MINUTE } from '../appointment-window.constants'

const SERVICE_START_MS = Date.parse('2027-03-01T10:00:00Z')

describe('computePackageAppointmentWindow', () => {
  it('criterio 2: el tiempo total suma la duración de cada técnica incluida más su limpieza', () => {
    const result = computePackageAppointmentWindow({
      packageId: 'paquete-1',
      startsAtMs: SERVICE_START_MS,
      techniques: [
        { durationMin: 90, bufferMin: 15 },
        { durationMin: 45, bufferMin: 10 },
      ],
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    // 90 + 45 = 135 min de servicio; 15 + 10 = 25 min de limpieza, todo al final (bufferAsCleanup).
    expect(result.value.endsAtMs - result.value.startsAtMs).toBe(135 * MS_PER_MINUTE)
    expect(result.value.occupiedFromMs).toBe(result.value.startsAtMs)
    expect(result.value.occupiedUntilMs - result.value.endsAtMs).toBe(25 * MS_PER_MINUTE)
  })

  it('un paquete de una sola técnica (tras desactivar el resto) igual calcula su ventana', () => {
    const result = computePackageAppointmentWindow({
      packageId: 'paquete-2',
      startsAtMs: SERVICE_START_MS,
      techniques: [{ durationMin: 60, bufferMin: 5 }],
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.endsAtMs - result.value.startsAtMs).toBe(60 * MS_PER_MINUTE)
    expect(result.value.occupiedUntilMs - result.value.endsAtMs).toBe(5 * MS_PER_MINUTE)
  })

  it('un paquete sin ninguna técnica incluida es un error tipado, no una ventana de cero', () => {
    const result = computePackageAppointmentWindow({
      packageId: 'paquete-vacio',
      startsAtMs: SERVICE_START_MS,
      techniques: [],
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isPackageHasNoTechniques(result.error)).toBe(true)
    if (!isPackageHasNoTechniques(result.error)) return
    expect(result.error.packageId).toBe('paquete-vacio')
  })

  it('propaga el error tipado de la ventana inválida (ej. inicio no seguro) sin tocarlo', () => {
    const result = computePackageAppointmentWindow({
      packageId: 'paquete-3',
      startsAtMs: Number.NaN,
      techniques: [{ durationMin: 30, bufferMin: 0 }],
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.code).toBe('SCHEDULING_INVALID_APPOINTMENT_WINDOW')
  })
})
