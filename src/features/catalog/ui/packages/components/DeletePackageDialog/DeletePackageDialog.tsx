'use client'

import { useActionState, useRef } from 'react'
import { packageMessages } from '../../constants/package-strings'
import { deletePackageAction } from '../../actions/package-actions'
import { initialPackageActionState } from '../../types/package-action-state'
import { PackageFormFeedback } from '../PackageFormFeedback'
import { deletePackageDialogStyles as STYLES } from './DeletePackageDialog.styles'
import type { DeletePackageDialogProps } from './DeletePackageDialog.types'

const t = packageMessages.form.remove

export function DeletePackageDialog({ packageId, packageName }: DeletePackageDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, action, pending] = useActionState(deletePackageAction, initialPackageActionState)

  return (
    <>
      <button type="button" className={STYLES.openButton} onClick={() => dialogRef.current?.showModal()}>
        {t.open}
      </button>
      <dialog ref={dialogRef} className={STYLES.dialog} aria-labelledby="delete-package-title">
        <div className={STYLES.box}>
          <h3 id="delete-package-title" className={STYLES.title}>
            {t.title}
          </h3>
          <p className={STYLES.name}>{packageName}</p>
          <p className={STYLES.body}>{t.body}</p>
          <PackageFormFeedback {...state} />
          <div className={STYLES.actions}>
            <button type="button" className={STYLES.cancelButton} onClick={() => dialogRef.current?.close()}>
              {t.cancel}
            </button>
            <form action={action}>
              <input type="hidden" name="id" value={packageId} />
              <button type="submit" className={STYLES.confirmButton} disabled={pending}>
                {t.confirm}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}
