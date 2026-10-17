'use client'

import { useActionState } from 'react'
import { packageMessages } from '../../constants/package-strings'
import { setPackageActiveAction } from '../../actions/package-actions'
import { initialPackageActionState } from '../../types/package-action-state'
import { PackageFormFeedback } from '../PackageFormFeedback'
import { packageStatusToggleStyles as STYLES } from './PackageStatusToggle.styles'
import type { PackageStatusToggleProps } from './PackageStatusToggle.types'

const statusMessages = packageMessages.form.status

export function PackageStatusToggle({ packageId, isActive }: PackageStatusToggleProps) {
  const [state, action, pending] = useActionState(setPackageActiveAction, initialPackageActionState)

  return (
    <form action={action} className={STYLES.form}>
      <input type="hidden" name="id" value={packageId} />
      <input type="hidden" name="active" value={String(!isActive)} />
      <label className={STYLES.label}>
        <input
          type="checkbox"
          role="switch"
          aria-label={statusMessages.label}
          className={STYLES.toggle}
          checked={isActive}
          disabled={pending}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        <span>{isActive ? statusMessages.active : statusMessages.inactive}</span>
      </label>
      <PackageFormFeedback {...state} />
    </form>
  )
}
