'use server'

import { getAuthSession, AUTH_ROLES } from '@/features/auth'
import { isErr } from '@/shared/result'
import { selectTechnique } from '../application/select-technique'
import { catalogGateway } from '../application/catalog-adapter'
import { noAppointmentHistoryYet } from '../application/no-appointment-history'
import { schedulingMessages } from './messages'
import { TECHNIQUE_SELECTOR_FIELDS, FIRST_TIME_OVERRIDE_VALUES } from './constants'
import type { SelectTechniqueActionState } from './action-state'

function forbidden(): SelectTechniqueActionState {
  return { status: 'forbidden', message: schedulingMessages.selector.accessDenied }
}

export async function selectTechniqueAction(
  _prev: SelectTechniqueActionState,
  formData: FormData,
): Promise<SelectTechniqueActionState> {
  const session = await getAuthSession()
  if (!session?.user || session.role !== AUTH_ROLES.CLIENTE) return forbidden()

  const techniqueId = String(formData.get(TECHNIQUE_SELECTOR_FIELDS.techniqueId) ?? '')
  if (!techniqueId) {
    return { status: 'invalid', message: schedulingMessages.selector.pickOne }
  }

  const overrideRaw = formData.get(TECHNIQUE_SELECTOR_FIELDS.isFirstTimeOverride)
  const isFirstTimeOverride =
    overrideRaw === FIRST_TIME_OVERRIDE_VALUES.firstTime
      ? true
      : overrideRaw === FIRST_TIME_OVERRIDE_VALUES.retouch
        ? false
        : undefined

  const result = await selectTechnique(
    catalogGateway,
    noAppointmentHistoryYet,
  )({ clientId: session.user.id, techniqueId, isFirstTimeOverride })

  if (isErr(result)) {
    return { status: 'invalid', message: result.error.message }
  }

  return {
    status: 'ok',
    message: schedulingMessages.selector.computed,
    selection: result.value,
  }
}
