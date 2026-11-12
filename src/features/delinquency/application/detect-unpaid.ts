import type { Result } from '@/shared/result'
import type { DelinquencyStorageFailed } from '../domain/errors'
import type { DetectionRepository } from './ports'

export type DetectUnpaidSummary = { generated: number }

// Genera las morosidades por revisar; no activa ninguna (DOM-012).
export const detectUnpaid =
  (repository: DetectionRepository) =>
  async (): Promise<Result<DetectUnpaidSummary, DelinquencyStorageFailed>> => {
    const result = await repository.detectUnpaid()
    return result.ok ? { ok: true, value: { generated: result.value } } : result
  }
