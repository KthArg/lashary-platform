'use client'

import { useActionState, useId, useRef } from 'react'
import { packageMessages } from '../../constants/package-strings'
import { deletePackageAction } from '../../actions/package-actions'
import { initialPackageActionState } from '../../types/package-action-state'
import { PackageFormFeedback } from '../PackageFormFeedback'
import { deletePackageDialogStyles as STYLES } from './DeletePackageDialog.styles'
import type { DeletePackageDialogProps } from './DeletePackageDialog.types'

const removeMessages = packageMessages.form.remove

export function DeletePackageDialog({ packageId, packageName }: DeletePackageDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [state, action, pending] = useActionState(deletePackageAction, initialPackageActionState)

  return (
    <>
      <button type="button" className={STYLES.openButton} onClick={() => dialogRef.current?.showModal()}>
        {removeMessages.open}
      </button>
      <dialog ref={dialogRef} className={STYLES.dialog} aria-labelledby={titleId}>
        <div className={STYLES.box}>
          <h3 id={titleId} className={STYLES.title}>
            {removeMessages.title}
          </h3>
          <p className={STYLES.name}>{packageName}</p>
          <p className={STYLES.body}>{removeMessages.body}</p>
          <PackageFormFeedback {...state} />
          <div className={STYLES.actions}>
            <button type="button" className={STYLES.cancelButton} onClick={() => dialogRef.current?.close()}>
              {removeMessages.cancel}
            </button>
            <form action={action}>
              <input type="hidden" name="id" value={packageId} />
              <button type="submit" className={STYLES.confirmButton} disabled={pending}>
                {removeMessages.confirm}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}
