import {
  ClosedDate,
  type ClosedDateProps,
  ManualBlock,
  type ManualBlockProps,
  WeeklyAvailabilityBlock,
  type WeeklyAvailabilityBlockProps,
} from '../domain/availability'
import type { SchedulingRepository } from './ports'

export async function defineWeeklyAvailability(
  repository: SchedulingRepository,
  props: WeeklyAvailabilityBlockProps
): Promise<WeeklyAvailabilityBlock> {
  return repository.saveWeeklyAvailability(new WeeklyAvailabilityBlock(props))
}

export function listWeeklyAvailability(
  repository: SchedulingRepository,
  resourceId: string
): Promise<WeeklyAvailabilityBlock[]> {
  return repository.listWeeklyAvailability(resourceId)
}

export async function defineClosedDate(
  repository: SchedulingRepository,
  props: ClosedDateProps
): Promise<ClosedDate> {
  return repository.saveClosedDate(new ClosedDate(props))
}

export function listClosedDates(
  repository: SchedulingRepository,
  resourceId: string
): Promise<ClosedDate[]> {
  return repository.listClosedDates(resourceId)
}

export async function defineManualBlock(
  repository: SchedulingRepository,
  props: ManualBlockProps
): Promise<ManualBlock> {
  return repository.saveManualBlock(new ManualBlock(props))
}

export function listManualBlocks(
  repository: SchedulingRepository,
  resourceId: string
): Promise<ManualBlock[]> {
  return repository.listManualBlocks(resourceId)
}
