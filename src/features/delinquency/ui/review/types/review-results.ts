import type { CaseState } from '@/features/delinquency/domain/delinquency-case'

export type DecideCaseActionResult = { ok: true; state: CaseState } | { ok: false; error: string }
