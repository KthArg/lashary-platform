import type { Result } from '@/shared/result'
import type { ChangeRescheduleLimitError } from '../../../application/reschedule-limit'
import { MAX_RESCHEDULE_LIMIT } from '../../../domain/reschedule-limit.constants'
import { RESCHEDULE_LIMIT_FIELD, reschedulePolicyMessages } from '../constants/reschedule-policy-strings'
import { rescheduleLimitFormSchema } from '../validation/reschedule-limit-form-schema'
import type { ReschedulePolicyActionState } from '../types/reschedule-policy.types'

export type ChangeLimitDeps = {
  change: (max: number) => Promise<Result<number, ChangeRescheduleLimitError>>
}

const invalidState = (): ReschedulePolicyActionState => ({
  status: 'invalid',
  message: reschedulePolicyMessages.invalid(MAX_RESCHEDULE_LIMIT),
})

export async function performChangeRescheduleLimit(
  rawFields: Record<string, unknown>,
  deps: ChangeLimitDeps,
): Promise<ReschedulePolicyActionState> {
  const parsed = rescheduleLimitFormSchema.safeParse(rawFields)
  if (!parsed.success) return invalidState()

  const changed = await deps.change(Number(parsed.data[RESCHEDULE_LIMIT_FIELD]))
  if (changed.ok) return { status: 'ok', message: reschedulePolicyMessages.saved(changed.value) }

  switch (changed.error.code) {
    case 'SCHEDULING_INVALID_RESCHEDULE_LIMIT':
      return invalidState()
    case 'SCHEDULING_STORAGE_FAILED':
      return { status: 'failed', message: reschedulePolicyMessages.failed }
  }
}
