import { err, type Result } from '@/shared/result'
import { bufferAsCleanup, computeAppointmentWindow, type AppointmentWindow } from './appointment-window'
import {
  packageHasNoTechniques,
  type InvalidAppointmentWindow,
  type PackageHasNoTechniques,
} from './errors'

export type PackageTechniqueDuration = {
  readonly durationMin: number
  readonly bufferMin: number
}

export type PackageWindowInput = {
  readonly packageId: string
  readonly startsAtMs: number
  readonly techniques: readonly PackageTechniqueDuration[]
}

export type PackageWindowFailure = PackageHasNoTechniques | InvalidAppointmentWindow

const sumBy = (
  techniques: readonly PackageTechniqueDuration[],
  field: keyof PackageTechniqueDuration,
): number => techniques.reduce((total, technique) => total + technique[field], 0)

export function computePackageAppointmentWindow(
  input: PackageWindowInput,
): Result<AppointmentWindow, PackageWindowFailure> {
  if (input.techniques.length === 0) return err(packageHasNoTechniques(input.packageId))

  return computeAppointmentWindow({
    startsAtMs: input.startsAtMs,
    serviceDurationMin: sumBy(input.techniques, 'durationMin'),
    ...bufferAsCleanup(sumBy(input.techniques, 'bufferMin')),
  })
}
