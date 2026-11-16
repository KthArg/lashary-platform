import type { CaseState } from '@/features/delinquency/domain/delinquency-case'

export type SetGraceDaysActionResult = { ok: true; graceDays: number } | { ok: false; error: string }

export type DecideCaseActionResult = { ok: true; state: CaseState } | { ok: false; error: string }
